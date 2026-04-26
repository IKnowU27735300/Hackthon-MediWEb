"use client";

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  ArrowLeft, 
  FileText, 
  Download, 
  Clock,
  CheckCircle,
  Type,
  Share2,
  UserPlus,
  X,
  Package,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToActiveStaff, logStockActions } from '@/services/api';

export default function PatientReportPage() {
  const { user, role, businessId, location: userLocation, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<any>(null);
  const [report, setReport] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Assistant Sharing State
  const [showShareModal, setShowShareModal] = useState(false);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);

  // Medical Logs State
  const [stockEntries, setStockEntries] = useState([{ itemName: '', amount: 1 }]);
  const [isLoggingStock, setIsLoggingStock] = useState(false);
  const [stockStatus, setStockStatus] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch Assistants (Active status included via real-time listener)
  useEffect(() => {
     if (role === 'doctor' && businessId) {
        const unsubscribe = subscribeToActiveStaff((staff) => {
           const assistantsList = staff.filter(s => s.role === 'assistant' && (s.businessId === user?.uid || !s.businessId || s.businessId === businessId));
           setAssistants(assistantsList);
           
           const suppliersList = staff.filter(s => 
             s.role === 'supplier' && 
             (!userLocation || !s.location || s.location.toLowerCase() === userLocation.toLowerCase())
           );
           setSuppliers(suppliersList);
        });
        return () => unsubscribe();
     }
  }, [user, role, businessId, userLocation]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !patientId || !businessId) return;
      
      try {
        // Fetch Patient Details
        const patientRef = doc(db, 'businesses', businessId, 'contacts', patientId);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          const pData = patientSnap.data();
          // Access Control Check for Assistants
          if (role === 'assistant' && !pData.sharedWithAssistant) {
            setPatient({ ...pData, restricted: true });
            return;
          }
          setPatient({ id: patientSnap.id, ...pData });
          if (pData.assignedAssistantId) {
            setSelectedAssistant(pData.assignedAssistantId);
          }
        }

        // Fetch Existing Report/Note
        const reportRef = doc(db, 'businesses', businessId, 'contacts', patientId, 'private', 'report');
        const reportSnap = await getDoc(reportRef);
        if (reportSnap.exists()) {
          setReport(reportSnap.data().content || '');
        }
      } catch (err) {
        console.error("Error fetching report data:", err);
      }
    }
    fetchData();
  }, [user, patientId, role, businessId]);

  const handleSave = async () => {
    if (!user || !patientId) return;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const reportRef = doc(db, 'businesses', businessId!, 'contacts', patientId, 'private', 'report');
      await setDoc(reportRef, {
        content: report,
        updatedAt: serverTimestamp(),
        author: user.email
      }, { merge: true });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving report:", err);
      alert("Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogStock = async () => {
    if (!stockEntries.some(e => e.itemName) || !businessId) return;
    setIsLoggingStock(true);
    try {
      const validEntries = stockEntries.filter(e => e.itemName);
      await logStockActions(businessId, {
        patientName: patient.name,
        patientEmail: patient.email,
        actions: validEntries.map(e => ({...e, action: 'Stock Out', amount: Number(e.amount)})),
        prescriptionNotes: report,
        supplierId: selectedSupplier || null,
        assignedAssistantId: selectedAssistant || null,
        sharedWithAssistant: !!selectedAssistant
      });
      setStockStatus('Request sent successfully');
      setStockEntries([{ itemName: '', amount: 1 }]);
      setSelectedSupplier('');
      setTimeout(() => setStockStatus(''), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to log stock");
    } finally {
      setIsLoggingStock(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssistant || !businessId || !patientId || !patient) return;
    setIsSharing(true);
    try {
      // 1. Share Contact Record
      await updateDoc(doc(db, 'businesses', businessId, 'contacts', patientId), {
        sharedWithAssistant: true,
        assignedAssistantId: selectedAssistant,
        lastAssignedAt: serverTimestamp()
      });

      // 2. Assign All Active Bookings to Assistant (Push to "Intake Forms")
      if (patient.email) {
        const bookingsRef = collection(db, 'businesses', businessId, 'bookings');
        const q = query(
          bookingsRef,
          where('customerEmail', '==', patient.email),
          where('status', 'in', ['upcoming', 'scheduled'])
        );
        const bookingSnap = await getDocs(q);
        
        if (!bookingSnap.empty) {
           await Promise.all(bookingSnap.docs.map(d => updateDoc(d.ref, {
             assignedToAssistant: true,
             assignedAssistantId: selectedAssistant,
             updatedAt: serverTimestamp()
           })));
        }

        // 3. Update All History Records to be visible to Assistant
        const historyRef = collection(db, 'businesses', businessId, 'stock_history');
        const histQ = query(historyRef, where("patientEmail", "==", patient.email));
        const histSnap = await getDocs(histQ);
        if (!histSnap.empty) {
          await Promise.all(histSnap.docs.map(d => updateDoc(d.ref, {
            assignedAssistantId: selectedAssistant,
            sharedWithAssistant: true,
            updatedAt: serverTimestamp()
          })));
        }
      }
      
      setShowShareModal(false);
      alert(`Patient assigned to ${assistants.find(a => a.id === selectedAssistant)?.displayName || 'Assistant'}. Case moved to their queue.`);
    } catch (err) {
      console.error("Assignment failed", err);
      alert("Failed to assign record.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    const patientName = patient?.name || patient?.customerName || 'Patient';
    const date = new Date().toLocaleDateString();

    try {
      // Dynamically load jsPDF
      const loadJsPDF = () => {
        return new Promise((resolve, reject) => {
          if ((window as any).jspdf) return resolve((window as any).jspdf);
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = () => resolve((window as any).jspdf);
          script.onerror = reject;
          document.head.appendChild(script);
        });
      };

      const { jsPDF } = (await loadJsPDF()) as any;
      const doc = new jsPDF();

      // Simple PDF Generation Logic (Preserved from original)
      doc.setFontSize(18);
      doc.text(`Medical Report: ${patientName}`, 20, 20);
      doc.setFontSize(12);
      doc.text(report || "No notes.", 20, 40);
      doc.save("report.pdf");
    } catch (err) {
      alert("PDF generation failed.");
    }
  };

  if (patient?.restricted) {
    return (
      <div className="flex h-screen bg-black text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
            <Clock size={40} className="text-pink-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Restricted Medical Record</h2>
          <p className="text-white/40 max-w-md mx-auto">
            This patient's clinical logs and medical history have not been shared with your portal yet. 
            Please contact the lead doctor to request access.
          </p>
          <button onClick={() => router.back()} className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all border border-white/10">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/50 backdrop-blur-xl z-10 w-full">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-400" />
                <h1 className="text-xl font-bold">Medical Report & Notes</h1>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                Patient: <span className="text-white/60 font-medium">{patient?.name || patient?.customerName || 'Loading...'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {role === 'doctor' && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-sm"
                >
                  <Share2 size={16} />
                  Assign to Assistant
                </button>
                <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg text-sm ${
                    saveStatus === 'saved' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/20'
                  }`}
                >
                  {saveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />}
                  {saveStatus === 'saved' ? 'Saved' : 'Save Notes'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
            {/* Main Note Area */}
            <div className="lg:col-span-2 glass-card flex flex-col min-h-[600px] shadow-2xl border-white/5 relative overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary-600 to-indigo-600"></div>
              <div className="p-8 flex-1 flex flex-col relative">
                <div className="absolute top-4 right-4 text-xs text-white/20 font-mono uppercase">Clinical ID: {patientId.slice(0,8)}</div>
                <textarea
                  autoFocus
                  readOnly={role !== 'doctor' && role !== 'assistant'}
                  placeholder={role === 'doctor' || role === 'assistant' ? "Start typing clinical findings..." : "No notes."}
                  value={report}
                  onChange={(e) => {
                    setReport(e.target.value);
                    if (saveStatus === 'saved') setSaveStatus('idle');
                  }}
                  className={`w-full h-full bg-transparent resize-none focus:outline-none text-lg leading-relaxed text-white/80 placeholder:text-white/10 font-mono ${role !== 'doctor' && role !== 'assistant' ? 'cursor-default' : ''}`}
                  spellCheck={false}
                />
              </div>
              <div className="p-3 bg-white/[0.02] border-t border-white/5 text-[10px] text-white/20 flex justify-between uppercase font-bold tracking-widest">
                 <span>Auto-save enabled</span>
                 <span>Confidential</span>
              </div>
            </div>

            {/* Side Panel: Medical Resources */}
            <div className="space-y-6">
                <div className="glass-card p-6 border-white/5">
                    <h3 className="font-bold flex items-center gap-2 mb-6">
                        <Package size={18} className="text-emerald-400" />
                        Medical Resources
                    </h3>

                    {role === 'doctor' && (
                        <div className="mb-6">
                            <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest block mb-2">Select Supplier</label>
                            <select 
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="w-full glass-input bg-black/40 text-sm py-2"
                            >
                                <option value="">Direct Log (No Supplier)</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.businessName || s.displayName || s.googleAccountEmail || s.email || 'Unnamed Supplier'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {role === 'doctor' || role === 'assistant' ? (
                        <div className="space-y-4">
                            {stockEntries.map((entry, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input 
                                        placeholder="Item Name"
                                        className="glass-input flex-1 text-sm bg-black/40"
                                        value={entry.itemName}
                                        onChange={(e) => {
                                            const next = [...stockEntries];
                                            next[idx].itemName = e.target.value;
                                            setStockEntries(next);
                                        }}
                                    />
                                    <input 
                                        type="number"
                                        placeholder="Qty"
                                        className="glass-input w-20 text-sm bg-black/40"
                                        value={entry.amount}
                                        onChange={(e) => {
                                            const next = [...stockEntries];
                                            next[idx].amount = Number(e.target.value);
                                            setStockEntries(next);
                                        }}
                                    />
                                    {idx > 0 && (
                                        <button onClick={() => setStockEntries(stockEntries.filter((_, i) => i !== idx))} className="text-pink-400 hover:text-pink-300">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button 
                                onClick={() => setStockEntries([...stockEntries, { itemName: '', amount: 1 }])}
                                className="text-xs text-primary-400 font-bold flex items-center gap-1 hover:text-primary-300"
                            >
                                <Plus size={14} /> Add Item
                            </button>

                            <button 
                                onClick={handleLogStock}
                                disabled={isLoggingStock}
                                className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-sm transition-all mt-4"
                            >
                                {isLoggingStock ? 'Logging...' : 'Log Usage'}
                            </button>
                            {stockStatus && <div className="text-xs text-emerald-400 text-center">{stockStatus}</div>}
                        </div>
                    ) : (
                        <div className="text-xs text-white/30 italic text-center py-6">
                            Only doctors and clinical assistants can log medical resource usage.
                        </div>
                    )}
                </div>

                <div className="glass-card p-6 border-white/5 bg-primary-900/5">
                    <h3 className="font-bold mb-2 text-sm text-primary-200">Workflow Status</h3>
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${patient?.assignedToAssistant ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-xs font-mono uppercase text-white/50">
                            {patient?.assignedToAssistant ? 'Assigned to Assistant' : 'Pending Review'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Improved Assign Modal */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md glass-card relative p-8"
              >
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                     <UserPlus size={20} className="text-primary-400" />
                     Assign Case to Assistant
                   </h3>
                   <button onClick={() => setShowShareModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>
                
                <p className="text-sm text-white/50 mb-6">Select an active clinical assistant. This will move the case to their intake queue.</p>

                <div className="space-y-3 mb-8 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {assistants.length > 0 ? (
                    assistants.map((assistant) => {
                        // Check online status
                        const lastActive = assistant.lastActive?.seconds ? assistant.lastActive.seconds * 1000 : 0;
                        const isOnline = (Date.now() - lastActive) < 120000; // 2 mins

                        return (
                          <button
                            key={assistant.id}
                            onClick={() => setSelectedAssistant(assistant.id)}
                            className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left group ${
                              selectedAssistant === assistant.id 
                              ? 'bg-primary-600/20 border-primary-500 text-white' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'
                            }`}
                          >
                              <div className="relative">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-lg">
                                    {(assistant.businessName?.[0] || assistant.displayName?.[0] || assistant.name?.[0] || assistant.email?.[0] || 'A').toUpperCase()}
                                  </div>
                                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${isOnline ? 'bg-emerald-500' : 'bg-white/20'}`}></div>
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-sm group-hover:text-primary-300 transition-colors">
                                  {assistant.businessName || assistant.displayName || assistant.name || assistant.email?.split('@')[0] || 'Assistant'}
                                </div>
                                <div className={`text-[10px] uppercase font-bold ${isOnline ? 'text-emerald-400' : 'text-white/20'}`}>
                                {isOnline ? 'Online Now' : 'Offline'}
                              </div>
                            </div>
                            {selectedAssistant === assistant.id && <CheckCircle size={18} className="text-primary-400" />}
                          </button>
                        );
                    })
                  ) : (
                    <div className="text-center py-8 text-white/30 italic text-sm border border-dashed border-white/10 rounded-xl">
                      No assistants found in network.
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowShareModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-all text-white/60">
                        Cancel
                    </button>
                    <button 
                      onClick={handleAssign}
                      disabled={!selectedAssistant || isSharing}
                      className="flex-[2] py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSharing ? 'Assigning...' : 'Confim & Handover'}
                    </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

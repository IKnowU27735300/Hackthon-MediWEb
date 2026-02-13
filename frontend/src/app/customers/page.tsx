"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MoreVertical,
  History as HistoryIcon,
  FileText,
  X,
  PlusCircle,
  Package,
  Trash2,
  Clock,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { 
  subscribeToDashboardSummary, 
  logStockActions, 
  subscribeToPatientHistory,
  fetchPatientContext
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  Stethoscope, 
  Info
} from 'lucide-react';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore'; // Added addDoc, updateDoc
import { db } from '@/lib/firebase'; // Added db import

export default function PatientsPage() {
  const { user, role, businessId, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');

  // Stock Log Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [activePatient, setActivePatient] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockEntries, setStockEntries] = useState([{ itemName: '', duration: '', amount: '' }]);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);

  // Add Patient Modal State (New)
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({ name: '', email: '', phone: '', service: 'Initial Consultation' });

  // Forms / Case Review State
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'patients' | 'forms'>(role === 'assistant' ? 'forms' : 'patients');

  // Unified History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyContext, setHistoryContext] = useState<any>(null);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let isMounted = true;
    if (authLoading || !user || !businessId) return;

    const unsubscribe = subscribeToDashboardSummary(businessId, (updatedData) => {
      if (isMounted) {
        setData(updatedData);
        setLoading(false);
      }
    }, role || undefined, user?.uid);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, authLoading, businessId]);

  // Subscribe to patient history when modal opens
  useEffect(() => {
    let isMounted = true;
    if (!showStockModal || !activePatient || !user || !businessId) return;

    const name = activePatient.name || activePatient.customerName;
    const unsubscribe = subscribeToPatientHistory(businessId, name, (logs) => {
      if (isMounted) {
        setPatientHistory(logs.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        }));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [showStockModal, activePatient, user, businessId]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'businesses', businessId, 'contacts'), {
        name: newPatientData.name,
        email: newPatientData.email,
        phone: newPatientData.phone,
        service: newPatientData.service,
        createdAt: serverTimestamp(),
        sharedWithAssistant: false,
        lastVisit: serverTimestamp(),
        status: 'active'
      });
      setShowAddPatientModal(false);
      setNewPatientData({ name: '', email: '', phone: '', service: 'Initial Consultation' });
      alert("New patient added successfully!");
    } catch (err) {
      console.error("Failed to add patient", err);
      alert("Failed to create patient record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogStock = async () => {
    if (!businessId || !activePatient) return;
    setIsSubmitting(true);

    const validEntries = stockEntries.filter(e => e.itemName && e.itemName.trim() !== '' && e.amount);
    if (validEntries.length === 0) {
      alert("Please enter at least one medicine item and quantity.");
      setIsSubmitting(false);
      return;
    }

    const patientName = activePatient.name || activePatient.customerName || activePatient.displayName || "Unknown Patient";

    try {
      await logStockActions(businessId!, validEntries, patientName);
      setStockEntries([{ itemName: '', duration: '', amount: '' }]);
      alert("Stock logged and inventory updated!");
      setShowStockModal(false);
    } catch (err) {
      console.error("Stock logging error detail:", err);
      alert("Failed to log stock. Check if the item exists or try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEntry = () => setStockEntries([...stockEntries, { itemName: '', duration: '', amount: '' }]);
  const removeEntry = (idx: number) => setStockEntries(stockEntries.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, field: string, value: string) => {
    const next = [...stockEntries];
    (next[idx] as any)[field] = value;
    setStockEntries(next);
  };

  const rawPatients = data?.all_contacts || [];
  const patients = rawPatients.filter((p: any) => {
    // Role-based filtering: Assistants only see shared patients
    if (role === 'assistant' && !p.sharedWithAssistant) return false;

    const name = p.name || p.customerName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           p.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">{role === 'assistant' ? 'Patients & Forms' : 'Patients'}</h1>
            <p className="text-muted">
              {role === 'assistant' 
                ? "Manage shared patient records and review assigned clinical forms." 
                : "Manage patient records, history, and contact information."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {role === 'assistant' && (
              <div className="flex p-1 bg-theme-muted rounded-xl border border-theme mr-4">
                <button 
                  onClick={() => setActiveTab('forms')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'forms' ? 'bg-primary-600 text-white shadow-lg' : 'text-muted hover:text-primary-500 hover:dark:text-white'}`}
                >
                  Clinical Queue
                </button>
                <button 
                  onClick={() => setActiveTab('patients')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'patients' ? 'bg-primary-600 text-white shadow-lg' : 'text-muted hover:text-primary-500 hover:dark:text-white'}`}
                >
                  Patient Directory
                </button>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10 w-64 text-sm"
              />
            </div>
            {role === 'doctor' && (
              <button 
                onClick={() => setShowAddPatientModal(true)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              >
                <Plus size={20} />
                New Patient
              </button>
            )}
          </div>
        </header>

        {role === 'assistant' && activeTab === 'forms' ? (
          <div className="space-y-6">
            <div className="glass-card">
              <div className="p-6 border-b border-white/10">
                <h3 className="font-bold flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-primary-400" />
                  Assigned Medical Records
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {(() => {
                  const rawForms = data?.all_bookings?.filter((b: any) => 
                    b.assignedToAssistant === true && 
                    // Allow any assistant to see shared items for now, or match ID if strict
                    (b.assignedAssistantId === user?.uid || true) && 
                    (b.status === "upcoming" || b.status === "scheduled")
                  ) || [];
                  
                  if (rawForms.length === 0) {
                    return (
                      <div className="p-16 text-center text-white/30 italic text-sm">
                        No medical records currently assigned for review.
                      </div>
                    );
                  }

                  return rawForms.map((form: any) => (
                    <div key={form.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <div className="font-bold">{form.customerName}</div>
                          <div className="text-xs text-white/30 uppercase tracking-widest">{form.service} Intake</div>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          setCaseLoading(true);
                          try {
                            const context = await fetchPatientContext(businessId!, form.customerEmail, form.customerName);
                            setSelectedCase({ ...form, context });
                          } catch (err) {
                            alert("Failed to load patient records.");
                          } finally {
                            setCaseLoading(false);
                          }
                        }}
                        className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-bold transition-all"
                      >
                        {caseLoading ? "Loading..." : "Review Case"} <ChevronRight size={14} />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {patients.length > 0 ? (
            patients.map((patient: any) => (
              <div key={patient.id} className="glass-card p-6 hover:border-primary-500/30 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-primary-600/20 text-primary-400 rounded-full flex items-center justify-center font-bold text-lg">
                    {(patient.name || patient.customerName || 'P')?.charAt(0).toUpperCase()}
                  </div>
                  <div className="relative group/menu">
                    <button 
                      onClick={() => {
                        setActivePatient(patient);
                        setShowStockModal(true);
                      }}
                      className="p-2 text-white/30 hover:text-white transition-colors bg-white/5 rounded-lg"
                    >
                      <MoreVertical size={18} />
                    </button>
                    <div className="absolute right-0 top-12 w-48 glass-card border-white/10 opacity-0 pointer-events-none group-focus-within/menu:opacity-100 group-focus-within/menu:pointer-events-auto z-20 transition-all py-2">
                        {role === 'doctor' && (
                          <button 
                            onClick={() => {
                              setActivePatient(patient);
                              setShowStockModal(true);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
                          >
                            <Package size={14} /> Log Stock Usage
                          </button>
                        )}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-1">{patient.name || patient.customerName || 'Anonymous Patient'}</h3>
                <div className="flex items-center gap-2 text-xs text-muted mb-6 uppercase tracking-widest font-mono">
                  PID-{patient.id?.slice(0,6).toUpperCase() || 'TEMP'}
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <Mail size={14} className="text-muted/50" />
                    {patient.email || 'No email'}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <Phone size={14} className="text-muted/50" />
                    {patient.phone || patient.customerPhone || "No phone added"}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-theme pt-6">
                  <button 
                    onClick={async () => {
                      setActivePatient(patient);
                      setFetchingHistory(true);
                      setShowHistoryModal(true);
                      try {
                        const context = await fetchPatientContext(businessId!, patient.email, patient.name || patient.customerName);
                        setHistoryContext(context);
                      } catch (err) {
                        alert("Failed to load clinical history.");
                      } finally {
                        setFetchingHistory(false);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-theme-muted text-xs font-bold hover:bg-primary-500/10 hover:text-primary-500 dark:hover:bg-white/10 dark:hover:text-white transition-all"
                  >
                    <HistoryIcon size={14} /> History
                  </button>
                  <button 
                    onClick={() => router.push(`/customers/${patient.id}/report`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-theme-muted text-xs font-bold hover:bg-primary-500/10 transition-all text-primary-500 dark:text-primary-400"
                  >
                    <FileText size={14} /> Forms / Notes
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 glass-card text-center text-white/30 italic">
              No patient records found.
            </div>
          )}
        </div>
        )}

        {/* Add Patient Modal */}
        <AnimatePresence>
          {showAddPatientModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md glass-card relative p-8"
              >
                <button 
                  onClick={() => setShowAddPatientModal(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <UserPlus className="text-primary-500" size={24} />
                  New Patient Record
                </h2>

                <form onSubmit={handleCreatePatient} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-white/50 uppercase font-bold px-1">Full Name</label>
                    <input 
                      required
                      className="glass-input pl-4"
                      placeholder="Jane Doe"
                      value={newPatientData.name}
                      onChange={(e) => setNewPatientData({...newPatientData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/50 uppercase font-bold px-1">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="glass-input pl-4"
                      placeholder="jane@example.com"
                      value={newPatientData.email}
                      onChange={(e) => setNewPatientData({...newPatientData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/50 uppercase font-bold px-1">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      className="glass-input pl-4"
                      placeholder="+1 (555) 000-0000"
                      value={newPatientData.phone}
                      onChange={(e) => setNewPatientData({...newPatientData, phone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50 uppercase font-bold px-1">Medical Service</label>
                    <select
                      className="glass-input pl-4 w-full"
                      value={newPatientData.service}
                      style={{ backgroundColor: 'black' }}
                      onChange={(e) => setNewPatientData({...newPatientData, service: e.target.value})}
                    >
                      <option value="Initial Consultation">Initial Consultation</option>
                      <option value="Routine Checkup">Routine Checkup</option>
                      <option value="Diagnostic Test">Diagnostic Test</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/40 disabled:opacity-50 mt-6"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Record'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intensive Case Review Modal for Assistants */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                className="w-full max-w-5xl glass-card relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center text-primary-400 border border-primary-500/20">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Clinical Case Verification</h2>
                      <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Role: Support Specialist (Clinical Assistant)</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCase(null)} className="p-2 text-white/40 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                  {/* 1. Patient Persona Box */}
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 shadow-inner">
                      <h3 className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-primary-400 mb-6 flex items-center gap-2">
                         <Info size={14} /> Personal Foundation
                      </h3>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-900 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-white/5 shadow-2xl">
                          {selectedCase.customerName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{selectedCase.customerName}</div>
                          <div className="text-[10px] text-white/30 uppercase tracking-tighter">Verified Patient ID: {selectedCase.id.slice(0,8)}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center gap-3 text-sm text-white/60 bg-white/[0.02] p-3 rounded-xl">
                           <Mail size={14} className="text-primary-500/50" />
                           {selectedCase.customerEmail}
                         </div>
                         <div className="flex items-center gap-3 text-sm text-white/60 bg-white/[0.02] p-3 rounded-xl">
                           <Phone size={14} className="text-primary-500/50" />
                           {selectedCase.customerPhone || "Unlisted Contact"}
                         </div>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 rounded-3xl p-6 border border-emerald-500/10">
                       <h3 className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-emerald-400 mb-4">Phase: Meeting Completion</h3>
                       <p className="text-xs text-white/50 leading-relaxed">As an assistant, your verification confirms that the patient has received all prescribed medicines and clinical guidance as outlined by the doctor below.</p>
                    </div>
                  </div>

                  {/* 2. Clinical Report Box */}
                  <div className="md:col-span-2 space-y-8">
                    <div className="glass-card bg-white/[0.02] p-8 border-white/5 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Stethoscope size={120} />
                      </div>
                      <h3 className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-primary-400 mb-6 flex items-center gap-2">
                         <FileText size={14} /> Doctor's Medical Assessment
                      </h3>
                      <div className="prose prose-invert max-w-none">
                        <div className="bg-black/20 p-6 rounded-2xl border border-white/5 text-sm text-white/80 leading-relaxed min-h-[150px] font-serif italic">
                          {selectedCase.context?.report ? selectedCase.context.report : "No additional clinical notes recorded by the doctor for this session."}
                        </div>
                      </div>
                    </div>

                    {/* 3. Medical Logs (Stock) Box */}
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                      <h3 className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-primary-400 mb-6 flex items-center gap-2">
                         <Package size={14} /> Dispensary / Inventory Audit Logs
                      </h3>
                      <div className="space-y-3">
                        {selectedCase.context?.medicalLogs && selectedCase.context.medicalLogs.length > 0 ? (
                          selectedCase.context.medicalLogs.map((log: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                              <div className="w-full">
                                <div className="text-[10px] text-white/30 mb-2 uppercase tracking-widest font-bold">
                                  {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                </div>
                                <div className="space-y-2">
                                  {log.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                      <div className="text-sm font-semibold">{item.itemName}</div>
                                      <div className={`font-mono text-xs font-bold ${item.action === 'Stock In' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                        {item.action === 'Stock In' ? '+' : '-'}{item.amount}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-xs text-white/20 italic bg-black/20 rounded-2xl border border-dashed border-white/10">
                            No recent medical logs detected for this patient session.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => {
                          setActivePatient(selectedCase); 
                          setShowStockModal(true);
                        }}
                        className="flex-1 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold shadow-lg shadow-primary-900/20 transition-all flex items-center justify-center gap-3"
                      >
                        <Package size={20} /> Log Stock Usage
                      </button>
                      <button 
                        onClick={async () => {
                          if (!businessId) return;
                          try {
                            // Update booking status to completed
                            await updateDoc(doc(db, 'businesses', businessId, 'bookings', selectedCase.id), {
                                status: 'completed'
                            });
                            alert(`Patient ${selectedCase.customerName} has been confirmed and marked as completed.`);
                            setSelectedCase(null);
                          } catch (err) {
                            console.error(err);
                            alert("Failed to update status.");
                          }
                        }}
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 size={20} /> Confirm Case Complete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Patient History Modal */}
        <AnimatePresence>
          {showHistoryModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[70] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl glass-card relative overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center text-primary-400 border border-primary-500/20 font-bold text-xl">
                      {activePatient?.name?.[0] || activePatient?.customerName?.[0] || 'P'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{activePatient?.name || activePatient?.customerName}</h2>
                      <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Full Clinical History & Audit</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowHistoryModal(false); setHistoryContext(null); }} className="p-2 text-white/40 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  {fetchingHistory ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                      <p className="text-sm text-white/30 italic">Retrieving secure clinical records...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                      <div className="space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                          <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-primary-400 mb-4">Last Visit</h3>
                          <div className="flex items-center gap-3">
                            <Clock size={16} className="text-white/20" />
                            <span className="text-lg font-bold">
                              {historyContext?.medicalLogs?.[0]?.createdAt?.seconds 
                                ? new Date(historyContext.medicalLogs[0].createdAt.seconds * 1000).toLocaleDateString()
                                : "No recent logs"}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/30 mt-2 uppercase">Based on last medical log</p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                          <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-primary-400 mb-4">Patient Integrity</h3>
                          <div className="space-y-3">
                             <div className="flex justify-between text-xs">
                               <span className="text-white/30">Total Sessions</span>
                               <span className="font-bold">{historyContext?.medicalLogs?.length || 0}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                               <span className="text-white/30">Notes Found</span>
                               <span className="font-bold text-emerald-400">{historyContext?.report ? 'Yes' : 'No'}</span>
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-8">
                        <div>
                          <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-primary-400 mb-4 flex items-center gap-2">
                            <FileText size={14} /> Doctor Notes
                          </h3>
                          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-sm text-white/70 leading-relaxed font-serif italic min-h-[100px]">
                            {historyContext?.report || "No private clinical notes found for this patient."}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-[10px] uppercase tracking-widest font-extrabold text-primary-400 mb-4 flex items-center gap-2">
                            <Package size={14} /> Dispensed Resources
                          </h3>
                          <div className="space-y-3">
                            {historyContext?.medicalLogs?.length > 0 ? (
                              historyContext.medicalLogs.map((log: any, idx: number) => (
                                <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/5">
                                  <div className="text-[9px] text-white/30 uppercase font-bold mb-2">
                                    {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {log.items?.map((item: any, i: number) => (
                                      <div key={i} className="px-3 py-1.5 bg-black/40 rounded-lg text-xs flex items-center gap-2 border border-white/5">
                                        <span className="text-white/60">{item.itemName}</span>
                                        <span className="font-bold text-pink-400">-{item.amount}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-10 text-xs text-white/20 italic bg-black/20 rounded-2xl border border-dashed border-white/10">
                                No inventory usage logs for this patient.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stock Usage Modal */}
        <AnimatePresence>
          {showStockModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl glass-card relative flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-white/10 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Log Medical Stock Usage</h2>
                    <p className="text-sm text-white/40 mt-1">Patient: <span className="text-primary-400 font-bold">{activePatient?.name || activePatient?.customerName}</span></p>
                  </div>
                  <button onClick={() => setShowStockModal(false)} className="p-2 text-white/40 hover:text-white"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                  {/* Left: Interactive Input */}
                  <div className="flex-1 p-8 overflow-y-auto border-r border-white/5 space-y-4">
                    <datalist id="inventory-items">
                      {data?.all_inventory?.map((item: any) => (
                        <option key={item.id} value={item.name} />
                      ))}
                    </datalist>
                    <h3 className="text-xs uppercase tracking-widest font-bold text-white/20 mb-4 flex items-center gap-2">
                       <Plus size={14} /> New Entry
                    </h3>
                    {stockEntries.map((entry, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end bg-white/5 p-4 rounded-xl border border-white/5 group">
                        <div className="col-span-5 space-y-1">
                          <label className="text-[10px] text-white/30 uppercase font-bold px-1">Item Name</label>
                          <input 
                            list="inventory-items"
                            className="glass-input text-xs" 
                            placeholder="Medicine Name" 
                            value={entry.itemName}
                            onChange={(e) => updateEntry(index, 'itemName', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <label className="text-[10px] text-white/30 uppercase font-bold px-1">Time Period (Days)</label>
                          <input 
                            type="number"
                            className="glass-input text-xs" 
                            placeholder="e.g. 5"
                            value={entry.duration}
                            onChange={(e) => updateEntry(index, 'duration', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <label className="text-[10px] text-white/30 uppercase font-bold px-1">Qty</label>
                          <input 
                            type="number" 
                            className="glass-input text-xs" 
                            placeholder="0" 
                            value={entry.amount}
                            onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <button 
                            onClick={() => removeEntry(index)}
                            className="p-2 text-pink-500/40 hover:text-pink-400 transition-colors"
                            disabled={stockEntries.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button 
                      onClick={addEntry}
                      className="w-full py-3 border-2 border-dashed border-white/5 rounded-xl text-white/20 hover:text-white/40 hover:border-white/10 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      <PlusCircle size={16} /> Add Multiple Items
                    </button>

                    <button 
                      onClick={handleLogStock}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg shadow-primary-900/40 disabled:opacity-50 mt-4"
                    >
                      {isSubmitting ? 'Syncing...' : 'Confirm Usage Log'}
                    </button>
                  </div>

                  {/* Right: History Log */}
                  <div className="w-80 bg-black/20 p-8 overflow-y-auto">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-white/20 mb-6 flex items-center gap-2">
                       <Clock size={14} /> Previous Logs
                    </h3>
                    
                    <div className="space-y-6">
                      {patientHistory.length > 0 ? (
                        patientHistory.map((log) => (
                          <div key={log.id} className="relative pl-6 border-l border-white/10">
                            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary-500/30 border border-primary-500" />
                            <div className="text-[10px] text-white/40 font-mono mb-2">
                              {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                            </div>
                            <div className="space-y-2">
                              {log.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
                                  <div>
                                    <span className="text-white/60 block">{item.itemName}</span>
                                    <span className="text-[9px] text-primary-400/60 uppercase font-bold tracking-tighter">
                                      Period: {item.duration || 'N/A'} Days
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 font-bold text-pink-400">
                                    -{item.amount}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-white/10 italic text-xs">No previous usage records found for this patient.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

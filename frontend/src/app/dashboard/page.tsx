"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MessageSquare, 
  Plus,
  ClipboardCheck,
  Package,
  AlertCircle,
  X,
  User,
  Mail,
  Phone,
  ArrowRight,
  Search,
  CheckCircle2,
  Upload,
  Trash2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { HeartbeatLoader } from '@/components/HeartbeatLoader';
import { 
  subscribeToDashboardSummary, 
  createBooking, 
  updateInventoryItem, 
  subscribeToActiveStaff,
  logStockActions,
  subscribeToPatientHistory
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import { DoctorDashboard } from '@/components/dashboards/DoctorDashboard';
import { AssistantDashboard } from '@/components/dashboards/AssistantDashboard';
import { SupplierDashboard } from '@/components/dashboards/SupplierDashboard';

export default function Dashboard() {
  const { user, role, businessId, location: userLocation, isProfileComplete: authProfileComplete, loading: authLoading } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState(authProfileComplete);
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome");
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'booking' | 'form' | 'inventory'>('booking');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeStaff, setActiveStaff] = useState<any[]>([]);

  // Form States
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', phone: '', service: 'Initial Consultation', time: '09:00 AM' });
  const [inventoryForm, setInventoryForm] = useState({ itemName: '', quantity: 0, type: 'add' });
  const [formEmail, setFormEmail] = useState('');
  const [formLink, setFormLink] = useState('');
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState('');

  // Stock Usage Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [activePatient, setActivePatient] = useState<any>(null);
  const [stockEntries, setStockEntries] = useState([{ itemName: '', duration: '', amount: '' }]);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);

  // Repeat Patient Detection
  const [repeatPatientInfo, setRepeatPatientInfo] = useState<any>(null);
  const [repeatHistory, setRepeatHistory] = useState<any>(null);
  const [fetchingRepeat, setFetchingRepeat] = useState(false);

  // Greeting logic
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good Morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
    else if (hour >= 17 && hour < 21) setGreeting("Good Evening");
    else setGreeting("Good Night");
  }, []);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Data Sync
  useEffect(() => {
    if (authLoading || !user || !businessId) return;

    if (businessId) {
       const unsubscribeStaff = subscribeToActiveStaff((staff) => {
          setActiveStaff(staff);
          // Filter by role and match location if available
          setSuppliers(staff.filter(s => 
            s.role === 'supplier' && 
            (!userLocation || !s.location || s.location.toLowerCase() === userLocation.toLowerCase())
          ));
       });
       
       const unsubSummary = subscribeToDashboardSummary(businessId, (data) => {
          setStats(data);
          setLoading(false);
       }, role || '', user?.uid);
       
       return () => {
         unsubscribeStaff();
         unsubSummary();
       };
    }
  }, [user, authLoading, businessId, authProfileComplete, role, userLocation]);

  // Subscribe to patient history when modal opens
  useEffect(() => {
    if (!showStockModal || !activePatient || !user || !businessId) return;

    const patientName = activePatient.name || activePatient.customerName || activePatient.displayName;
    if (!patientName) return;

    const unsubscribe = subscribeToPatientHistory(businessId!, patientName, (logs: any[]) => {
      setPatientHistory(logs);
    });

    return () => unsubscribe();
  }, [showStockModal, activePatient, user, businessId]);

  // Repeat Patient Effect
  useEffect(() => {
    let isMounted = true;
    const email = bookingForm.email.toLowerCase();
    if (activeTab === 'booking' && email.includes('.') && email.includes('@')) {
      const existing = stats?.all_contacts?.find((p: any) => p.email?.toLowerCase() === email);
      if (existing) {
        setRepeatPatientInfo(existing);
        const fetchHistory = async () => {
          if (!isMounted) return;
          setFetchingRepeat(true);
          try {
            const { fetchPatientContext } = await import('@/services/api');
            const context = await fetchPatientContext(businessId!, email, existing.name || existing.customerName);
            if (isMounted) setRepeatHistory(context);
          } finally {
            if (isMounted) setFetchingRepeat(false);
          }
        };
        fetchHistory();
      } else {
        setRepeatPatientInfo(null);
        setRepeatHistory(null);
      }
    } else {
      setRepeatPatientInfo(null);
      setRepeatHistory(null);
    }
    return () => { isMounted = false; };
  }, [bookingForm.email, activeTab, stats?.all_contacts, businessId]);

  const handleLogStock = async () => {
    if (!businessId || !activePatient) return;
    setIsSubmitting(true);
    try {
      await logStockActions(
        businessId!, 
        stockEntries.map(e => ({...e, action: 'Stock Out', amount: Number(e.amount)})),
        activePatient?.name || activePatient?.customerName || 'Patient',
        activePatient?.email || activePatient?.customerEmail,
        selectedSupplier
      );
      showSuccess("Medical resources logged successfully.");
      setStockEntries([{ itemName: '', duration: '', amount: '' }]);
      setSelectedSupplier('');
      setShowStockModal(false);
    } catch (err: any) {
      console.error("Stock log error:", err);
      alert(err.message || "Failed to log stock");
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

  const displayStats = stats || {
    bookings: { today: 0, upcoming: 0, completed: 0, no_show: 0 },
    leads: { total: 0, new: 0 },
    inventory_alerts: [],
    all_bookings: [],
    all_contacts: [],
    all_inventory: []
  };

  const handleQuickBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      alert("Clinical session not ready. Please refresh.");
      return;
    }
    setIsSubmitting(true);
    try {
      const start = new Date();
      const [hours, mins] = bookingForm.time.split(':');
      start.setHours(parseInt(hours), parseInt(mins), 0);
      const end = new Date(start.getTime() + 45 * 60000);

      await createBooking(businessId, {
        customerName: bookingForm.name,
        customerEmail: bookingForm.email,
        customerPhone: bookingForm.phone,
        service: bookingForm.service,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: 'upcoming'
      });
      showSuccess("Booking confirmed and synced!");
      setBookingForm({ name: '', email: '', phone: '', service: 'Initial Consultation', time: '09:00 AM' });
    } catch (err) {
      alert("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInventoryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryForm.itemName || !businessId) return;
    setIsSubmitting(true);
    try {
      await logStockActions(
        businessId, 
        [{
          itemName: inventoryForm.itemName,
          amount: inventoryForm.quantity,
          action: inventoryForm.type === 'add' ? 'Stock In' : 'Stock Out'
        }],
        'Manual Log',
        undefined,
        selectedSupplier
      );
      showSuccess("Inventory level updated.");
      setInventoryForm({ itemName: '', quantity: 0, type: 'add' });
      setSelectedSupplier('');
    } catch (err) {
      alert("Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Processing ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
      if (emails && emails.length > 0) {
        const uniqueEmails = Array.from(new Set(emails));
        setBulkEmails(uniqueEmails);
        setUploadStatus(`Successfully parsed ${uniqueEmails.length} emails.`);
      } else {
        setUploadStatus("No emails found in file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSendForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const targetEmails = bulkEmails.length > 0 ? bulkEmails : [formEmail];
    const link = formLink || "https://mediweb.access/intake-form";

    await new Promise(r => setTimeout(r, 1500));
    
    showSuccess(`Form link ${bulkEmails.length > 0 ? 'broadcasted to ' + bulkEmails.length + ' patients' : 'sent to ' + formEmail}`);
    
    setFormEmail('');
    setFormLink('');
    setBulkEmails([]);
    setUploadStatus('');
    setIsSubmitting(false);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
      setShowModal(false);
    }, 2000);
  };

  const renderDashboardContent = () => {
    switch (role) {
      case 'assistant':
        return <AssistantDashboard stats={displayStats} user={user} />;
      case 'supplier':
        return <SupplierDashboard stats={displayStats} onAction={() => {
          setActiveTab('inventory');
          setShowModal(true);
        }} />;
      case 'doctor':
      default:
        return (
          <DoctorDashboard 
            stats={displayStats} 
            greeting={greeting} 
            user={user} 
            staff={activeStaff.filter((a: any) => a.role === 'assistant' && (a.businessId === user?.uid || !a.businessId))}
            onAction={() => setShowModal(true)} 
            onLogMedical={(booking: any) => {
              setActivePatient(booking);
              setShowStockModal(true);
            }}
          />
        );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <HeartbeatLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative transition-colors duration-500">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 pointer-events-auto">
        {loading && !stats && (
          <div className="flex items-center gap-2 mb-6 text-primary-400">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary-500"></div>
            <span className="text-sm">Updating real-time stats...</span>
          </div>
        )}

        {error ? (
          <div className="p-6 glass-card border-red-500/20 text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} />
              <span>{error}</span>
            </div>
            <button onClick={() => window.location.reload()} className="underline font-bold">Retry</button>
          </div>
        ) : renderDashboardContent()}

        {/* Modal Overlay */}
        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-xl glass-card relative overflow-hidden"
              >
                <button 
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-2 text-muted hover:text-current transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="border-b border-theme p-6 pb-0">
                  <h2 className="text-2xl font-bold mb-6">Quick Action Hub</h2>
                  <div className="flex gap-8">
                    {[
                      { id: 'booking', label: 'Quick Booking', icon: <Calendar size={18} />, roles: ['doctor'] },
                      { id: 'form', label: 'Send Form', icon: <ClipboardCheck size={18} />, roles: ['doctor', 'assistant'] },
                      { id: 'inventory', label: 'Log Stock', icon: <Package size={18} />, roles: ['supplier', 'doctor'] },
                    ].filter(tab => !tab.roles || tab.roles.includes(role || '')).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-sm font-semibold flex items-center gap-2 transition-all relative ${activeTab === tab.id ? 'text-primary-500' : 'text-muted hover:text-primary-500 hover:dark:text-white'}`}
                      >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-8">
                  {successMsg ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold">{successMsg}</h3>
                    </div>
                  ) : (
                    <>
                      {activeTab === 'booking' && (
                        <form onSubmit={handleQuickBooking} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Patient Name</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input 
                                  required
                                  value={bookingForm.name}
                                  onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})}
                                  className="glass-input pl-11" 
                                  placeholder="Full name" 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Email</label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input 
                                  required
                                  type="email"
                                  value={bookingForm.email}
                                  onChange={(e) => setBookingForm({...bookingForm, email: e.target.value})}
                                  className="glass-input pl-11" 
                                  placeholder="email@example.com" 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Phone</label>
                              <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input 
                                  required
                                  value={bookingForm.phone}
                                  onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                                  className="glass-input pl-11" 
                                  placeholder="+1 (555) 000-0000" 
                                />
                              </div>
                            </div>
                          </div>

                          {repeatPatientInfo && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="p-4 bg-primary-600/10 border border-primary-500/20 rounded-2xl overflow-hidden"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest flex items-center gap-2">
                                  <ShieldCheck size={14} /> Repeat Patient Detected
                                </span>
                                <span className="text-[10px] font-mono text-white/30 uppercase">PID: {repeatPatientInfo.id?.slice(0,8)}</span>
                              </div>
                              
                              {fetchingRepeat ? (
                                <div className="text-[10px] text-white/30 italic">Retrieving clinical history...</div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <div className="text-[9px] text-white/30 uppercase font-bold">Last Visit Date</div>
                                    <div className="text-xs font-bold text-white/80">
                                      {repeatHistory?.medicalLogs?.[0]?.createdAt?.seconds 
                                        ? new Date(repeatHistory.medicalLogs[0].createdAt.seconds * 1000).toLocaleDateString()
                                        : "No previous logs"}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[9px] text-white/30 uppercase font-bold">Clinical Stethoscope</div>
                                    <div className="text-xs text-white/50 italic truncate max-w-full">
                                      {repeatHistory?.report ? `"${repeatHistory.report.slice(0, 40)}..."` : "No notes found"}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Service</label>
                              <select 
                                className="glass-input bg-[#0f172a]"
                                value={bookingForm.service}
                                onChange={(e) => setBookingForm({...bookingForm, service: e.target.value})}
                              >
                                <option>Initial Consultation</option>
                                <option>Routine Checkup</option>
                                <option>Diagnostic Test</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Preferred Time</label>
                              <input 
                                type="time"
                                className="glass-input uppercase"
                                onChange={(e) => setBookingForm({...bookingForm, time: e.target.value})}
                              />
                            </div>
                          </div>
                          <button 
                            disabled={isSubmitting}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all mt-6 shadow-lg shadow-primary-900/40 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Syncing...' : 'Confirm Appointment'}
                          </button>
                        </form>
                      )}

                      {activeTab === 'form' && (
                        <form onSubmit={handleSendForm} className="space-y-6">
                          <div className="p-4 bg-primary-600/5 border border-primary-500/10 rounded-xl flex gap-4 items-start">
                            <MessageSquare className="text-primary-400 shrink-0 mt-1" size={24} />
                            <div>
                              <h4 className="font-bold mb-1">Electronic Intake Forms</h4>
                              <p className="text-xs text-white/50">Send a secure link for patients to complete their medical history online.</p>
                            </div>
                          </div>
                           <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Recipient Email</label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input 
                                  type="email"
                                  value={formEmail}
                                  onChange={(e) => setFormEmail(e.target.value)}
                                  className="glass-input pl-11 text-xs" 
                                  placeholder="patient@example.com" 
                                  disabled={bulkEmails.length > 0}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-white/50 uppercase font-bold px-1">Google Form Link</label>
                              <div className="relative">
                                <ArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input 
                                  value={formLink}
                                  onChange={(e) => setFormLink(e.target.value)}
                                  className="glass-input pl-11 text-xs" 
                                  placeholder="https://forms.gle/..." 
                                />
                              </div>
                            </div>
                          </div>

                          <div className="p-4 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                            <div className="flex flex-col items-center gap-3">
                              <label className="cursor-pointer group flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-400 group-hover:bg-primary-600 transition-all">
                                  <ClipboardCheck size={20} />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                                  {uploadStatus || "Upload Excel / CSV for Bulk Send"}
                                </span>
                                <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFileUpload} />
                              </label>
                              {bulkEmails.length > 0 && (
                                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                  Ready to broadcast to {bulkEmails.length} contacts
                                </div>
                              )}
                            </div>
                          </div>
                          <button 
                            disabled={isSubmitting}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? 'Processing...' : 'Send Link via Email'}
                            <ArrowRight size={18} />
                          </button>
                        </form>
                      )}

                      {activeTab === 'inventory' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-4 items-start">
                            <Package className="text-emerald-400 shrink-0 mt-1" size={24} />
                            <div>
                              <h4 className="font-bold mb-1">
                                {role === 'doctor' ? 'Manual Inventory Log' : 'Bulk Inventory Reconciliation'}
                              </h4>
                              <p className="text-xs text-white/50">
                                {role === 'doctor' 
                                  ? 'Update stock levels for medical resources after a patient visit.' 
                                  : 'Upload your latest stock sheet to synchronize all medical resource levels instantly.'}
                              </p>
                            </div>
                          </div>

                          {role === 'doctor' ? (
                            <form onSubmit={handleInventoryUpdate} className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-xs text-white/50 uppercase font-bold px-1">Medicine/Item Name</label>
                                <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                  <input 
                                    required
                                    value={inventoryForm.itemName}
                                    onChange={(e) => setInventoryForm({...inventoryForm, itemName: e.target.value})}
                                    className="glass-input pl-11" 
                                    placeholder="Search inventory..." 
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-xs text-white/50 uppercase font-bold px-1">Action</label>
                                  <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                    <button 
                                      type="button"
                                      onClick={() => setInventoryForm({...inventoryForm, type: 'add'})}
                                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${inventoryForm.type === 'add' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30'}`}
                                    >
                                      Stock In
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setInventoryForm({...inventoryForm, type: 'remove'})}
                                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${inventoryForm.type === 'remove' ? 'bg-pink-500/20 text-pink-400' : 'text-white/30'}`}
                                    >
                                      Stock Out
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-white/50 uppercase font-bold px-1">Amount</label>
                                  <input 
                                    required
                                    type="number"
                                    value={inventoryForm.quantity || ''}
                                    onChange={(e) => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value)})}
                                    className="glass-input font-mono" 
                                    placeholder="0" 
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-white/50 uppercase font-bold px-1">Select Supplier (Optional)</label>
                                <select 
                                  className="glass-input bg-[#0f172a]"
                                  value={selectedSupplier}
                                  onChange={(e) => setSelectedSupplier(e.target.value)}
                                >
                                  <option value="">Direct Log</option>
                                  {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.displayName || s.email}</option>
                                  ))}
                                </select>
                              </div>
                              <button 
                                disabled={isSubmitting}
                                className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all mt-4"
                              >
                                {isSubmitting ? 'Updating...' : 'Log Inventory Change'}
                              </button>
                            </form>
                          ) : (
                            <>
                              <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                <input 
                                  type="file" 
                                  id="hub-inventory-upload" 
                                  className="hidden" 
                                  accept=".csv,.txt"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !user) return;
                                    
                                    setIsSubmitting(true);
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const text = event.target?.result as string;
                                      const lines = text.split('\n');
                                      const items: any[] = [];
                                      
                                      lines.forEach(line => {
                                        const parts = line.split(',');
                                        if (parts.length >= 2) {
                                          items.push({
                                            name: parts[0].trim(),
                                            quantity: parseInt(parts[1].trim()) || 0,
                                            threshold: parts[2] ? parseInt(parts[2].trim()) : 5
                                          });
                                        }
                                      });

                                      if (items.length > 0) {
                                        const { bulkUpdateInventory } = await import('@/services/api');
                                        await bulkUpdateInventory(businessId!, items);
                                        showSuccess(`Inventory updated with ${items.length} records.`);
                                      } else {
                                        alert("Invalid file format. Please use Name, Quantity format.");
                                      }
                                      setIsSubmitting(false);
                                    };
                                    reader.readAsText(file);
                                  }}
                                />
                                <label htmlFor="hub-inventory-upload" className="cursor-pointer flex flex-col items-center gap-4 text-center">
                                  <div className="w-14 h-14 rounded-2xl bg-primary-600 shadow-xl shadow-primary-900/40 flex items-center justify-center">
                                    <Upload size={24} />
                                  </div>
                                  <div>
                                    <p className="font-bold">Select Inventory Data File</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Supports CSV and Text Reports</p>
                                  </div>
                                </label>
                              </div>
                              
                              <div className="text-center">
                                <p className="text-[10px] text-white/20 italic">Format: Item Name, Current Quantity, Threshold (optional)</p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Stock Usage Modal - Direct from Dashboard */}
        <AnimatePresence>
          {showStockModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl glass-card relative flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(212,175,55,0.1)] border-primary-500/20"
              >
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-primary-600/5">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Package className="text-primary-400" />
                      Log Medical Stock Usage
                    </h2>
                    <p className="text-sm text-white/40 mt-1 italic">Assigning resources for: <span className="text-primary-400 font-bold not-italic">{activePatient?.name || activePatient?.customerName}</span></p>
                  </div>
                  <button onClick={() => setShowStockModal(false)} className="p-2 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                  {/* Left: Input */}
                  <div className="flex-1 p-8 overflow-y-auto border-r border-white/5 space-y-4">
                    <datalist id="inventory-items">
                      {stats?.all_inventory?.map((item: any) => (
                        <option key={item.id} value={item.name} />
                      ))}
                    </datalist>
                    
                    {stockEntries.map((entry, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-2xl border border-white/10 relative">
                        {index > 0 && (
                          <button onClick={() => removeEntry(index)} className="absolute -top-2 -right-2 p-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/40 hover:bg-red-500 hover:text-white transition-all">
                            <X size={12} />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/30 uppercase font-bold">Item Name</label>
                            <input 
                              list="inventory-items"
                              value={entry.itemName}
                              onChange={(e) => updateEntry(index, 'itemName', e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
                              placeholder="Search..."
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/30 uppercase font-bold">Quantity Consumed</label>
                            <input 
                              type="number"
                              value={entry.amount}
                              onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none font-mono"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl mb-4">
                      <label className="text-[10px] text-primary-400 uppercase font-bold mb-2 block">Choose Supplier</label>
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary-500 outline-none"
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                      >
                        <option value="">Direct Log (No Supplier)</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.displayName || s.email}</option>
                        ))}
                      </select>
                    </div>

                    <button onClick={addEntry} className="w-full py-3 border border-dashed border-white/20 text-white/40 rounded-xl hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2 text-sm">
                      <Plus size={16} /> Add Another Item
                    </button>
                  </div>

                  {/* Right: History */}
                  <div className="w-80 bg-black/20 p-6 overflow-y-auto">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                       <Clock size={12} /> Patient Usage History
                    </h3>
                    <div className="space-y-4">
                      {patientHistory.map((log: any) => (
                         <div key={log.id} className="relative pl-4 border-l border-white/10">
                            <div className="absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-primary-900 border border-primary-500"></div>
                            <div className="text-xs text-white/40 mb-1">{new Date(log.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                            {log.items?.map((i: any, idx: number) => (
                              <div key={idx} className="text-xs font-bold text-white/80">
                                {i.amount}x {i.itemName}
                              </div>
                            ))}
                         </div>
                      ))}
                      {patientHistory.length === 0 && (
                        <div className="text-xs text-white/20 italic">No usage history found for this patient.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                  <button onClick={() => setShowStockModal(false)} className="px-6 py-3 text-sm font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
                  <button 
                    onClick={handleLogStock}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold shadow-lg shadow-primary-900/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> : <CheckCircle2 size={16} />}
                    Confirm & Update Stock
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

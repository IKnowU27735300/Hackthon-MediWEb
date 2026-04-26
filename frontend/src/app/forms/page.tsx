"use client";

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Plus, 
  FileText, 
  MoreVertical,
  Clock,
  CheckCircle2,
  ExternalLink,
  Mail,
  Calendar
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { 
  subscribeToDashboardSummary,
  subscribeToActiveStaff,
  assignFormToAssistant,
  acceptForm,
  updateBookingStatus,
  fetchPatientContext
} from '@/services/api';
import { 
  User, 
  Package, 
  ChevronRight, 
  ShieldCheck,
  Stethoscope,
  Info,
  X 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartbeatLoader } from '@/components/HeartbeatLoader';

export default function FormsPage() {
  const { user, role, businessId, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [caseLoading, setCaseLoading] = useState(false);

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

    const unsubscribeStaff = subscribeToActiveStaff((list) => {
      if (!isMounted) return;
      let staffList = list.filter(a => a.id !== user?.uid);
      
      // Filter by role: Doctors see Assistants, Assistants see Doctors (for context, though delegation is 1-way)
      if (role === 'doctor') {
        staffList = staffList.filter(a => a.role === 'assistant');
      }

      setAssistants(staffList);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (unsubscribeStaff) unsubscribeStaff();
    };
  }, [user, authLoading, businessId, role]);

  // Aggregate forms from bookings/contacts across all clinical phases
  const rawForms = data?.all_bookings?.filter((b: any) => 
    b.status === "upcoming" || 
    b.status === "scheduled" || 
    b.status === "completed" ||
    b.status === "pending_review"
  ) || [];

  const forms = role === 'assistant' 
    ? rawForms.filter((f: any) => f.assignedToAssistant === true && f.assignedAssistantId === user?.uid)
    : rawForms;

  const handleAcceptForm = async (form: any) => {
    if (!businessId) return;
    try {
      await acceptForm(businessId, form.id, form.customerEmail, form.customerName);
      alert(`Patient ${form.customerName} has been accepted and moved to 'Scheduled' status.`);
    } catch (err) {
      console.error(err);
      alert("Failed to process clinical acceptance.");
    }
  };
  
  const handleViewCase = async (form: any) => {
    setCaseLoading(true);
    try {
      const context = await fetchPatientContext(businessId!, form.customerEmail, form.customerName);
      setSelectedCase({ ...form, context });
    } catch (err) {
      alert("Failed to load patient records.");
    } finally {
      setCaseLoading(false);
    }
  };

  const handleAssistantReview = async (form: any, isConfirmed: boolean) => {
    if (!businessId) return;
    try {
      const status = isConfirmed ? 'completed' : 'rejected';
      await updateBookingStatus(businessId, form.id, status);
      alert(`Patient ${form.customerName} has been ${isConfirmed ? 'confirmed' : 'rejected'} and marked as ${status}.`);
    } catch (err) {
      console.error(err);
      alert("Failed to update clinical review status.");
    }
  };

  const handleSendToAssistant = async (form: any, assistant: any) => {
    if (!businessId) return;
    try {
      await assignFormToAssistant(businessId, form.id, assistant.id);
      alert(`Patient record for ${form.customerName} has been securely shared with ${assistant.businessName || assistant.displayName || 'the assistant'}.`);
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to share record.");
    }
  };

  const getAssistantStatus = (lastActive: any) => {
    if (!lastActive) return 'offline';
    const now = new Date().getTime();
    const last = lastActive.seconds ? lastActive.seconds * 1000 : new Date(lastActive).getTime();
    const diff = now - last;
    if (diff < 60000) return 'active'; // 1 minute
    if (diff < 300000) return 'away';  // 5 minutes
    return 'offline';
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <HeartbeatLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">Intake Forms</h1>
            <p className="text-white/50">
              {role === 'assistant' 
                ? "Review medical records assigned to you by the doctor." 
                : "Track patient compliance and delegate review tasks to your clinical team."}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
          <div className="glass-card">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <FileText size={18} className="text-primary-400" />
                {role === 'assistant' ? 'Assigned Medical Records' : 'Recent Submissions'}
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter forms..." 
                  className="glass-input pl-10 py-2 text-xs w-48" 
                />
              </div>
            </div>
            
            <div className="divide-y divide-white/5">
              {forms.length > 0 ? (
                forms.map((form: any) => (
                  <div key={form.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center relative">
                        <CheckCircle2 size={20} />
                        {form.assignedToAssistant && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-[#0f172a]" />
                        )}
                      </div>
                      <div>
                         <div className="font-bold flex items-center gap-2">
                          {form.customerName}
                          {form.status === 'scheduled' ? (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Scheduled</span>
                          ) : form.status === 'completed' ? (
                            <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Completed</span>
                          ) : form.status === 'pending_review' ? (
                            <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Review Pending</span>
                          ) : form.assignedToAssistant && (
                            <span className="text-[8px] bg-primary-600/20 text-primary-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Assigned</span>
                          )}
                        </div>
                        <div className="text-xs text-white/30 uppercase tracking-widest">{form.service} Intake</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-12">
                      <div className="text-sm">
                        <div className="text-white/30 text-[10px] uppercase font-bold mb-1">Submitted</div>
                        <div className="flex items-center gap-2 font-mono">
                          <Clock size={12} className="text-primary-400" />
                          {form.startTime ? new Date(form.startTime).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>
                      
                      {form.status === 'scheduled' ? (
                        <button 
                          onClick={() => router.push('/bookings')}
                          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold transition-colors"
                        >
                          <Calendar size={14} /> Schedule Appointment
                        </button>
                      ) : form.status === 'completed' ? (
                        <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                          <CheckCircle2 size={14} /> Handover Complete
                        </div>
                      ) : (role === 'assistant' && form.assignedToAssistant) ? (
                        <button 
                          disabled={caseLoading}
                          onClick={() => handleViewCase(form)}
                          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-bold transition-all hover:translate-x-1"
                        >
                          Review & Submit <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            const contact = data?.all_contacts?.find((c: any) => c.email === form.customerEmail);
                            if (contact) {
                              router.push(`/customers/${contact.id}/report`);
                            } else {
                              router.push(`/customers/${form.id}/report`);
                            }
                          }}
                          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-bold transition-colors group-hover:translate-x-1"
                        >
                          Review Form <ExternalLink size={14} />
                        </button>
                      )}

                      {role === 'doctor' && form.status !== 'scheduled' && form.status !== 'completed' && form.status !== 'pending_review' && (
                        <button 
                          onClick={() => handleAcceptForm(form)}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Accept & Request Reports
                        </button>
                      )}
                      
                      {role === 'doctor' && form.status === 'pending_review' && (
                        <div className="px-4 py-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          <Clock size={12} /> Under Clinical Review
                        </div>
                      )}
                      
                      {role === 'doctor' && (
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === form.id ? null : form.id)}
                            className="p-2 text-white/30 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5 hover:border-white/10"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenuId === form.id && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-12 w-64 glass-card border-white/10 z-30 py-2 shadow-2xl"
                              >
                                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-white/20 font-extrabold border-b border-white/5 mb-2">
                                  Delegate to Clinical Staff
                                </div>
                                
                                <div className="max-h-48 overflow-y-auto">
                                  {assistants.filter(a => a.id !== user?.uid).length > 0 ? (
                                    assistants.filter(a => a.id !== user?.uid).map((assistant) => {
                                      const status = getAssistantStatus(assistant.lastActive);
                                      return (
                                        <button 
                                          key={assistant.id}
                                          onClick={() => handleSendToAssistant(form, assistant)}
                                          className="w-full text-left px-4 py-3 hover:bg-primary-500/10 flex items-center justify-between group/item transition-colors"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold">
                                              {assistant.businessName?.[0] || assistant.displayName?.[0] || 'A'}
                                            </div>
                                            <div>
                                              <div className="text-xs font-bold text-white group-hover/item:text-primary-400">
                                                {assistant.businessName || assistant.displayName || 'Assistant'}
                                              </div>
                                              <div className="text-[9px] text-white/30 lowercase truncate max-w-[120px]">
                                                {assistant.email || assistant.googleAccountEmail || 'No email'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                              status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                                              status === 'away' ? 'bg-yellow-500' : 'bg-white/10'
                                            }`} />
                                            <span className="text-[8px] uppercase font-bold text-white/20">{status}</span>
                                          </div>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="px-4 py-8 text-center text-[10px] text-white/20 italic">
                                      No active assistants found in your network.
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          {/* Backdrop to close menu */}
                          {activeMenuId === form.id && (
                            <div 
                              className="fixed inset-0 z-20 cursor-default" 
                              onClick={() => setActiveMenuId(null)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-16 text-center">
                  <div className="inline-flex w-16 h-16 bg-white/[0.02] rounded-full items-center justify-center mb-4 border border-white/5">
                    <ClipboardCheck size={32} className="text-white/10" />
                  </div>
                  <div className="text-white/30 italic text-sm">
                    {role === 'assistant' 
                      ? "No medical records have been assigned to you yet." 
                      : "No completed forms to review yet. Forms appear here once patients complete their digital intake."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Intensive Case Review Modal for Assistants */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6"
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

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
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
                         <Mail size={14} className="text-primary-500/50" />
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
                            <div>
                              <div className="text-sm font-bold">{log.items?.[0]?.itemName || "Medical Resource"}</div>
                              <div className="text-[10px] text-white/30">{new Date(log.createdAt?.seconds * 1000).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-emerald-400 font-mono font-bold text-sm">
                                -{log.items?.[0]?.amount || 1} {log.items?.[0]?.itemName?.includes('Box') ? 'Unit' : 'Qty'}
                              </div>
                              {log.items?.[0]?.duration && (
                                <div className="text-[10px] text-white/40 mt-1">
                                  {log.items[0].duration} Days
                                </div>
                              )}
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
                        handleAssistantReview(selectedCase, true);
                        setSelectedCase(null);
                      }}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CheckCircle2 size={20} /> Confirm Meeting Complete
                    </button>
                    <button 
                      onClick={() => {
                        handleAssistantReview(selectedCase, false);
                        setSelectedCase(null);
                      }}
                      className="px-8 py-4 bg-white/5 hover:bg-pink-500/10 text-white/40 hover:text-pink-400 border border-white/10 hover:border-pink-500/20 rounded-2xl font-bold transition-all"
                    >
                      Reject Case
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

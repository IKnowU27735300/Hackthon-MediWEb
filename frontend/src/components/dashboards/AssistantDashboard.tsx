"use client";

import React from 'react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Users, 
  ClipboardCheck, 
  ArrowRight,
  Clock,
  ShieldCheck,
  Package,
  FileText,
  X,
  Activity,
  Pill,
  Stethoscope,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from '../StatCard';
import { useAuth } from '@/context/AuthContext';
import { subscribeToClinicalUsageLogs, submitIntakeForm } from '@/services/api';

export function AssistantDashboard({ stats }: { stats: any, user: any }) {
  const { user, businessId, displayName, clinicName } = useAuth();

  // ── State ────────────────────────────────────────────────
  const [selectedCase, setSelectedCase] = React.useState<any>(null);
  const [showCaseModal, setShowCaseModal] = React.useState(false);
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [reviewedIds, setReviewedIds] = React.useState<Set<string>>(new Set());

  // Real-time clinical usage logs (fulfilled prescriptions)
  const [fulfilledLogs, setFulfilledLogs] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!businessId) return;
    const unsub = subscribeToClinicalUsageLogs(businessId, (logs) => {
      setFulfilledLogs(logs);
    });
    return () => unsub();
  }, [businessId]);

  // ── Derived data ─────────────────────────────────────────
  const displayStats = stats || {
    bookings: { today: 0, upcoming: 0, completed: 0, no_show: 0 },
    leads: { total: 0, new: 0 },
    inventory_alerts: [],
    all_contacts: [],
    all_history: []
  };

  const assignedCases = [
    ...(displayStats.all_bookings?.filter((b: any) => {
      const isForMe = b.assignedAssistantId === user?.uid || b.sharedWithAssistant === true;
      const isPendingClinic = !b.assignedAssistantId && b.status === 'pending_review';
      const isActionable = b.status === 'pending_review' || b.status === 'pending' || b.status === 'upcoming';
      return (isForMe || isPendingClinic) && isActionable && !reviewedIds.has(b.id);
    }) || []),
    ...(displayStats.all_history?.filter((log: any) => 
      (log.assignedAssistantId === user?.uid || (!log.assignedAssistantId && log.status === 'pending')) &&
      log.status === 'pending' &&
      !reviewedIds.has(log.id)
    ).map((log: any) => ({
      ...log,
      customerName: log.patientName,
      service: 'Prescription Review',
      isHistoryTask: true
    })) || [])
  ];

  // All prescriptions from stock_history
  const allPrescriptions = (displayStats.all_history || [])
    .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  // Intake forms = supplier-accepted requests waiting for assistant submission
  const intakeForms = (displayStats.all_history || []).filter(
    (log: any) => log.status === 'accepted' || log.status === 'dispatched'
  ).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  // Track submitting state per form
  const [submittingIds, setSubmittingIds] = React.useState<Set<string>>(new Set());

  const handleSubmitIntake = async (log: any) => {
    if (!businessId || !user) return;
    setSubmittingIds(prev => new Set(Array.from(prev).concat(log.id)));
    try {
      await submitIntakeForm(
        businessId,
        log.id,
        user.uid,
        user.displayName || user.email || 'Assistant'
      );
    } catch (err) {
      console.error('Failed to submit intake:', err);
      alert('Failed to process intake form. Please try again.');
    } finally {
      setSubmittingIds(prev => { const s = new Set(Array.from(prev)); s.delete(log.id); return s; });
    }
  };

  // ── Handlers ─────────────────────────────────────────────
  const handleProcessCase = (booking: any) => {
    setSelectedCase(booking);
    setShowCaseModal(true);
  };

  const handleMarkReviewed = async () => {
    if (!selectedCase || !businessId) return;
    setIsReviewing(true);
    try {
      const caseId = selectedCase.id;
      if (selectedCase.isHistoryTask) {
        await updateDoc(doc(db, 'businesses', businessId, 'stock_history', caseId), {
          status: 'completed',
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid
        });
      } else {
        await updateDoc(doc(db, 'businesses', businessId, 'bookings', caseId), {
          status: 'completed',
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid
        });
      }
      setReviewedIds(prev => new Set(Array.from(prev).concat(caseId)));
      setShowCaseModal(false);
    } catch (err) {
      console.error('Failed to mark as reviewed:', err);
      alert('Failed to update case status. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  // ── Popup for new cases ───────────────────────────────────
  const [showPopup, setShowPopup] = React.useState(false);
  const [latestCase, setLatestCase] = React.useState<any>(null);
  const prevCasesLength = React.useRef(assignedCases.length);

  React.useEffect(() => {
    if (assignedCases.length > prevCasesLength.current) {
      const newest = assignedCases[0];
      setLatestCase(newest);
      setShowPopup(true);
      const t = setTimeout(() => setShowPopup(false), 5000);
      return () => clearTimeout(t);
    }
    prevCasesLength.current = assignedCases.length;
  }, [assignedCases.length]);

  // ── Helpers ───────────────────────────────────────────────
  const statusBadge = (status: string) => {
    if (status === 'accepted' || status === 'completed' || status === 'dispatched') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (status === 'pending') return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    if (status === 'rejected') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    return 'bg-white/10 text-white/40 border border-white/10';
  };

  const statusLabel = (status: string) => {
    if (status === 'accepted' || status === 'dispatched') return 'Dispatched';
    if (status === 'completed') return 'Fulfilled';
    if (status === 'pending') return 'Awaiting Supplier';
    if (status === 'rejected') return 'Rejected';
    return status;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* New-case popup */}
      <AnimatePresence>
        {showPopup && latestCase && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-10 left-1/2 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-400/30"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <Activity size={24} />
            </div>
            <div>
              <h4 className="font-bold">New Prescription Assigned</h4>
              <p className="text-sm opacity-80">Doctor prescribed items for {latestCase.customerName}</p>
            </div>
            <button onClick={() => setShowPopup(false)} className="ml-4 opacity-50 hover:opacity-100">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-emerald-400">
            {displayName || user?.email?.split('@')[0] || 'Assistant'} 
          </h1>
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Assistant Hub · Clinical Support</p>
          <p className="text-white/50 mt-1">Monitor doctor prescriptions and track supply fulfillment.</p>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Pending Reviews" 
          value={assignedCases.length} 
          subtitle="Awaiting your action"
          icon={<Users className="text-emerald-400" />}
        />
        <StatCard 
          title="Prescriptions Issued" 
          value={allPrescriptions.length} 
          subtitle="Total doctor logs"
          icon={<Pill className="text-blue-400" />}
        />
        <StatCard 
          title="Intake Forms" 
          value={intakeForms.length} 
          subtitle="Ready for processing"
          icon={<ClipboardCheck className="text-amber-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left column: case queue + prescription log */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Intake Forms (supplier-accepted) ── */}
          {intakeForms.length > 0 && (
            <div className="glass-card p-6 border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><ClipboardCheck size={80} /></div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <ClipboardCheck className="text-amber-400" />
                Intake Forms
                <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{intakeForms.length}</span>
              </h3>
              <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-6">
                Supplier accepted · Submit to mark patient as processed
              </p>
              <div className="space-y-4">
                {intakeForms.map((log: any) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-black/30 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-0.5">Patient</div>
                        <div className="font-bold text-amber-400 text-lg">{log.patientName || 'Unknown'}</div>
                        <div className="text-[10px] text-white/25 font-mono mt-0.5">
                          Dispatched: {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : '—'}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                        Awaiting Submission
                      </span>
                    </div>

                    {log.items && log.items.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Medications Dispatched</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {log.items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-xs">
                              <span className="text-white/80 truncate">{item.itemName}</span>
                              <span className="font-mono font-bold text-amber-400 ml-2 shrink-0">×{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.prescriptionNotes && (
                      <div className="mb-4 p-3 bg-black/40 rounded-xl border border-white/5">
                        <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Doctor's Notes</div>
                        <div className="text-xs text-white/70 italic">"{log.prescriptionNotes}"</div>
                      </div>
                    )}

                    <button
                      onClick={() => handleSubmitIntake(log)}
                      disabled={submittingIds.has(log.id)}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                    >
                      {submittingIds.has(log.id) ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                      ) : (
                        <><CheckCircle size={16} /> Submit & Mark Patient as Processed</>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Case Reviews */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" /> 
              Pending Case Reviews
              {assignedCases.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{assignedCases.length}</span>
              )}
            </h3>
            <div className="space-y-4">
              {assignedCases.length > 0 ? (
                assignedCases.map((booking: any, idx: number) => (
                  <div key={booking.id || idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold">
                        {booking.customerName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="font-bold">{booking.customerName || 'Anonymous'}</div>
                        <div className="text-xs text-white/40">{booking.service || 'Prescription Review'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleProcessCase(booking)}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform"
                    >
                      View Prescription <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-white/30 italic bg-white/5 rounded-2xl">
                  No pending cases assigned at this time.
                </div>
              )}
            </div>
          </div>

          {/* Doctor's Prescription Log — read-only feed */}
          <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Stethoscope className="text-blue-400" />
              Doctor's Prescription Log
            </h3>
            <p className="text-xs text-white/30 mb-6 uppercase tracking-widest font-bold">
              Read-only · All medications prescribed by doctors
            </p>

            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {allPrescriptions.length > 0 ? (
                allPrescriptions.map((log: any, idx: number) => (
                  <motion.div
                    key={log.id || idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-4 bg-black/30 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all"
                  >
                    {/* Patient + status row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                          {log.patientName?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{log.patientName || 'Unknown Patient'}</div>
                          <div className="text-[10px] text-white/30 font-mono">
                            {log.createdAt?.seconds
                              ? new Date(log.createdAt.seconds * 1000).toLocaleString()
                              : 'Date unknown'}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${statusBadge(log.status)}`}>
                        {statusLabel(log.status)}
                      </span>
                    </div>

                    {/* Prescribed items */}
                    {log.items && log.items.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2 flex items-center gap-1">
                          <Pill size={10} /> Prescribed Medications
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {log.items.map((item: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-xs"
                            >
                              <span className="text-white/80 truncate">{item.itemName}</span>
                              <span className="font-mono font-bold text-blue-400 ml-2 shrink-0">
                                ×{item.amount}
                                {item.duration ? <span className="text-white/20 font-normal"> / {item.duration}</span> : null}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Doctor's prescription notes */}
                    {log.prescriptionNotes && (
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Doctor's Notes</div>
                        <div className="text-xs text-white/70 italic leading-relaxed">"{log.prescriptionNotes}"</div>
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-14 text-white/20 italic bg-white/5 rounded-2xl">
                  <FileText size={32} className="mx-auto mb-3 opacity-30" />
                  No prescriptions issued by doctors yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: sidebar */}
        <div className="space-y-6">
          {/* Context card */}
          <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-lg font-bold mb-4">Clinical Assistant Role</h3>
            <p className="text-sm text-white/60 mb-6">
              Linked to: <span className="text-emerald-400 font-bold">{clinicName || 'Clinic'}</span>
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40 uppercase tracking-widest font-bold">Network Status</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-emerald-500" 
                />
              </div>
            </div>
          </div>

          {/* Fulfilled / dispatched feed */}
          <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              Supplier Fulfillments
            </h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-4">
              Confirmed dispatches
            </p>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {fulfilledLogs.length > 0 ? (
                fulfilledLogs.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="p-3 bg-black/30 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-bold text-emerald-400 text-sm">{log.patientName}</span>
                      <span className="text-[9px] text-white/25 font-mono">
                        {log.fulfilledAt?.seconds
                          ? new Date(log.fulfilledAt.seconds * 1000).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {log.itemsDispensed?.map((item: any, i: number) => (
                        <span key={i} className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md text-emerald-300">
                          {item.itemName} ×{item.amount}
                        </span>
                      ))}
                    </div>
                    {log.supplierName && (
                      <div className="text-[9px] text-white/20 mt-1.5">By: {log.supplierName}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-white/20 italic text-[10px]">
                  No fulfilled dispatches yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Case Review Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showCaseModal && selectedCase && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl glass-card relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-emerald-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-xl">
                    {selectedCase.customerName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCase.customerName}</h2>
                    <p className="text-xs text-white/40">{selectedCase.service || 'Prescription Review'}</p>
                  </div>
                </div>
                <button onClick={() => setShowCaseModal(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Email Address</div>
                    <div className="text-sm font-medium">{selectedCase.email || selectedCase.customerEmail || 'Not provided'}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Phone Number</div>
                    <div className="text-sm font-medium">{selectedCase.phone || 'Not provided'}</div>
                  </div>
                </div>

                {/* Prescribed medications */}
                {selectedCase.items && selectedCase.items.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <Pill size={14} /> Prescribed Medications
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCase.items.map((item: any, i: number) => (
                        <div key={i} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                          <span className="text-sm text-white/80 font-medium">{item.itemName}</span>
                          <div className="text-right">
                            <span className="font-mono font-bold text-blue-400 text-sm">×{item.amount}</span>
                            {item.duration && <div className="text-[9px] text-white/30">{item.duration}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
                    <AlertCircle size={16} />
                    No specific medications listed for this case.
                  </div>
                )}

                {/* Doctor's prescription notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <FileText size={14} /> Doctor's Clinical Notes
                  </h4>
                  <div className="p-5 bg-black/40 rounded-2xl border border-emerald-500/10 italic text-sm text-white/70 leading-relaxed">
                    {selectedCase.prescriptionNotes || selectedCase.notes || selectedCase.clinicalNotes || 
                      "No prescription notes provided by the doctor for this case."}
                  </div>
                </div>

                {/* Supply status */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-white/30 uppercase font-bold mb-0.5">Supply Status</div>
                    <div className="text-sm font-bold capitalize">{selectedCase.status || 'pending'}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase ${statusBadge(selectedCase.status)}`}>
                    {statusLabel(selectedCase.status)}
                  </span>
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                <button 
                  onClick={() => setShowCaseModal(false)}
                  className="px-6 py-2.5 text-xs font-bold text-white/40 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={handleMarkReviewed}
                  disabled={isReviewing}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isReviewing ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><ClipboardCheck size={14} /> Mark as Reviewed</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

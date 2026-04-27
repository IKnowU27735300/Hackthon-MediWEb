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
  ShoppingBag,
  FileText,
  X,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from '../StatCard';
import { ScheduleItem } from '../ScheduleItem';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function AssistantDashboard({ stats }: { stats: any, user: any }) {
  const { user, businessId, displayName, clinicName } = useAuth();

  // --- State must be declared before any derived values that reference it ---
  const [selectedCase, setSelectedCase] = React.useState<any>(null);
  const [showCaseModal, setShowCaseModal] = React.useState(false);
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [reviewedIds, setReviewedIds] = React.useState<Set<string>>(new Set());

  const displayStats = stats || {
    bookings: { today: 0, upcoming: 0, completed: 0, no_show: 0 },
    leads: { total: 0, new: 0 },
    inventory_alerts: [],
    all_contacts: [],
    all_history: []
  };

  // Show bookings that are explicitly assigned to this assistant, OR any pending_review
  // booking in the clinic that hasn't been assigned yet (so nothing falls through the cracks).
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
      service: 'Stock/Prescription Review',
      isHistoryTask: true
    })) || [])
  ];

  const recentSupplierResponses = (displayStats.all_history || []).filter((log: any) => 
    (log.assignedAssistantId === user?.uid || !log.assignedAssistantId) &&
    (log.status === 'pending' || log.status === 'completed' || log.status === 'accepted' || log.status === 'rejected' || log.status === 'dispatched')
  );

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
        // Update stock_history record
        await updateDoc(doc(db, 'businesses', businessId, 'stock_history', caseId), {
          status: 'completed',
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid
        });
      } else {
        // Update bookings record
        await updateDoc(doc(db, 'businesses', businessId, 'bookings', caseId), {
          status: 'completed',
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid
        });
      }
      // Mark as reviewed locally so it disappears from the queue immediately
      setReviewedIds(prev => new Set(Array.from(prev).concat(caseId)));
      setShowCaseModal(false);
    } catch (err) {
      console.error('Failed to mark as reviewed:', err);
      alert('Failed to update case status. Please try again.');
    } finally {
      setIsReviewing(false);
    }
  };

  const router = useRouter();
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

  return (
    <div className="space-y-8">
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
              <h4 className="font-bold">New Clinical Assignment</h4>
              <p className="text-sm opacity-80">Doctor assigned a new case review for {latestCase.customerName}</p>
            </div>
            <button onClick={() => setShowPopup(false)} className="ml-4 opacity-50 hover:opacity-100">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-emerald-400">
            {displayName || user?.email?.split('@')[0] || 'Assistant'} 
          </h1>
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Assistant Hub · Clinical Support</p>
          <p className="text-white/50 mt-1">Clinical support and medical record reviews.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Assigned Patients" 
          value={assignedCases.length} 
          subtitle="Awaiting review"
          icon={<Users className="text-emerald-400" />}
        />
        <StatCard 
          title="Case Reviews" 
          value={displayStats.bookings.completed} 
          subtitle="Completed today"
          icon={<ClipboardCheck className="text-blue-400" />}
        />
        <StatCard 
          title="Active Alerts" 
          value={displayStats.inventory_alerts.length} 
          subtitle="Urgent attention"
          icon={<Clock className="text-amber-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" /> 
              Pending Case Reviews
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
                        <div className="text-xs text-white/40">{booking.service || 'Medical Review'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleProcessCase(booking)}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform"
                    >
                      Review Case <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-white/30 italic bg-white/5 rounded-2xl">
                  No cases assigned for review at this time.
                </div>
              )}
            </div>
          </div>

           <div className="glass-card p-6">
             <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
               <Package className="text-emerald-400" /> 
               Supplier Responses & Prescriptions
             </h3>
             <div className="space-y-4">
               {recentSupplierResponses.length > 0 ? (
                 recentSupplierResponses
                   .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                   .slice(0, 10)
                   .map((log: any, idx: number) => (
                   <div key={log.id || idx} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                     <div className="flex items-center justify-between mb-2">
                       <div className="font-bold text-emerald-400">{log.patientName}</div>
                       <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                          (log.status === 'completed' || log.status === 'accepted') ? 'bg-emerald-500/20 text-emerald-400' : 
                          log.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {(log.status === 'completed' || log.status === 'accepted') ? 'Accepted' : log.status === 'pending' ? 'Pending Supplier' : 'Rejected'}
                        </div>
                     </div>
                     <div className="text-xs text-white/50 mb-3 flex flex-wrap gap-2">
                       {log.items?.map((i:any, entryIdx: number) => (
                         <span key={entryIdx} className="bg-white/5 px-2 py-1 rounded-md border border-white/5">
                           {i.amount}x {i.itemName}
                         </span>
                       ))}
                     </div>
                     {log.prescriptionNotes && (
                       <div className="mt-2 p-3 bg-black/40 rounded-lg border border-emerald-500/10">
                         <div className="text-[10px] text-white/30 uppercase font-bold mb-1 tracking-widest">Doctor's Prescription</div>
                         <div className="text-xs text-white/70 italic leading-relaxed">"{log.prescriptionNotes}"</div>
                       </div>
                     )}
                   </div>
                 ))
               ) : (
                 <div className="text-center py-10 text-white/30 italic bg-white/5 rounded-2xl">
                   No recent supplier responses.
                 </div>
               )}
             </div>
           </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-lg font-bold mb-4">Clinical Assistant Role</h3>
            <p className="text-sm text-white/60 mb-6">Linked to: <span className="text-emerald-400 font-bold">{clinicName || 'Clinic'}</span></p>
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


        </div>
      </div>

      {/* Case Review Modal */}
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
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-emerald-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-xl">
                    {selectedCase.customerName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCase.customerName}</h2>
                    <p className="text-xs text-white/40">{selectedCase.service}</p>
                  </div>
                </div>
                <button onClick={() => setShowCaseModal(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
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

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <FileText size={14} /> Clinical Instructions
                  </h4>
                  <div className="p-5 bg-black/40 rounded-2xl border border-emerald-500/10 italic text-sm text-white/70 leading-relaxed">
                    {selectedCase.notes || selectedCase.clinicalNotes || "No specific instructions provided by the doctor for this case review."}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs transition-all border border-white/5">
                      View Full History
                    </button>
                    <button className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs transition-all border border-white/5">
                      Upload Results
                    </button>
                  </div>
                </div>
              </div>

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
                    'Mark as Reviewed'
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

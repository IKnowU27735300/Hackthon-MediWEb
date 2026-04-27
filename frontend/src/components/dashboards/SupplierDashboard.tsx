"use client";

import React from 'react';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  ArrowUpRight,
  TrendingUp,
  History,
  Plus,
  Clock,
  CheckCircle,
  ShoppingBag,
  Activity,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '../StatCard';
import { acceptStockRequest, rejectStockRequest, subscribeToClinicalUsageLogs } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { AnimatePresence } from 'framer-motion';

export function SupplierDashboard({ stats, onAction }: { stats: any, onAction: () => void }) {
  const { businessId, user, displayName, clinicName } = useAuth();
  const displayStats = stats || {
    inventory_alerts: [],
    all_inventory: [],
    all_history: []
  };

  // Clinical usage logs state
  const [usageLogs, setUsageLogs] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!businessId) return;
    const unsub = subscribeToClinicalUsageLogs(businessId, (logs) => {
      setUsageLogs(logs);
    });
    return () => unsub();
  }, [businessId]);

  const pendingRequests = (displayStats.all_history || []).filter((log: any) => 
    (log.supplierId === user?.uid || (log.status === 'pending' && !log.supplierId)) && 
    log.status === 'pending'
  );

  const completedRequests = (displayStats.all_history || []).filter((log: any) => 
    log.supplierId === user?.uid && (log.status === 'completed' || log.status === 'accepted' || log.status === 'dispatched')
  );

  const handleAcceptRequest = async (requestId: string, clinicId?: string) => {
    const targetBusinessId = clinicId || businessId;
    if (!targetBusinessId) return;
    try {
      await acceptStockRequest(targetBusinessId, requestId);
      onAction(); // Refresh data
    } catch (err) {
      console.error(err);
      alert("Failed to accept request.");
    }
  };

  const handleRejectRequest = async (requestId: string, clinicId?: string) => {
    const targetBusinessId = clinicId || businessId;
    if (!targetBusinessId) return;
    try {
      await rejectStockRequest(targetBusinessId, requestId);
      onAction(); // Refresh data
    } catch (err) {
      console.error(err);
      alert("Failed to reject request.");
    }
  };

  // Popup notification logic
  const [showPopup, setShowPopup] = React.useState(false);
  const [latestRequest, setLatestRequest] = React.useState<any>(null);
  const prevPendingLength = React.useRef(pendingRequests.length);

  React.useEffect(() => {
    if (pendingRequests.length > prevPendingLength.current) {
      // New request came in
      const newest = pendingRequests[0]; // Assuming sorted by newest first or just grabbing one
      setLatestRequest(newest);
      setShowPopup(true);
      // Auto-hide after 5 seconds
      const t = setTimeout(() => setShowPopup(false), 5000);
      return () => clearTimeout(t);
    }
    prevPendingLength.current = pendingRequests.length;
  }, [pendingRequests.length]);

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>
        {showPopup && latestRequest && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-10 left-1/2 z-[100] bg-primary-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-primary-400/30"
          >
            <div className="bg-white/20 p-2 rounded-full">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-bold">New Prescription &amp; Supply Request</h4>
              <p className="text-sm opacity-80">Doctor prescribed medications for {latestRequest.patientName}</p>
            </div>
            <button onClick={() => setShowPopup(false)} className="ml-4 opacity-50 hover:opacity-100">
              <Plus size={20} className="rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-amber-500">
            {displayName || user?.email?.split('@')[0] || 'Supplier'}
          </h1>
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Supply Chain · Logistics Hub</p>
          <p className="text-white/50 mt-1">Resource management and clinical fulfillment.</p>
        </div>
        <button 
          onClick={onAction}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Sync Inventory
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Stock Alerts" 
          value={displayStats.inventory_alerts.length} 
          subtitle="Critically low items"
          icon={<AlertTriangle className="text-red-400" />}
          badge={displayStats.inventory_alerts.length > 0 ? { label: 'Urgent', color: 'bg-red-500/20 text-red-400' } : undefined}
        />
        <StatCard 
          title="Total SKU count" 
          value={displayStats.all_inventory?.length || 0} 
          subtitle="Registered resources"
          icon={<Package className="text-amber-400" />}
        />
        <StatCard 
          title="Fulfilled Requests" 
          value={usageLogs.length} 
          subtitle="Clinical usage entries"
          icon={<Activity className="text-emerald-400" />}
        />
        <StatCard 
          title="Expiring Items" 
          value={displayStats.all_inventory?.filter((item: any) => 
            item.expiryDate && new Date(item.expiryDate).getTime() < (new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
          ).length} 
          subtitle="Expires within 14 days"
          icon={<Clock className="text-orange-400" />}
        />

      </div>

      {pendingRequests.length > 0 && (
        <div className="glass-card p-6 border-primary-500/30 bg-primary-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShoppingBag size={80} />
          </div>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShoppingBag className="text-primary-400" />
            Incoming Supply Requests
            <span className="bg-primary-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map((request: any) => (
              <motion.div 
                key={request.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-primary-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs text-white/30 uppercase font-bold tracking-tighter">Requested For</div>
                      <div className="font-bold text-primary-400">{request.patientName}</div>
                    </div>
                    <div className="text-[10px] bg-white/5 px-2 py-1 rounded text-white/40">
                      {request.createdAt?.seconds ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {request.items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm bg-white/5 p-2 rounded-lg">
                        <span className="text-white/80">{item.itemName}</span>
                        <span className="font-mono font-bold text-primary-400">x{item.amount}</span>
                      </div>
                    ))}
                  </div>
                  {request.prescriptionNotes && (
                    <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Clinical Notes</div>
                      <div className="text-xs text-white/70 italic">{request.prescriptionNotes}</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleRejectRequest(request.id, request.businessId)}
                    className="w-1/3 py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 border border-red-500/30"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleAcceptRequest(request.id, request.businessId)}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} /> Accept &amp; Dispatch
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> 
            Critical Stock Levels
          </h3>
          <div className="space-y-4">
            {displayStats.inventory_alerts.length > 0 ? (
              displayStats.inventory_alerts.map((item: any, idx: number) => (
                <div key={item.id || idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-red-500/10 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-white/40">Threshold: {item.threshold} units</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">{item.quantity}</div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Remaining</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-white/30 italic bg-white/5 rounded-2xl">
                All inventory levels are above specified thresholds.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
            <h3 className="text-lg font-bold mb-4">Supply Chain Context</h3>
            <p className="text-sm text-white/60 mb-6">Linked to: <span className="text-amber-400 font-bold">{clinicName || 'Clinic'}</span></p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40 uppercase tracking-widest font-bold">Logistics Status</span>
                <span className="text-amber-400 font-bold">READY</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-amber-500" 
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <History size={18} className="text-amber-500" />
              Recent Logs
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(displayStats as any).all_history?.length > 0 ? (
                (displayStats as any).all_history
                  .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                  .slice(0, 5)
                  .map((log: any) => (
                    <div key={log.id} className="flex gap-3 text-sm group">
                      <div className="w-1 h-auto bg-amber-500/20 rounded-full group-hover:bg-amber-500/50 transition-all" />
                      <div className="flex-1 pb-3 border-b border-white/5">
                        <p className="text-white/60 text-[10px]">
                          <span className="text-amber-400 font-bold">{log.patientName || 'System'}</span> Used:
                        </p>
                        <div className="mt-1 space-y-1">
                          {log.items?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-black/20 p-1.5 rounded-lg">
                              <span className="text-white font-medium text-[10px]">{item.itemName}</span>
                              <span className={`font-bold text-[9px] ${item.action === 'Stock In' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                {item.action === 'Stock In' ? '+' : '-'}{item.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-6 text-center text-white/20 italic text-[10px]">
                  No recent inventory logs.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Clinical Usage Logs Panel ── */}
      <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Activity size={100} />
        </div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Activity className="text-emerald-400" />
          Clinical Usage Logs
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full">
            {usageLogs.length} entries
          </span>
        </h3>

        {usageLogs.length === 0 ? (
          <div className="text-center py-12 text-white/20 italic bg-white/5 rounded-2xl">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            No fulfilled dispensations yet. Accepted requests will appear here.
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {usageLogs.map((log: any) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-black/30 border border-white/5 rounded-2xl p-4 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Patient</div>
                    <div className="font-bold text-emerald-400">{log.patientName}</div>
                    {log.prescriptionNotes && (
                      <div className="text-[10px] text-white/40 italic mt-0.5 max-w-xs truncate">
                        &ldquo;{log.prescriptionNotes}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Fulfilled</div>
                    <div className="text-[10px] text-white/30 font-mono">
                      {log.fulfilledAt?.seconds
                        ? new Date(log.fulfilledAt.seconds * 1000).toLocaleString()
                        : '—'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {log.itemsDispensed?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-xs"
                    >
                      <span className="text-white/80 truncate">{item.itemName}</span>
                      <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                        x{item.amount}
                      </span>
                    </div>
                  ))}
                </div>

                {log.clinicName && (
                  <div className="mt-2 text-[10px] text-white/25 flex items-center gap-1">
                    <span className="text-white/40">Clinic:</span> {log.clinicName}
                    {log.clinicLocation && <span className="text-white/20"> · {log.clinicLocation}</span>}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}


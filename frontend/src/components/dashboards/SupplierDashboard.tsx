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
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '../StatCard';

export function SupplierDashboard({ stats, onAction }: { stats: any, onAction: () => void }) {
  const displayStats = stats || {
    inventory_alerts: [],
    all_inventory: []
  };

  const expiringItems = displayStats.all_inventory?.filter((item: any) => 
    item.expiryDate && new Date(item.expiryDate).getTime() < (new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
  ) || [];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-amber-500">Inventory Command</h1>
          <p className="text-white/50">Logistics and resource management.</p>
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
          title="Inbound Shipments" 
          value="4" 
          subtitle="Expected this week"
          icon={<Truck className="text-blue-400" />}
        />
        <StatCard 
          title="Expiring Items" 
          value={expiringItems.length} 
          subtitle="Expires within 14 days"
          icon={<Clock className="text-orange-400" />}
          badge={expiringItems.length > 0 ? { label: 'Review', color: 'bg-orange-500/20 text-orange-400' } : undefined}
        />

      </div>

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

        <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <History size={18} className="text-amber-500" />
            Recent Logs
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {(displayStats as any).all_history?.length > 0 ? (
              (displayStats as any).all_history
                .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .slice(0, 8)
                .map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-sm group">
                    <div className="w-1 h-auto bg-amber-500/20 rounded-full group-hover:bg-amber-500/50 transition-all" />
                    <div className="flex-1 pb-3 border-b border-white/5">
                      <p className="text-white/60 text-xs">
                        <span className="text-amber-400 font-bold">{log.patientName || 'System'}</span> Used:
                      </p>
                      <div className="mt-1 space-y-1">
                        {log.items?.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                            <span className="text-white font-medium text-[11px]">{item.itemName}</span>
                            <span className={`font-bold text-[10px] ${item.action === 'Stock In' ? 'text-emerald-400' : 'text-pink-400'}`}>
                              {item.action === 'Stock In' ? '+' : '-'}{item.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-white/20 mt-2 lowercase tracking-tighter">
                        {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'Recent Session'}
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-10 text-center text-white/20 italic text-xs">
                No inventory logs recorded yet.
              </div>
            )}
          </div>
          <button className="w-full mt-6 py-3 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2">
            Full Audit History <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

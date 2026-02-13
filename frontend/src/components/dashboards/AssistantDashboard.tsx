"use client";

import React from 'react';
import { 
  Users, 
  ClipboardCheck, 
  ArrowRight,
  Clock,
  ShieldCheck,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '../StatCard';
import { ScheduleItem } from '../ScheduleItem';
import { useRouter } from 'next/navigation';

export function AssistantDashboard({ stats, user }: { stats: any, user: any }) {
  const displayStats = stats || {
    bookings: { today: 0, upcoming: 0, completed: 0, no_show: 0 },
    leads: { total: 0, new: 0 },
    inventory_alerts: [],
    all_contacts: []
  };

  // Filter Bookings/Tasks that are explicitly assigned to this assistant
  const assignedCases = displayStats.all_bookings?.filter((b: any) => 
    (b.assignedAssistantId === user?.uid || b.sharedWithAssistant === true) &&
    b.status === 'pending_review'
  ) || [];

  const router = useRouter();

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-emerald-400">Assistant Hub</h1>
          <p className="text-white/50">Clinical support and medical record reviews.</p>
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
                      onClick={() => router.push('/forms')}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform"
                    >
                      Process <ArrowRight size={14} />
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
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-lg font-bold mb-4">Clinical Scribe Status</h3>
            <p className="text-sm text-white/60 mb-6">Your assistant profile is active in the clinical network.</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40 uppercase tracking-widest font-bold">Visibility</span>
                <span className="text-emerald-400 font-bold">ONLINE</span>
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

          <div className="glass-card p-6 border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Search size={18} className="text-white/40" />
              Quick lookup
            </h3>
            <input 
              type="text" 
              placeholder="Search patient record..." 
              className="glass-input text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

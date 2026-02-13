"use client";

import React from 'react';
import { 
  Calendar, 
  MessageSquare, 
  ClipboardCheck, 
  Package, 
  Plus,
  Users,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { StatCard } from '../StatCard';
import { ScheduleItem } from '../ScheduleItem';
import { useAuth } from '@/context/AuthContext';
import { updateBookingStatus } from '@/services/api';

export function DoctorDashboard({ 
  stats, 
  greeting, 
  user, 
  staff,
  onAction,
  onLogMedical
}: { 
  stats: any, 
  greeting: string, 
  user: any, 
  staff?: any[],
  onAction: () => void,
  onLogMedical?: (booking: any) => void
}) {
  const router = useRouter();
  const { businessId } = useAuth();
  
  const displayStats = stats || {
    bookings: { today: 0, upcoming: 0, completed: 0, no_show: 0 },
    leads: { total: 0, new: 0 },
    inventory_alerts: [],
    all_bookings: []
  };

  const handleAcceptBooking = (booking: any) => {
    // Navigate to bookings page with 'new' action and prefilled data to Create Appointment
    const params = new URLSearchParams({
      action: 'new',
      name: booking.customerName || '',
      email: booking.customerEmail || '',
      phone: booking.customerPhone || '',
      service: booking.service || '',
    });
    router.push(`/bookings?${params.toString()}`);
  };

  const handleRejectBooking = async (booking: any) => {
    if (!businessId || !booking.id) return;
    if (confirm(`Are you sure you want to reject the appointment request for ${booking.customerName}?`)) {
        try {
            await updateBookingStatus(businessId, booking.id, 'rejected');
        } catch(e) { 
            console.error(e);
            alert("Failed to reject booking");
        }
    }
  };

  return (
    <>
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">{greeting}, {user?.displayName?.split(' ')[0] || 'Doctor'}</h1>
          <p className="text-white/50">Your practice is at a glance.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onAction}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            New Action
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Today's Bookings" 
          value={displayStats.bookings.today} 
          subtitle={`${displayStats.bookings.upcoming} upcoming`}
          icon={<Calendar className="text-primary-400" />}
        />
        <StatCard 
          title="Active Leads" 
          value={displayStats.leads.total} 
          subtitle={`${displayStats.leads.new} new today`}
          icon={<MessageSquare className="text-blue-400" />}
        />
        <StatCard 
          title="Completed Sessions" 
          value={displayStats.bookings.completed} 
          subtitle="total tracked"
          icon={<ClipboardCheck className="text-violet-400" />}
        />
        <StatCard 
          title="Inventory Status" 
          value={displayStats.inventory_alerts.length} 
          subtitle="low stock items"
          icon={<Package className="text-yellow-400" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-xl font-semibold mb-6">Today's Schedule</h3>
          <div className="space-y-4">
            {displayStats.all_bookings?.length > 0 ? (
              displayStats.all_bookings
                .filter((b: any) => b.status !== 'rejected' && b.status !== 'cancelled')
                .slice(0, 5)
                .map((booking: any, idx: number) => (
                <ScheduleItem 
                  key={booking.id || idx}
                  time={booking.startTime?.seconds ? new Date(booking.startTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (booking.startTime ? new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD")}
                  customer={booking.customerName || "Unknown Patient"} 
                  service={booking.service || "Evaluation"} 
                  status={booking.status || "upcoming"} 
                  onAccept={() => {
                    const params = new URLSearchParams({
                      action: 'new',
                      id: booking.id,
                      name: booking.customerName || '',
                      email: booking.customerEmail || '',
                      phone: booking.customerPhone || '',
                      service: booking.service || '',
                    });
                    router.push(`/bookings?${params.toString()}`);
                  }}
                  onReject={() => handleRejectBooking(booking)}
                  onViewDetails={() => router.push('/bookings')} 
                />
              ))
            ) : (
              <div className="text-sm text-white/40 italic py-8 text-center bg-white/5 rounded-xl">
                No appointments scheduled for today.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 bg-primary-600/5 border-primary-500/10">
          <h3 className="text-xl font-semibold mb-4">Practice Health</h3>
          <p className="text-sm text-white/60 mb-6">Automated monitoring is active. No issues detected in your synchronization feeds.</p>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex justify-between text-xs font-mono text-primary-400 mb-2">
              <span>GOOGLE CALENDAR</span>
              <span>CONNECTED</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 border-white/5 bg-white/[0.02]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-primary-400" /> 
              Active Clinical Team
            </h3>
            <p className="text-xs text-white/30 uppercase tracking-widest font-bold mt-1">Live Assistant Network</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Network Live</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {staff && staff.length > 0 ? (
            staff.map((assistant: any, idx: number) => {
              const lastActiveVal = assistant.lastActive?.seconds ? assistant.lastActive.seconds * 1000 : (assistant.lastActive ? new Date(assistant.lastActive).getTime() : 0);
              const now = new Date().getTime();
              // A user is "Online" if status is explicitly 'online' AND lastActive is fresh (within 2 mins)
              const isOnline = assistant.status === 'online' && (now - lastActiveVal) < 120000;
              // A user is "Away" if they haven't manually signed out but haven't updated in 10 mins
              const isAway = assistant.status === 'online' && (now - lastActiveVal) >= 120000 && (now - lastActiveVal) < 600000;

              return (
                <motion.div 
                  key={assistant.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg">
                      {assistant.displayName?.[0] || 'A'}
                    </div>
                    <div>
                      <div className="font-bold text-sm truncate max-w-[120px]">{assistant.displayName || 'Assistant'}</div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : isAway ? 'bg-yellow-500' : 'bg-white/10'}`} />
                        <span className="text-[9px] uppercase font-bold text-white/30">{isOnline ? 'Active' : isAway ? 'Away' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white/40 hover:text-white">
                    Send Task <ArrowRight size={10} />
                  </button>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
               <ShieldCheck className="mx-auto text-white/10 mb-3" size={32} />
               <p className="text-sm text-white/30 italic">No clinical assistants are currently active in your network.</p>
               <p className="text-[10px] text-white/10 uppercase tracking-widest mt-2">Staff appears here when they log in to their portals</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

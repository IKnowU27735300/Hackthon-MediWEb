import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Clock, Check, X, User } from 'lucide-react';

interface ScheduleItemProps {
  time: string;
  customer: string;
  service: string;
  status: string;
  onAccept?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  onLogMedical?: (booking: any) => void; 
}

export function ScheduleItem({ time, customer, service, status, onAccept, onReject, onViewDetails, onLogMedical }: ScheduleItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'scheduled': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-primary-400 bg-primary-400/10 border-primary-400/20';
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className="group flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-primary-500/30 transition-all duration-300 cursor-pointer shadow-lg"
      onClick={onViewDetails}
    >
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center justify-center py-2 px-4 bg-primary-500/10 rounded-xl border border-primary-500/20 min-w-[80px]">
          <Clock size={14} className="text-primary-400 mb-1" />
          <div className="text-xs font-black tracking-tighter text-primary-300">{time}</div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-full border border-white/10 group-hover:bg-primary-500/20 transition-colors">
            <User size={20} className="text-muted group-hover:text-white" />
          </div>
          <div>
            <div className="font-bold text-white group-hover:text-primary-300 transition-colors">{customer}</div>
            <div className="text-sm text-muted/70 font-medium">{service}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor()}`}>
          {status === 'completed' && <CheckCircle2 size={12} />}
          {status !== 'completed' && <Clock size={12} />}
          {status}
        </div>

        <div className="flex items-center gap-2">
          {onAccept && status === 'pending' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl text-emerald-400 transition-all border border-emerald-500/20 hover:scale-110"
              title="Accept & Schedule"
            >
              <Check size={18} />
            </button>
          )}

          {onReject && status === 'pending' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="p-2.5 bg-pink-500/10 hover:bg-pink-500/20 rounded-xl text-pink-400 transition-all border border-pink-500/20 hover:scale-110"
              title="Reject Request"
            >
              <X size={18} />
            </button>
          )}

          {onLogMedical && (status === 'upcoming' || status === 'scheduled') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if(onLogMedical) onLogMedical({ customerName: customer, service, status }); 
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 rounded-xl text-xs font-black uppercase tracking-tighter border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30 transition-all hover:scale-105 shadow-xl shadow-amber-900/10"
            >
              <Clock size={14} /> Log Medical
            </button>
          )}

          <div className="p-2 bg-white/5 rounded-xl border border-white/10 group-hover:bg-primary-500 group-hover:text-white transition-all">
            <ArrowUpRight size={20} className="text-muted group-hover:text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

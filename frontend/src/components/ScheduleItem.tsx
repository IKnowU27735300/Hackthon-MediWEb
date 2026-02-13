import React from 'react';
import { ArrowUpRight, CheckCircle2, Clock, Check, X } from 'lucide-react';

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
  return (
    <div className="flex items-center justify-between p-4 bg-theme-muted rounded-xl border border-theme hover:border-primary-500/30 transition-all cursor-pointer">
      <div className="flex items-center gap-6">
        <div className="text-sm font-mono text-primary-500 dark:text-primary-400 w-20">{time}</div>
        <div>
          <div className="font-semibold">{customer}</div>
          <div className="text-sm text-muted">{service}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {status === 'completed' ? (
          <div className="flex items-center gap-1 text-emerald-400 text-sm">
            <CheckCircle2 size={16} /> Completed
          </div>
        ) : status === 'scheduled' ? (
           <div className="flex items-center gap-1 text-blue-400 text-sm mr-2">
            <Clock size={16} /> Scheduler
          </div> 
        ) : (
          <div className="flex items-center gap-1 text-primary-400 text-sm mr-2">
            <Clock size={16} /> Upcoming
          </div>
        )}
        
        {onAccept && status !== 'completed' && status !== 'scheduled' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-all border border-emerald-500/10"
            title="Accept & Schedule"
          >
            <Check size={16} />
          </button>
        )}

        {onReject && status !== 'completed' && status !== 'scheduled' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
            className="p-2 bg-pink-500/10 hover:bg-pink-500/20 rounded-lg text-pink-400 transition-all border border-pink-500/10"
            title="Reject Request"
          >
            <X size={16} />
          </button>
        )}

        {onLogMedical && status === 'upcoming' && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               if(onLogMedical) onLogMedical({ customerName: customer, service, status }); 
             }}
             className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-bold uppercase tracking-widest border border-amber-500/20 hover:bg-amber-500/20 transition-all"
           >
             <Clock size={12} /> Log Medical
           </button>
        )}

        <button 
          onClick={onViewDetails}
          className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors"
        >
          <ArrowUpRight size={18} className="text-muted group-hover:text-primary-500" />
        </button>
      </div>
    </div>
  );
}

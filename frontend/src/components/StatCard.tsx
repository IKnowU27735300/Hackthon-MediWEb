import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: any;
  subtitle: string;
  icon: React.ReactNode;
  trend?: number;
  badge?: { label: string, color: string };
}

export function StatCard({ title, value, subtitle, icon, trend, badge }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden glass-card p-6 border border-white/10 hover:border-primary-500/50 transition-all duration-300"
    >
      {/* Background Glow Effect */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/10 blur-3xl group-hover:bg-primary-500/20 transition-colors duration-500 rounded-full" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10 group-hover:scale-110 transition-transform duration-300 shadow-xl">
            {icon}
          </div>
          <div className="flex flex-col items-end gap-2">
            {trend !== undefined && (
              <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-pink-400 bg-pink-400/10'}`}>
                {trend >= 0 ? '+' : ''}{trend}% <ArrowUpRight size={12} />
              </span>
            )}
            {badge && (
              <span className={`text-[10px] px-2 py-1 rounded-lg font-black tracking-wider uppercase shadow-lg ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-sm font-medium text-muted/80 tracking-wide uppercase">{title}</div>
          <div className="text-3xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            {value}
          </div>
          <div className="text-xs text-muted/60 font-medium italic">{subtitle}</div>
        </div>
      </div>
    </motion.div>
  );
}

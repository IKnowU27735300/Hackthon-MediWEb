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
      className="glass-card p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/5 rounded-lg">
          {icon}
        </div>
        {trend && (
          <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
            +{trend}% <ArrowUpRight size={12} />
          </span>
        )}
        {badge && (
          <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div>
        <div className="text-sm text-muted mb-1">{title}</div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="text-xs text-muted/70">{subtitle}</div>
      </div>
    </motion.div>
  );
}

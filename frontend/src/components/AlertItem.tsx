import React from 'react';

interface AlertItemProps {
  title: string;
  description: string;
  time: string;
  link: string;
}

export function AlertItem({ title, description, time, link }: AlertItemProps) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border-l-[3px] border-pink-500/50 hover:bg-white/10 transition-colors cursor-pointer">
      <div className="flex justify-between items-start mb-1">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-[10px] text-white/40 uppercase font-mono">{time}</div>
      </div>
      <div className="text-xs text-white/60 mb-2">{description}</div>
      <div className="text-xs text-primary-400 hover:text-primary-300 font-medium">Resolve Action &rarr;</div>
    </div>
  );
}

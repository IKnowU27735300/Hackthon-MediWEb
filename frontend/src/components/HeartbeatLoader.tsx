import React from 'react';

export function HeartbeatLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <svg
        width="120"
        height="40"
        viewBox="0 0 120 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary-500"
      >
        <path
          d="M0 20H30L35 10L45 30L52 20H65L70 5L80 35L88 20H120"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-heartbeat"
        />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-400/60 animate-pulse">
        Synchronizing Clinical Data...
      </span>
    </div>
  );
}

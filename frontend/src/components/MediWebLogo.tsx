import React from 'react';

export function MediWebLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 200 150" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* The W shape */}
      <path 
        d="M40 30 L70 120 L100 50 L130 120 L160 30" 
        stroke="#65a30d" 
        strokeWidth="18" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* The visible pulse line crossing through */}
      <path 
        d="M20 75 H75 L85 45 L100 105 L115 45 L125 75 H180" 
        stroke="#84cc16" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

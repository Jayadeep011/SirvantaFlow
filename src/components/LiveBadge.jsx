// src/components/LiveBadge.jsx
// Live telemetry pill with a dual-ring pulsing dot. tone: 'emerald' | 'amber' | 'rose'.

import React from 'react';

export default function LiveBadge({ children, tone = 'emerald', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-[#9AA0A6] ${className}`} role="status">
      <span className="pulse-dot" data-tone={tone === 'emerald' ? undefined : tone} aria-hidden="true" />
      {children}
    </span>
  );
}

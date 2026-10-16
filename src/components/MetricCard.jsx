// src/components/MetricCard.jsx
// Phase 4: command-center metric card. Small-caps label, large monospace figure with spring motion,
// a glass delta pill, and a live micro-sparkline drawn into the card background.

import React, { useId } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import SpringNumber from './marketing/SpringNumber';

const TONES = {
  gold: 'text-[#7A5A17] dark:text-[#F3D27C]',
  emerald: 'text-emerald-700 dark:text-[#10B981]',
  rose: 'text-rose-600 dark:text-[#F43F5E]',
  neutral: 'text-slate-900 dark:text-[#F8F9FA]',
};

const PILLS = {
  up: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shadow-[0_0_14px_-3px_rgba(16,185,129,0.5)] dark:text-emerald-300',
  down: 'border-rose-500/30 bg-rose-500/10 text-rose-700 shadow-[0_0_14px_-3px_rgba(244,63,94,0.5)] dark:text-rose-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 shadow-[0_0_14px_-3px_rgba(245,158,11,0.5)] dark:text-amber-300',
  flat: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-[#9AA0A6]',
};

/** Glass pill for a change or status: tone is up, down, warn or flat. */
export function DeltaBadge({ tone = 'flat', children }) {
  const Icon = tone === 'up' ? ArrowUpRight : tone === 'down' ? ArrowDownRight : Minus;
  return (
    <span className={`num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur ${PILLS[tone]}`}>
      <Icon size={12} aria-hidden="true" />{children}
    </span>
  );
}

/** Tiny line chart that fills its container. `data` is an array of numbers. */
export function MiniSpark({ data, color = '#E2B13C', className = '' }) {
  const id = `spark-${useId().replace(/:/g, '')}`;
  if (!data || data.length < 2) return null;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const span = hi - lo || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 34 - ((v - lo) / span) * 28]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L 100 40 L 0 40 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function MetricCard({ label, value, format, tone = 'gold', delta, hint, spark, sparkColor }) {
  return (
    <div className="command-cell min-h-[9.5rem] overflow-hidden p-4">
      <MiniSpark data={spark} color={sparkColor} />
      <div className="relative z-10">
        <p className="label-caps">{label}</p>
        <p className={`mt-2 truncate text-2xl font-bold sm:text-[1.7rem] ${TONES[tone]}`}>
          <SpringNumber value={value} format={format} />
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta && <DeltaBadge tone={delta.tone}>{delta.text}</DeltaBadge>}
          {hint && <span className="text-[11px] text-slate-500 dark:text-[#9AA0A6]">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

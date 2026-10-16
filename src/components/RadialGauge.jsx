// src/components/RadialGauge.jsx
// Phase 5: multi-tier concentric radial gauge. Four rings, outermost first:
//   Safe-to-spend (gold to emerald), emergency buffer, 30-day bills, tax reserve.
// Each ring is that bucket's share of your cash. A faint ghost arc on the outer ring marks the
// baseline safe-to-spend so stress-test shrinkage is easy to see as you drag a slider.

import React from 'react';
import SpringNumber from './marketing/SpringNumber';
import { usd } from '../finance';

const CX = 150;
const CY = 150;
const START = 135; // degrees, bottom-left
const SWEEP = 270;
const point = (r, deg) => [CX + r * Math.cos((deg * Math.PI) / 180), CY + r * Math.sin((deg * Math.PI) / 180)];
const arc = (r) => {
  const [x0, y0] = point(r, START);
  const [x1, y1] = point(r, START + SWEEP);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const RINGS = [
  { key: 'safe', r: 130, label: 'Safe to spend', stroke: 'url(#gaugeGold)', dot: 'bg-gradient-to-r from-[#E2B13C] to-[#10B981]' },
  { key: 'buffer', r: 108, label: 'Emergency buffer', stroke: '#5B8DEF', dot: 'bg-[#5B8DEF]' },
  { key: 'bills', r: 86, label: '30-day bills', stroke: '#94A3B8', dot: 'bg-slate-400' },
  { key: 'tax', r: 64, label: 'Tax reserve', stroke: '#F59E0B', dot: 'bg-[#F59E0B]' },
];

function Ring({ r, stroke, fraction, ghost, glow }) {
  const f = Math.max(0, Math.min(1, fraction)) * 100;
  const g = ghost === undefined ? 0 : Math.max(0, Math.min(1, ghost)) * 100;
  return (
    <g>
      <path d={arc(r)} fill="none" strokeWidth="14" strokeLinecap="round" pathLength="100" className="stroke-slate-200 dark:stroke-white/[0.08]" />
      {g > 0 && (
        <path d={arc(r)} fill="none" strokeWidth="14" strokeLinecap="round" pathLength="100" stroke="rgba(226,177,60,0.22)" strokeDasharray={`${g} 100`} className="transition-all duration-300 ease-out motion-reduce:transition-none" />
      )}
      <path
        d={arc(r)}
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        pathLength="100"
        stroke={stroke}
        strokeDasharray={`${f} 100`}
        className="transition-all duration-300 ease-out motion-reduce:transition-none"
        style={glow && f > 0 ? { filter: 'drop-shadow(0 0 6px rgba(226,177,60,0.55))' } : undefined}
      />
    </g>
  );
}

/**
 * values: { cash, tax, bills, buffer, safe } where safe may be negative;
 * baselineSafe is the safe-to-spend before any stress is applied.
 */
export default function RadialGauge({ values, baselineSafe }) {
  const { cash, tax, bills, buffer, safe } = values;
  const reserved = tax + bills + buffer;
  const denom = Math.max(cash, reserved, 1);
  const short = safe < 0;
  const fractions = { safe: short ? 0 : safe / denom, buffer: buffer / denom, bills: bills / denom, tax: tax / denom };
  const ghost = baselineSafe !== undefined && baselineSafe !== safe ? Math.max(baselineSafe, 0) / denom : undefined;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,19rem)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[19rem]">
        <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label={`Safe to spend ${usd(Math.max(safe, 0))} of ${usd(cash)} cash`}>
          <defs>
            <linearGradient id="gaugeGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E2B13C" />
              <stop offset="55%" stopColor="#FFD666" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          {RINGS.map((ring) => (
            <Ring key={ring.key} r={ring.r} stroke={short && ring.key === 'safe' ? '#F43F5E' : ring.stroke} fraction={ring.key === 'safe' && short ? 1 : fractions[ring.key]} ghost={ring.key === 'safe' ? ghost : undefined} glow={ring.key === 'safe'} />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center" aria-live="polite">
            <p className="label-caps">{short ? 'Shortfall' : 'Safe to spend'}</p>
            <p className={`mt-1 text-3xl font-bold ${short ? 'text-rose-600 dark:text-[#F43F5E]' : 'text-slate-900 dark:text-[#F3D27C]'}`}><SpringNumber value={safe} /></p>
            <p className="num mt-1 text-[11px] text-slate-500 dark:text-[#9AA0A6]">of {usd(cash)} cash</p>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {RINGS.map((ring) => {
          const amount = { safe, buffer, bills, tax }[ring.key];
          return (
            <li key={ring.key} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2.5 last:border-b-0 dark:border-white/[0.07]">
              <span className="flex items-center gap-2.5 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${ring.dot}`} aria-hidden="true" />{ring.label}</span>
              <span className="text-right">
                <span className={`num block text-sm font-semibold ${ring.key === 'safe' && short ? 'text-rose-600 dark:text-[#F43F5E]' : ''}`}><SpringNumber value={amount} /></span>
                <span className="num block text-[11px] text-slate-500 dark:text-[#9AA0A6]">{Math.round((Math.max(amount, 0) / denom) * 100)}% of cash</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// src/components/marketing/OsCanvas.jsx
// Phase 2: the live, interactive "financial OS" canvas for the home page hero.
// Controls on top, a gold-tracer cashflow diagram below. Every figure is recomputed on each change.
// The model and the shared state live in src/sandbox.js so the waterfall section below reads the same numbers.

import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { usd, currencySymbol } from '../../finance';
import { nextDeadline, fmtDate } from '../../tax';
import SpringNumber from './SpringNumber';
import { ENTITIES, STRATEGIES, RUNWAYS, MIN, MAX, STEPS, fromSlider, compute, useSandbox } from '../../sandbox';

/* ---------- diagram geometry (viewBox units; nodes use the same units as percentages) ---------- */
const VB_W = 1000;
const VB_H = 520;
const BOX = {
  gross: { x: 0, y: 130, w: 250, h: 260 },
  tax: { x: 375, y: 130, w: 250, h: 260 },
  salary: { x: 750, y: 10, w: 250, h: 240 },
  safe: { x: 750, y: 270, w: 250, h: 240 },
};
const PATHS = {
  inflow: 'M 250 260 L 375 260',
  salary: 'M 625 260 C 700 260, 685 130, 750 130',
  safe: 'M 625 260 C 700 260, 685 390, 750 390',
};

/* ---------- small pieces ---------- */
const Label = ({ children }) => <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA0A6]">{children}</p>;

function Segmented({ label, value, onChange, options, columns }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-1.5 ${columns}`}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666] ${
              on ? 'border-[#E2B13C]/70 bg-[#E2B13C]/15 text-[#F3D27C] shadow-[0_0_16px_-4px_rgba(226,177,60,0.6)]' : 'border-white/[0.07] bg-white/[0.03] text-[#9AA0A6] hover:bg-white/[0.07]'
            }`}
          >
            {o.label}
            {o.sub && <span className="num mt-0.5 block text-[11px] font-medium opacity-80">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Countdown({ target }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const s = Math.floor(ms / 1000);
  const parts = [
    ['D', Math.floor(s / 86400)],
    ['H', Math.floor((s % 86400) / 3600)],
    ['M', Math.floor((s % 3600) / 60)],
    ['S', s % 60],
  ];
  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Time until the next quarterly tax payment">
      {parts.map(([unit, n]) => (
        <span key={unit} className="num rounded-md border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 text-xs text-[#F3D27C]">
          {String(n).padStart(unit === 'D' ? 3 : 2, '0')}<span className="ml-0.5 text-[9px] text-[#5F6368]">{unit}</span>
        </span>
      ))}
    </div>
  );
}

function NodeShell({ children }) {
  return (
    <div className="node-shell h-full">
      <div className="node-body flex h-full flex-col p-4">{children}</div>
    </div>
  );
}

function Ring({ fraction, negative }) {
  const f = negative ? 0 : Math.max(0, Math.min(1, fraction));
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2B13C" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round" pathLength="100"
        stroke={negative ? '#F43F5E' : 'url(#ringGrad)'}
        strokeDasharray={`${negative ? 100 : f * 100} 100`}
        className="transition-all duration-500 ease-out motion-reduce:transition-none"
        style={{ filter: 'drop-shadow(0 0 6px rgba(226,177,60,0.5))' }}
      />
    </svg>
  );
}

/* ---------- node bodies ---------- */
function GrossBody({ gross, entity }) {
  return (
    <NodeShell>
      <Label>Gross inflow</Label>
      <p className="mt-2 text-2xl font-semibold text-[#F3D27C] sm:text-3xl"><SpringNumber value={gross} /></p>
      <p className="mt-1 text-xs text-[#9AA0A6]">per month</p>
      <div className="mt-auto space-y-1 border-t border-white/[0.07] pt-3 text-xs text-[#9AA0A6]">
        <p className="flex justify-between"><span>Entity</span><span className="text-[#F8F9FA]">{entity.label}</span></p>
        <p className="flex justify-between"><span>Overhead</span><span className="num text-[#F8F9FA]">{Math.round(entity.overhead * 100)}%</span></p>
      </div>
    </NodeShell>
  );
}

function TaxBody({ m, strategy, deadline }) {
  return (
    <NodeShell>
      <Label>Automated tax vault</Label>
      <p className="mt-2 text-2xl font-semibold text-[#F3D27C] sm:text-3xl"><SpringNumber value={m.tax} /></p>
      <p className="mt-1 text-xs text-[#9AA0A6]"><span className="num">{Math.round(strategy.rate * 100)}%</span> reserve, set aside first</p>
      <div className="mt-auto space-y-1 border-t border-white/[0.07] pt-3 text-xs text-[#9AA0A6]">
        <p className="flex justify-between"><span>{deadline.next.quarter} due</span><span className="num text-[#F8F9FA]">{fmtDate(deadline.next.date)}</span></p>
        <p className="flex justify-between"><span>Quarterly reserve</span><span className="num text-[#F8F9FA]"><SpringNumber value={m.quarterly} /></span></p>
        <p className="flex items-center gap-1.5 text-[#10B981]"><span className="pulse-dot" aria-hidden="true" />Tax guard active</p>
      </div>
    </NodeShell>
  );
}

function SalaryBody({ m }) {
  return (
    <NodeShell>
      <Label>Virtual salary engine</Label>
      <p className={`mt-2 text-2xl font-semibold sm:text-3xl ${m.salary < 0 ? 'text-[#F43F5E]' : 'text-[#F3D27C]'}`}><SpringNumber value={m.salary} /></p>
      <p className="mt-1 text-xs text-[#9AA0A6]">optimal monthly draw, before fixed costs</p>
      <div className="mt-auto space-y-1 border-t border-white/[0.07] pt-3 text-xs text-[#9AA0A6]">
        <p className="num text-[11px] text-[#E2B13C]">Gross − Tax − Retained</p>
        <p className="flex justify-between"><span>Retained capital</span><span className="num text-[#F8F9FA]"><SpringNumber value={m.retained} /></span></p>
      </div>
    </NodeShell>
  );
}

function SafeBody({ m, gross }) {
  const negative = m.safe < 0;
  const pct = gross > 0 ? Math.round((Math.max(m.safe, 0) / gross) * 100) : 0;
  return (
    <NodeShell>
      <Label>Unlocked safe-to-spend</Label>
      <div className="mt-2 flex flex-1 items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
          <Ring fraction={gross > 0 ? m.safe / gross : 0} negative={negative} />
          <div className="absolute inset-0 grid place-items-center">
            <span className="num text-sm font-semibold text-[#F8F9FA]">{negative ? '!' : `${pct}%`}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className={`text-xl font-semibold sm:text-2xl ${negative ? 'text-[#F43F5E]' : 'text-[#10B981]'}`}><SpringNumber value={m.safe} /></p>
          <p className="mt-1 text-xs text-[#9AA0A6]">{negative ? 'Shortfall: costs exceed inflow' : 'real spending power'}</p>
        </div>
      </div>
      <p className="num border-t border-white/[0.07] pt-3 text-[11px] text-[#E2B13C]">Gross − Tax − Runway − Fixed</p>
    </NodeShell>
  );
}

/* ---------- tracer ---------- */
function Tracer({ id, d, width, dur, animate }) {
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(226,177,60,0.22)" strokeWidth={width + 5} strokeLinecap="round" style={{ transition: 'stroke-width 0.3s' }} />
      <path
        id={id}
        d={d}
        fill="none"
        stroke="url(#traceGrad)"
        strokeWidth={width}
        strokeLinecap="round"
        filter="url(#traceGlow)"
        className="tracer"
        style={{ animationDuration: `${dur}s`, transition: 'stroke-width 0.3s' }}
      />
      {animate &&
        [0, 1].map((i) => (
          <circle key={i} r="5" fill="#FFD666" style={{ filter: 'drop-shadow(0 0 6px #FFD666)' }}>
            <animateMotion dur={`${(dur * 2).toFixed(2)}s`} begin={`${-i * dur}s`} repeatCount="indefinite">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        ))}
    </g>
  );
}

const pctOf = (n, total) => `${(n / total) * 100}%`;
const boxStyle = (b) => ({ left: pctOf(b.x, VB_W), top: pctOf(b.y, VB_H), width: pctOf(b.w, VB_W), height: pctOf(b.h, VB_H) });

/* ---------- main component ---------- */
export default function OsCanvas() {
  const reduce = useReducedMotion();
  const t = useSandbox((st) => st.t);
  const entityId = useSandbox((st) => st.entityId);
  const strategyId = useSandbox((st) => st.strategyId);
  const runwayIdx = useSandbox((st) => st.runwayIdx);
  const setT = useSandbox((st) => st.setT);
  const setEntityId = useSandbox((st) => st.setEntity);
  const setStrategyId = useSandbox((st) => st.setStrategy);
  const setRunwayIdx = useSandbox((st) => st.setRunway);

  const gross = fromSlider(t);
  const entity = ENTITIES.find((e) => e.id === entityId);
  const strategy = STRATEGIES.find((s) => s.id === strategyId);
  const months = RUNWAYS[runwayIdx];
  const m = useMemo(() => compute(gross, entity, strategy, months), [gross, entity, strategy, months]);
  const deadline = useMemo(() => nextDeadline(new Date()), []);
  const target = useMemo(() => {
    const d = deadline.next.date;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
  }, [deadline]);

  const dur = 3.4 - (t / STEPS) * 2.2; // busier inflow, faster tracers
  const share = (n) => Math.max(0, Math.min(1, n / gross));
  const widths = { inflow: 3 + 15 * share(m.tax), salary: 3 + 15 * share(m.salary), safe: 3 + 15 * share(Math.max(m.safe, 0)) };
  const sym = currencySymbol();

  return (
    <section aria-label="Interactive financial sandbox" className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#070708] text-[#F8F9FA] shadow-depth" style={{ '--range-track': 'rgba(255,255,255,0.1)' }}>
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#E2B13C]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#10B981]/[0.07] blur-3xl" aria-hidden="true" />

      {/* Glassmorphic status bar */}
      <header className="glass relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9AA0A6]">
          <span className="pulse-dot" aria-hidden="true" />
          System live // local-first synced
        </p>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9AA0A6] sm:inline">Next {deadline.next.quarter} tax payment</span>
          <Countdown target={target} />
        </div>
      </header>

      {/* Control dock */}
      <div className="relative z-10 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
        <div className="glass rounded-2xl p-4">
          <Label>Gross monthly inflow</Label>
          <p className="mt-1 text-2xl font-semibold text-[#F3D27C]"><SpringNumber value={gross} /></p>
          <label htmlFor="os-gross" className="sr-only">Gross monthly inflow, from {sym}5,000 to {sym}500,000</label>
          <input
            id="os-gross"
            type="range"
            min="0"
            max={STEPS}
            step="1"
            value={t}
            onChange={(e) => setT(Number(e.target.value))}
            className="royal-range mt-2"
            style={{ '--pct': `${(t / STEPS) * 100}%` }}
            aria-valuetext={usd(gross)}
          />
          <div className="num flex justify-between text-[10px] text-[#5F6368]"><span>{usd(MIN)}</span><span>{usd(MAX)}</span></div>
        </div>

        <div className="glass rounded-2xl p-4">
          <Label>Business entity</Label>
          <div className="mt-2.5"><Segmented label="Business entity" value={entityId} onChange={setEntityId} options={ENTITIES} columns="grid-cols-2" /></div>
        </div>

        <div className="glass rounded-2xl p-4">
          <Label>Tax strategy</Label>
          <div className="mt-2.5">
            <Segmented label="Tax strategy" value={strategyId} onChange={setStrategyId} options={STRATEGIES.map((s) => ({ id: s.id, label: s.label, sub: `${Math.round(s.rate * 100)}%` }))} columns="grid-cols-3" />
          </div>
          <p className="mt-2 text-[10px] leading-snug text-[#5F6368]">Reserve rate for planning, not a tax opinion.</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <Label>Target runway</Label>
          <p className="mt-1 text-2xl font-semibold text-[#F3D27C]"><span className="num">{months}</span> <span className="text-sm font-medium text-[#9AA0A6]">months</span></p>
          <label htmlFor="os-runway" className="sr-only">Target runway in months</label>
          <input
            id="os-runway"
            type="range"
            min="0"
            max={RUNWAYS.length - 1}
            step="1"
            value={runwayIdx}
            onChange={(e) => setRunwayIdx(Number(e.target.value))}
            className="royal-range mt-2"
            style={{ '--pct': `${(runwayIdx / (RUNWAYS.length - 1)) * 100}%` }}
            aria-valuetext={`${months} months`}
          />
          <div className="num flex justify-between text-[10px] text-[#5F6368]">{RUNWAYS.map((r) => <span key={r}>{r} mo</span>)}</div>
        </div>
      </div>

      {/* Cashflow tracer canvas (wide screens) */}
      <div className="relative z-10 hidden px-6 pb-6 lg:block">
        <div className="relative w-full" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="traceGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0">
                <stop offset="0%" stopColor="#F3D27C" />
                <stop offset="50%" stopColor="#FFD666" />
                <stop offset="100%" stopColor="#E2B13C" />
              </linearGradient>
              <filter id="traceGlow" filterUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <Tracer id="tr-inflow" d={PATHS.inflow} width={widths.inflow} dur={dur} animate={!reduce} />
            <Tracer id="tr-salary" d={PATHS.salary} width={widths.salary} dur={dur} animate={!reduce} />
            <Tracer id="tr-safe" d={PATHS.safe} width={widths.safe} dur={dur} animate={!reduce} />
          </svg>
          <div className="absolute" style={boxStyle(BOX.gross)}><GrossBody gross={gross} entity={entity} /></div>
          <div className="absolute" style={boxStyle(BOX.tax)}><TaxBody m={m} strategy={strategy} deadline={deadline} /></div>
          <div className="absolute" style={boxStyle(BOX.salary)}><SalaryBody m={m} /></div>
          <div className="absolute" style={boxStyle(BOX.safe)}><SafeBody m={m} gross={gross} /></div>
        </div>
      </div>

      {/* Stacked flow (small screens) */}
      <div className="relative z-10 space-y-3 px-4 pb-6 lg:hidden">
        {[<GrossBody key="g" gross={gross} entity={entity} />, <TaxBody key="t" m={m} strategy={strategy} deadline={deadline} />, <SalaryBody key="s" m={m} />, <SafeBody key="f" m={m} gross={gross} />].map((node, i) => (
          <div key={node.key}>
            {i > 0 && <div className="mx-auto mb-3 h-6 w-px bg-gradient-to-b from-[#E2B13C]/70 to-transparent" aria-hidden="true" />}
            <div className="min-h-[11rem]">{node}</div>
          </div>
        ))}
      </div>

      <p className="relative z-10 border-t border-white/[0.07] px-6 py-3 text-[11px] leading-relaxed text-[#5F6368]">
        Illustrative model: tax = gross × strategy rate; retained capital = fixed costs × runway ÷ 12. Not tax or financial advice.
      </p>
      <p className="sr-only" aria-live="polite">
        At {usd(gross)} gross a month, the tax vault holds {usd(m.tax)}, the virtual salary is {usd(m.salary)}, and safe to spend is {usd(m.safe)}.
      </p>
    </section>
  );
}

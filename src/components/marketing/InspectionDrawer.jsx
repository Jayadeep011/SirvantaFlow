// src/components/marketing/InspectionDrawer.jsx
// Deep-dive side drawer for one waterfall stage: formula, 12-month sparkline,
// variance gauge and a live audit trail of recent calculations.

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCw, X } from 'lucide-react';
import { usd } from '../../finance';
import { BILL_RATE, HIST, buildSeries, fmtTime, mean, moduleValue, stdDev, useSandbox, useSandboxModel } from '../../sandbox';
import { MODULES, STAGES, fmtValue } from './waterfallModules';
import SpringNumber from './SpringNumber';

const Section = ({ title, children }) => (
  <section className="border-t border-white/[0.07] px-6 py-5">
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA0A6]">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

/* ---------- 12-month sparkline: solid = history, dashed = projection ---------- */
function Sparkline({ points, fmtKey }) {
  const W = 360;
  const H = 120;
  const pad = { l: 8, r: 8, t: 12, b: 20 };
  const values = points.map((p) => p.v);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);
  const path = (from, to) => points.slice(from, to + 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(from + i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${path(0, HIST - 1)} L ${x(HIST - 1).toFixed(1)} ${H - pad.b} L ${x(0).toFixed(1)} ${H - pad.b} Z`;
  const last = points[HIST - 1];
  const end = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Twelve month trend. Current ${fmtValue(fmtKey, last.v)}, projected end ${fmtValue(fmtKey, end.v)}.`}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E2B13C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#E2B13C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={x(HIST - 1)} y={pad.t - 6} width={x(points.length - 1) - x(HIST - 1)} height={H - pad.t - pad.b + 6} fill="rgba(255,255,255,0.03)" />
        <line x1={x(HIST - 1)} x2={x(HIST - 1)} y1={pad.t - 6} y2={H - pad.b} stroke="rgba(226,177,60,0.35)" strokeDasharray="3 3" />
        <path d={area} fill="url(#sparkFill)" />
        <path d={path(0, HIST - 1)} fill="none" stroke="#FFD666" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(255,214,102,0.6))' }} />
        <path d={path(HIST - 1, points.length - 1)} fill="none" stroke="#F3D27C" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
        <circle cx={x(HIST - 1)} cy={y(last.v)} r="4" fill="#FFD666" />
        <circle cx={x(points.length - 1)} cy={y(end.v)} r="3" fill="none" stroke="#F3D27C" strokeWidth="1.5" />
        <text x={pad.l} y={H - 5} fontSize="9" fill="#5F6368">{points[0].label}</text>
        <text x={x(HIST - 1)} y={H - 5} fontSize="9" fill="#E2B13C" textAnchor="middle">Now</text>
        <text x={W - pad.r} y={H - 5} fontSize="9" fill="#5F6368" textAnchor="end">{end.label}</text>
      </svg>
      <div className="num mt-1 flex justify-between text-[11px] text-[#9AA0A6]">
        <span>Low {fmtValue(fmtKey, lo)}</span>
        <span>High {fmtValue(fmtKey, hi)}</span>
      </div>
      <p className="mt-1 flex items-center gap-4 text-[11px] text-[#5F6368]">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#FFD666]" />History</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-[#F3D27C]/70" />Projected</span>
      </p>
    </div>
  );
}

/* ---------- variance gauge: standard deviation and margin volatility ---------- */
const ARC = 'M 20 80 A 60 60 0 0 1 140 80';
const SCALE = 0.4; // a coefficient of variation of 40% fills the dial

function VarianceGauge({ history, margins }) {
  const reduce = useReducedMotion();
  const avg = mean(history);
  const sd = stdDev(history);
  const cv = avg !== 0 ? Math.abs(sd / avg) : 0;
  const marginPp = stdDev(margins) * 100;
  const f = Math.min(1, cv / SCALE);
  const angle = -90 + 180 * f;
  const zone = cv < 0.1 ? ['Calm', '#10B981'] : cv < 0.2 ? ['Moderate', '#F59E0B'] : ['Volatile', '#F43F5E'];
  const seg = (start, len, color) => (
    <path d={ARC} fill="none" stroke={color} strokeWidth="10" pathLength="100" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-start} opacity="0.85" />
  );

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 160 96" className="w-44 shrink-0" role="img" aria-label={`Variance gauge: ${(cv * 100).toFixed(1)} percent, ${zone[0]}`}>
        <path d={ARC} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" pathLength="100" />
        {seg(0, 25, '#10B981')}
        {seg(25, 25, '#F59E0B')}
        {seg(50, 50, '#F43F5E')}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '80px 80px', transition: reduce ? 'none' : 'transform 0.6s cubic-bezier(.2,.9,.3,1.2)' }}>
          <line x1="80" y1="80" x2="80" y2="30" stroke="#FFD666" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="80" cy="80" r="5" fill="#0E0E11" stroke="#FFD666" strokeWidth="2" />
      </svg>
      <dl className="space-y-1.5 text-xs">
        <div><dt className="text-[#5F6368]">Standard deviation (σ)</dt><dd className="num text-sm text-[#F8F9FA]">{usd(sd)}</dd></div>
        <div><dt className="text-[#5F6368]">Coefficient of variation</dt><dd className="num text-sm" style={{ color: zone[1] }}>{(cv * 100).toFixed(1)}% · {zone[0]}</dd></div>
        <div><dt className="text-[#5F6368]">Margin volatility</dt><dd className="num text-sm text-[#F8F9FA]">{marginPp.toFixed(1)} pp</dd></div>
      </dl>
    </div>
  );
}

/* ---------- audit trail ---------- */
function AuditTrail({ moduleKey }) {
  const log = useSandbox((s) => s.log);
  const rows = useMemo(() => log.filter((e) => e.key === moduleKey).slice(-5).reverse(), [log, moduleKey]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left text-[11px]">
        <caption className="sr-only">Most recent calculations for this stage</caption>
        <thead className="text-[#5F6368]">
          <tr><th scope="col" className="pb-2 pr-3 font-medium">Time</th><th scope="col" className="pb-2 pr-3 font-medium">Operation</th><th scope="col" className="pb-2 text-right font-medium">Result</th></tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="row-flash border-t border-white/[0.06]">
              <td className="num whitespace-nowrap py-1.5 pr-3 text-[#9AA0A6]">{fmtTime(e.ts)}</td>
              <td className="py-1.5 pr-3 text-[#D4D4D8]"><span className="num">{MODULES[moduleKey].audit(e)}</span><span className="block text-[10px] text-[#5F6368]">{e.reason}</span></td>
              <td className="num py-1.5 text-right text-[#F3D27C]">{fmtValue(moduleKey, e.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- drawer ---------- */
export default function InspectionDrawer({ moduleKey, onClose }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const replay = useSandbox((s) => s.replay);
  const model = useSandboxModel();
  const info = MODULES[moduleKey];
  const stage = STAGES.find((s) => s.key === moduleKey);

  const series = useMemo(() => buildSeries(model.gross, model.entity, model.strategy, model.months), [model.gross, model.entity, model.strategy, model.months]);
  const point = series[HIST - 1];
  const points = series.map((p) => ({ v: moduleValue(moduleKey, p), label: p.label }));
  const history = points.slice(0, HIST).map((p) => p.v);
  const margins = series.slice(0, HIST).map((p) => (moduleKey === 'yield' ? p.ehr / BILL_RATE : p.gross > 0 ? moduleValue(moduleKey, p) / p.gross : 0));
  const ctx = { gross: model.gross, rate: model.strategy.rate, overhead: model.entity.overhead, months: model.months, m: model.m, point };
  const value = moduleValue(moduleKey, point);

  // Log one calculation each time a stage is inspected, so the audit trail always has a fresh entry.
  useEffect(() => { replay(); }, [moduleKey, replay]);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${info.title} inspection`}
        initial={{ x: reduce ? 0 : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: reduce ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className="glass-strong absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto text-[#F8F9FA] sm:max-w-lg"
        style={{ boxShadow: '-30px 0 60px -20px rgba(0,0,0,0.8)' }}
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-5 pt-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E2B13C]">Inspection · {stage.caption}</p>
            <h2 className="font-display mt-1 text-4xl">{info.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#9AA0A6]">{info.blurb}</p>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close inspection panel" className="rounded-lg border border-white/10 p-2 text-[#9AA0A6] hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666]"><X size={18} /></button>
        </header>

        <div className="px-6 pb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA0A6]">Current value</p>
          <p className="mt-1 text-4xl font-semibold text-[#F3D27C]"><SpringNumber value={value} format={(v) => fmtValue(moduleKey, v)} /></p>
        </div>

        <Section title="Formula disclosure">
          <div className="rounded-xl border border-[#E2B13C]/25 bg-[#E2B13C]/[0.06] p-4">
            <pre className="num whitespace-pre-wrap text-[13px] leading-relaxed text-[#F3D27C]">{info.formula}</pre>
            <div className="gold-divider my-3" />
            <pre className="num whitespace-pre-wrap text-[12px] leading-relaxed text-[#E2B13C]">{info.now(ctx)}</pre>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            {info.vars.map(([sym, meaning]) => (
              <React.Fragment key={sym}><dt className="num text-[#F3D27C]">{sym}</dt><dd className="text-[#9AA0A6]">{meaning}</dd></React.Fragment>
            ))}
          </dl>
        </Section>

        <Section title="12-month trend"><Sparkline points={points} fmtKey={moduleKey} /></Section>
        <Section title="Historical variance"><VarianceGauge history={history} margins={margins} /></Section>

        <Section title="Real-time audit trail">
          <AuditTrail moduleKey={moduleKey} />
          <button onClick={replay} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-[#F3D27C] hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666]">
            <RotateCw size={13} aria-hidden="true" />Recalculate now
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-[#5F6368]">Every control you move on this page runs a calculation and logs it here with a millisecond timestamp. Figures are an illustrative model, not advice.</p>
        </Section>
      </motion.aside>
    </div>
  );
}


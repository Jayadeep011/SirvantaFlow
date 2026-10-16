// src/components/TaxCharts.jsx
// Phase 5 Tax Vault visuals:
//   - TaxTimeline: Gantt-style Q1 to Q4 schedule with income periods, due dates, reserve milestones,
//     and a live Days : Hours : Mins : Secs countdown for the selected payment.
//   - TaxLayers: stacked chart of federal, self-employment, state and local layers per quarter.

import React, { useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store';
import { usd, usdCompact } from '../finance';
import { calcReserve, daysUntil, fmtDate } from '../tax';
import LiveBadge from './LiveBadge';
import { CARD_GOLD, CARD_BLUE, MUTED, DIVIDER, TINT_GOLD } from '../ui';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J'];

/** Live countdown to the end of a deadline day. */
export function LiveCountdown({ date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime();
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const parts = [['Days', Math.floor(s / 86400)], ['Hours', Math.floor((s % 86400) / 3600)], ['Mins', Math.floor((s % 3600) / 60)], ['Secs', s % 60]];
  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Time left until this payment is due">
      {parts.map(([unit, n], i) => (
        <React.Fragment key={unit}>
          {i > 0 && <span className="num text-slate-400 dark:text-[#5F6368]" aria-hidden="true">:</span>}
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center dark:border-white/[0.07] dark:bg-white/[0.04]">
            <span className="num block text-lg font-bold leading-none text-[#7A5A17] dark:text-[#F3D27C]">{String(n).padStart(unit === 'Days' ? 3 : 2, '0')}</span>
            <span className="label-caps mt-1 block !text-[9px]">{unit}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function periodsFor(year) {
  return [
    { q: 'Q1', label: 'Jan to Mar', start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59) },
    { q: 'Q2', label: 'Apr to May', start: new Date(year, 3, 1), end: new Date(year, 4, 31, 23, 59, 59) },
    { q: 'Q3', label: 'Jun to Aug', start: new Date(year, 5, 1), end: new Date(year, 7, 31, 23, 59, 59) },
    { q: 'Q4', label: 'Sep to Dec', start: new Date(year, 8, 1), end: new Date(year, 11, 31, 23, 59, 59) },
  ];
}

const STATUS = {
  accumulating: { text: 'Accumulating now', bar: 'from-[#E2B13C] to-[#FFD666] animate-pulse motion-reduce:animate-none', chip: 'text-[#7A5A17] dark:text-[#F3D27C]' },
  due: { text: 'Reserve due', bar: 'from-[#F59E0B] to-[#E2B13C]', chip: 'text-amber-700 dark:text-amber-300' },
  paid: { text: 'Due date passed', bar: 'from-slate-400 to-slate-300 dark:from-zinc-600 dark:to-zinc-500', chip: 'text-slate-500 dark:text-[#9AA0A6]' },
  upcoming: { text: 'Upcoming', bar: 'from-[#5B8DEF]/60 to-[#5B8DEF]/30', chip: 'text-blue-700 dark:text-blue-300' },
};

function statusOf(period, deadline, now) {
  if (deadline.date < now && now > period.end) return 'paid';
  if (now > period.end) return 'due';
  if (now >= period.start) return 'accumulating';
  return 'upcoming';
}

export function TaxTimeline({ calendar, byQuarter, rates }) {
  const periods = useMemo(() => periodsFor(calendar.taxYear), [calendar.taxYear]);
  const axisStart = new Date(calendar.taxYear, 0, 1).getTime();
  const axisEnd = new Date(calendar.taxYear + 1, 0, 31, 23, 59, 59).getTime();
  const pos = (d) => Math.max(0, Math.min(100, ((d.getTime() - axisStart) / (axisEnd - axisStart)) * 100));
  const now = new Date();
  const todayPos = pos(now);
  const [selected, setSelected] = useState(() => Math.max(0, calendar.all.indexOf(calendar.next)));

  const rows = periods.map((p, i) => {
    const income = byQuarter[i] || 0;
    const reserve = calcReserve(income, rates).total;
    return { ...p, income, reserve, deadline: calendar.all[i], status: statusOf(p, calendar.all[i], now) };
  });
  let running = 0;
  rows.forEach((r) => { running += r.reserve; r.cumulative = running; });
  const sel = rows[selected];
  const left = daysUntil(sel.deadline.date);

  return (
    <section className={`${CARD_GOLD} p-6`} aria-labelledby="tl-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-3"><span className="label-caps">Quarterly schedule</span><LiveBadge tone={left <= 14 && left >= 0 ? 'amber' : 'emerald'}>{left <= 14 && left >= 0 ? 'Payment due soon' : 'Tax guard active'}</LiveBadge></p>
          <h2 id="tl-title" className="mt-1 text-lg font-semibold">Tax year {calendar.taxYear} timeline</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>Bars are the income periods. Diamonds are payment due dates. Select a row for the details.</p>
        </div>
        <div className="text-right">
          <p className="label-caps mb-1.5">{sel.q} payment · {fmtDate(sel.deadline.date)}</p>
          {left >= 0 ? <LiveCountdown date={sel.deadline.date} /> : <p className={`text-sm ${MUTED}`}>This deadline has passed.</p>}
        </div>
      </div>

      <div className="mt-6" role="group" aria-label="Quarterly payment schedule">
        <div className="grid grid-cols-[5.5rem_1fr] gap-3">
          <span />
          <div className="relative h-5">
            {MONTHS.map((m, i) => <span key={i} className="label-caps absolute -translate-x-1/2 !text-[10px]" style={{ left: `${(i / 12.97) * 100}%` }}>{m}</span>)}
          </div>
        </div>
        <div className="mt-1 space-y-2">
          {rows.map((r, i) => {
            const st = STATUS[r.status];
            const on = i === selected;
            return (
              <button
                key={r.q}
                onClick={() => setSelected(i)}
                aria-pressed={on}
                aria-label={`${r.q}: income ${r.label}, due ${fmtDate(r.deadline.date)}, ${st.text}`}
                className={`grid w-full grid-cols-[5.5rem_1fr] items-center gap-3 rounded-lg p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] ${on ? 'bg-[#E2B13C]/10 ring-1 ring-[#E2B13C]/40' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
              >
                <span>
                  <span className="num block text-sm font-bold">{r.q}</span>
                  <span className={`block text-[11px] ${MUTED}`}>{r.label}</span>
                </span>
                <span className="relative block h-9 overflow-hidden rounded-md bg-slate-100 dark:bg-white/[0.04]">
                  <span className={`absolute inset-y-1.5 rounded bg-gradient-to-r ${st.bar}`} style={{ left: `${pos(r.start)}%`, width: `${Math.max(1, pos(r.end) - pos(r.start))}%` }} />
                  <span className="num absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-900 dark:text-[#F8F9FA]" style={{ left: `${pos(r.start) + 1}%` }}>{r.income > 0 ? `${usdCompact(r.reserve)} reserve` : ''}</span>
                  <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/60 bg-[#E2B13C] shadow-[0_0_10px_rgba(226,177,60,0.8)]" style={{ left: `${pos(r.deadline.date)}%` }} aria-hidden="true" />
                  <span className="absolute inset-y-0 w-px bg-[#F43F5E]" style={{ left: `${todayPos}%` }} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
        <p className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] ${MUTED}`}>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-[#E2B13C]" />Due date</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-[#F43F5E]" />Today</span>
          <span>Reserve = the period&apos;s income × your combined rate</span>
        </p>
      </div>

      <dl className={`mt-5 grid gap-3 border-t pt-4 sm:grid-cols-4 ${DIVIDER}`} aria-live="polite">
        {[
          ['Income in period', usd(sel.income)],
          ['Reserve for period', usd(sel.reserve)],
          ['Cumulative reserve', usd(sel.cumulative)],
          ['Status', null],
        ].map(([k, v]) => (
          <div key={k} className={`rounded-lg p-3 ${TINT_GOLD}`}>
            <dt className="label-caps">{k}</dt>
            <dd className={`mt-1 ${v === null ? `text-sm font-semibold ${STATUS[sel.status].chip}` : 'num text-lg font-bold'}`}>{v === null ? `${STATUS[sel.status].text}${left >= 0 ? ` · ${left}d to due date` : ''}` : v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const LAYERS = [
  { key: 'federal', label: 'Federal', color: '#E2B13C' },
  { key: 'selfEmployment', label: 'Self-employment', color: '#F59E0B' },
  { key: 'state', label: 'State', color: '#5B8DEF' },
  { key: 'local', label: 'Local', color: '#8B83F0' },
];

function LayerTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="glass-strong rounded-lg px-3 py-2.5 text-xs text-[#F8F9FA] shadow-xl">
      <p className="num mb-1.5 font-semibold text-[#F3D27C]">{label} · {usd(row.total)}</p>
      {LAYERS.filter((l) => row[l.key] > 0).map((l) => (
        <p key={l.key} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.label}</span>
          <span className="num">{usd(row[l.key])} · {row.total > 0 ? Math.round((row[l.key] / row.total) * 100) : 0}%</span>
        </p>
      ))}
      <p className="num mt-1 border-t border-white/10 pt-1.5 text-[#10B981]">Cumulative {usd(row.cumulative)}</p>
    </div>
  );
}

export function TaxLayers({ byQuarter, rates }) {
  const darkMode = useStore((s) => s.darkMode);
  let running = 0;
  const data = ['Q1', 'Q2', 'Q3', 'Q4'].map((name, i) => {
    const r = calcReserve(byQuarter[i] || 0, rates);
    running += r.total;
    return { name, federal: r.federal, selfEmployment: r.selfEmployment, state: r.state, local: r.local, total: r.total, cumulative: running };
  });
  const empty = running === 0;
  const axis = darkMode ? '#9AA0A6' : '#64748B';
  const grid = darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0';

  return (
    <section className={`${CARD_BLUE} p-6`} aria-labelledby="layers-title">
      <p className="label-caps">Reserve build-up</p>
      <h2 id="layers-title" className="mt-1 text-lg font-semibold">Tax reserve layers</h2>
      <p className={`mt-1 text-sm ${MUTED}`}>Each column is one quarter&apos;s reserve, stacked by tax layer. The green line is the running total. Hover for the exact split.</p>

      {empty ? (
        <p className={`mt-6 rounded-lg p-4 text-sm ${TINT_GOLD}`}>No business income is recorded for this tax year yet, so there is nothing to layer. Import a statement or load the sandbox data to see it.</p>
      ) : (
        <div className="mt-5 h-72 w-full" role="img" aria-label="Stacked chart of tax reserve by quarter and layer">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: axis, fontSize: 12 }} axisLine={{ stroke: grid }} tickLine={false} />
              <YAxis tickFormatter={usdCompact} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<LayerTooltip />} cursor={{ fill: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }} />
              {LAYERS.map((l) => <Bar key={l.key} dataKey={l.key} stackId="reserve" fill={l.color} radius={l.key === 'local' ? [4, 4, 0, 0] : 0} maxBarSize={64} />)}
              <Line type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 4, fill: '#10B981' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {LAYERS.map((l) => <li key={l.key} className={`flex items-center gap-1.5 ${MUTED}`}><span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />{l.label}</li>)}
        <li className={`flex items-center gap-1.5 ${MUTED}`}><span className="h-0.5 w-4 border-t-2 border-dashed border-[#10B981]" />Running total</li>
      </ul>
    </section>
  );
}

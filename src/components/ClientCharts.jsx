// src/components/ClientCharts.jsx
// Phase 5 Client ROI visuals:
//   - ClientHeatmap: Client vs Hours invested vs Net yield, as a colour-coded grid.
//   - YieldScatter: Invoice volume (x) against realized hourly margin (y), with a ledger popover on hover.

import React from 'react';
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store';
import { usd, usdCompact } from '../finance';
import { EHR_HIGH, EHR_TARGET, ehrTier, scopeCreepShare, totalHours } from '../clients';
import { MUTED, DIVIDER } from '../ui';

const EMERALD = '16,185,129';
const ROSE = '244,63,94';
const GOLD = '226,177,60';
const BLUE = '91,141,239';
const AMBER = '245,158,11';
const rgba = (rgb, a) => `rgba(${rgb}, ${Math.max(0.08, Math.min(0.75, a)).toFixed(2)})`;
const clamp01 = (n) => Math.max(0, Math.min(1, n));

const TIER_LABEL = { high: 'High margin', target: 'Target margin', toxic: 'Toxic low margin' };
const TIER_COLOR = { high: '#10B981', target: '#E2B13C', toxic: '#F43F5E' };

function yieldHeat(ehr) {
  const t = ehrTier(ehr);
  if (t === 'toxic') return rgba(ROSE, 0.2 + 0.45 * clamp01((EHR_TARGET - ehr) / EHR_TARGET));
  if (t === 'target') return rgba(GOLD, 0.2 + 0.3 * clamp01((ehr - EHR_TARGET) / (EHR_HIGH - EHR_TARGET)));
  return rgba(EMERALD, 0.25 + 0.4 * clamp01((ehr - EHR_HIGH) / 100));
}

function marginOf(c) {
  const rev = Number(c.monthlyRetainer) || 0;
  return rev > 0 ? (rev - (Number(c.directCosts) || 0)) / rev : 0;
}

/* ---------- heatmap ---------- */
export function ClientHeatmap({ clients }) {
  const maxHours = Math.max(1, ...clients.map(totalHours));
  const columns = [
    { key: 'hours', label: 'Hours invested', value: (c) => `${totalHours(c)} h`, heat: (c) => rgba(BLUE, 0.15 + 0.5 * (totalHours(c) / maxHours)) },
    { key: 'yield', label: 'Net yield', value: (c) => `${usd(c.ehr)}/hr`, heat: (c) => yieldHeat(c.ehr), strong: true },
    { key: 'margin', label: 'Margin', value: (c) => `${Math.round(marginOf(c) * 100)}%`, heat: (c) => rgba(EMERALD, 0.12 + 0.5 * clamp01(marginOf(c))) },
    { key: 'creep', label: 'Scope creep', value: (c) => `${Math.round(scopeCreepShare(c) * 100)}%`, heat: (c) => rgba(ROSE, 0.1 + 0.55 * clamp01(scopeCreepShare(c) / 0.5)) },
    { key: 'delay', label: 'Pays in', value: (c) => `${c.avgPaymentDelayDays} d`, heat: (c) => rgba(AMBER, 0.1 + 0.55 * clamp01(c.avgPaymentDelayDays / 60)) },
  ];

  return (
    <div className="mt-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-left text-sm">
          <caption className="sr-only">Client profitability heatmap: hours invested, net yield, margin, scope creep and payment delay</caption>
          <thead>
            <tr>
              <th scope="col" className="label-caps px-2 pb-1 font-semibold">Client</th>
              {columns.map((col) => <th key={col.key} scope="col" className="label-caps px-2 pb-1 text-center font-semibold">{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <th scope="row" className="whitespace-nowrap px-2 py-2 font-semibold">
                  {c.name}
                  <span className="mt-0.5 block text-[10px] font-medium" style={{ color: TIER_COLOR[ehrTier(c.ehr)] }}>{TIER_LABEL[ehrTier(c.ehr)]}</span>
                </th>
                {columns.map((col) => (
                  <td key={col.key} className={`num rounded-md px-2 py-2 text-center ${col.strong ? 'text-[13px] font-bold' : 'text-xs font-medium'}`} style={{ background: col.heat(c) }}>
                    {col.value(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={`mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] ${MUTED}`}>
        <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded" style={{ background: rgba(ROSE, 0.55) }} />Net yield under {usd(EHR_TARGET)}/hr</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded" style={{ background: rgba(GOLD, 0.4) }} />{usd(EHR_TARGET)} to {usd(EHR_HIGH)}/hr</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-5 rounded" style={{ background: rgba(EMERALD, 0.5) }} />Over {usd(EHR_HIGH)}/hr</li>
        <li>Darker blue means more hours. The numbers are shown in every cell, so colour is never the only signal.</li>
      </ul>
    </div>
  );
}

/* ---------- scatter ---------- */
function LedgerPopover({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const c = d.client;
  const rows = [
    ['Monthly pay', usd(c.monthlyRetainer)],
    ['Billed hours', `${c.trackedHours} h`],
    ['Scope-creep hours', `${c.scopeCreepHours} h`],
    ['Direct expenses', usd(c.directCosts)],
    ['Pays in', `${c.avgPaymentDelayDays} days`],
    ['Target rate', c.hourlyRateTarget > 0 ? `${usd(c.hourlyRateTarget)}/hr` : 'Not set'],
    [d.fromRetainer ? 'Volume (monthly pay)' : `Invoiced (${d.invoiceCount})`, usd(d.x)],
  ];
  return (
    <div className="glass-strong w-64 rounded-xl p-3.5 text-xs text-[#F8F9FA] shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{c.name}</p>
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color: TIER_COLOR[d.tier], borderColor: `${TIER_COLOR[d.tier]}66` }}>{TIER_LABEL[d.tier]}</span>
      </div>
      <p className="num mt-2 text-2xl font-bold text-[#F3D27C]">{usd(d.y)}<span className="text-xs font-medium text-[#9AA0A6]">/hr</span></p>
      <dl className="mt-2 space-y-1 border-t border-white/10 pt-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="text-[#9AA0A6]">{k}</dt><dd className="num">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

export function YieldScatter({ clients, invoices }) {
  const darkMode = useStore((s) => s.darkMode);
  const points = clients.map((c) => {
    const mine = invoices.filter((i) => i.clientName === c.name);
    const invoiced = mine.reduce((s, i) => s + i.amount, 0);
    const fromRetainer = invoiced === 0;
    return { name: c.name, x: fromRetainer ? Number(c.monthlyRetainer) || 0 : invoiced, y: c.ehr, hours: totalHours(c), tier: ehrTier(c.ehr), client: c, fromRetainer, invoiceCount: mine.length };
  });
  const maxHours = Math.max(1, ...points.map((p) => p.hours));
  const axis = darkMode ? '#9AA0A6' : '#64748B';
  const grid = darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0';
  const yMax = Math.max(EHR_HIGH + 30, ...points.map((p) => p.y + 15));

  const Dot = (props) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const color = TIER_COLOR[payload.tier];
    return <circle cx={cx} cy={cy} r={7 + 10 * (payload.hours / maxHours)} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />;
  };

  return (
    <div className={`mt-8 border-t pt-6 ${DIVIDER}`}>
      <p className="label-caps">Yield scatter</p>
      <h3 className="mt-1 text-base font-semibold">Invoice volume against hourly margin</h3>
      <p className={`mt-1 text-sm ${MUTED}`}>Right means more money moved, up means more kept per hour. Bubble size is hours invested. Hover a bubble for the contract ledger.</p>
      <div className="mt-4 h-80 w-full" role="img" aria-label="Scatter plot of invoice volume against realized hourly margin for each client">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 24, left: 4, bottom: 8 }}>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Invoice volume" tickFormatter={usdCompact} tick={{ fill: axis, fontSize: 12 }} axisLine={{ stroke: grid }} tickLine={false} domain={[0, 'auto']} />
            <YAxis type="number" dataKey="y" name="Hourly margin" tickFormatter={(v) => `$${Math.round(v)}`} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, yMax]} width={48} />
            <ReferenceLine y={EHR_TARGET} stroke="#F43F5E" strokeDasharray="5 4" strokeOpacity={0.7} label={{ value: `${usd(EHR_TARGET)} floor`, fill: '#F43F5E', fontSize: 11, position: 'insideBottomRight' }} />
            <ReferenceLine y={EHR_HIGH} stroke="#10B981" strokeDasharray="5 4" strokeOpacity={0.7} label={{ value: `${usd(EHR_HIGH)} high margin`, fill: '#10B981', fontSize: 11, position: 'insideTopRight' }} />
            <Tooltip content={<LedgerPopover />} cursor={{ strokeDasharray: '3 3', stroke: axis }} wrapperStyle={{ outline: 'none' }} />
            <Scatter data={points} shape={Dot} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className={`mt-2 text-xs ${MUTED}`}>Volume is the total of each client&apos;s invoices. Clients with no invoices yet use their monthly pay.</p>
    </div>
  );
}

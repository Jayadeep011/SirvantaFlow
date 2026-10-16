// src/pages/app/SafeToSpend.jsx
// Safe-to-Spend Engine: concentric radial gauge, stress-testing sliders, inputs, allocation rules, 12-month simulator.

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { updateSettings, TIER_LIMITS } from '../../db';
import { tierAtLeast } from '../../plans';
import { dialSegments, calcSafeToSpend, usd } from '../../finance';
import useCashModel from '../../hooks/useCashModel';
import PageHeader from '../../components/PageHeader';
import LockedCard from '../../components/LockedCard';
import RadialGauge from '../../components/RadialGauge';
import { DeltaBadge } from '../../components/MetricCard';
import { SafeToSpendCard, LiquidityCard } from '../../components/CashFlowTab';
import { CARD_INDIGO, CARD_TEAL, MUTED, DIVIDER, TINT_INDIGO, BTN_OUTLINE } from '../../ui';
import SpringNumber from '../../components/marketing/SpringNumber';

/* ---------- stress testing ---------- */
function StressPanel({ drop, setDrop, purchase, setPurchase, calc }) {
  const { baseline, lostCover, stressed, cover } = calc;
  const change = baseline !== 0 ? ((stressed - baseline) / Math.abs(baseline)) * 100 : 0;
  const active = drop > 0 || purchase > 0;

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="stress-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps">Sandbox</p>
          <h2 id="stress-title" className="mt-1 text-lg font-semibold">Stress test</h2>
        </div>
        {active && <button onClick={() => { setDrop(0); setPurchase(0); }} className={`${BTN_OUTLINE} gap-1.5 !px-3 !py-1.5 !text-xs`}><RotateCcw size={13} aria-hidden="true" />Reset</button>}
      </div>
      <p className={`mt-1 text-sm ${MUTED}`}>Drag a slider and the gauge shrinks as it happens. Nothing is saved.</p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <label htmlFor="stress-drop" className="font-medium">Unexpected revenue drop</label>
          <span className="num font-semibold">{drop === 0 ? '0%' : `−${drop}%`}</span>
        </div>
        <input id="stress-drop" type="range" min="0" max="50" step="1" value={drop} onChange={(e) => setDrop(Number(e.target.value))} className="royal-range mt-1" style={{ '--pct': `${(drop / 50) * 100}%` }} aria-valuetext={`${drop} percent drop`} />
        <div className="mt-1 flex gap-2">
          {[10, 30, 50].map((v) => <button key={v} onClick={() => setDrop(v)} className="num rounded-md border border-slate-300 px-2 py-0.5 text-[11px] hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5">−{v}%</button>)}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <label htmlFor="stress-buy" className="font-medium">Major hardware purchase</label>
          <span className="num font-semibold"><SpringNumber value={purchase} /></span>
        </div>
        <input id="stress-buy" type="range" min="0" max="50000" step="500" value={purchase} onChange={(e) => setPurchase(Number(e.target.value))} className="royal-range mt-1" style={{ '--pct': `${(purchase / 50000) * 100}%` }} aria-valuetext={usd(purchase)} />
        <div className="mt-1 flex gap-2">
          {[3000, 10000, 25000].map((v) => <button key={v} onClick={() => setPurchase(v)} className="num rounded-md border border-slate-300 px-2 py-0.5 text-[11px] hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5"><SpringNumber value={v} /></button>)}
        </div>
      </div>

      <dl className={`mt-6 space-y-2 border-t pt-4 text-sm ${DIVIDER}`} aria-live="polite">
        <div className="flex justify-between"><dt className={MUTED}>Safe-to-spend today</dt><dd className="num font-semibold"><SpringNumber value={baseline} /></dd></div>
        <div className="flex justify-between"><dt className={MUTED}>Income cover removed</dt><dd className="num font-semibold text-amber-600 dark:text-amber-300">−{usd(lostCover)}</dd></div>
        <div className="flex justify-between"><dt className={MUTED}>Hardware purchase</dt><dd className="num font-semibold text-amber-600 dark:text-amber-300">−{usd(purchase)}</dd></div>
        <div className={`flex items-center justify-between border-t pt-2 ${DIVIDER}`}>
          <dt className="font-semibold">Stressed safe-to-spend</dt>
          <dd className="flex items-center gap-2">
            {active && baseline !== 0 && <DeltaBadge tone={stressed >= 0 ? 'warn' : 'down'}>{`${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(0)}%`}</DeltaBadge>}
            <span className={`num text-base font-bold ${stressed < 0 ? 'text-rose-600 dark:text-[#F43F5E]' : ''}`}><SpringNumber value={stressed} /></span>
          </dd>
        </div>
      </dl>

      <p className={`mt-4 rounded-lg p-3 text-sm ${stressed < 0 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : TINT_INDIGO}`}>
        {stressed < 0
          ? `This scenario leaves you ${usd(-stressed)} short. Delay the purchase, trim bills, or build more cover before committing.`
          : active
            ? `You stay ${usd(stressed)} above your reserves in this scenario.`
            : 'Move a slider to see how a bad month or a big purchase would change what is safe to spend.'}
      </p>
      <p className={`mt-3 text-xs leading-relaxed ${MUTED}`}>How it works: the baseline assumes next month&apos;s income, after tax ({usd(cover)}), covers next month&apos;s bills. A revenue drop removes that share of the cover, and a purchase comes straight off.</p>
    </section>
  );
}

/* ---------- allocation rules ---------- */
function AllocationCard({ inputs, setInputs, taxRate, canSave }) {
  const seg = dialSegments(inputs);
  const months = inputs.expenses > 0 ? Math.round((inputs.buffer / inputs.expenses) * 2) / 2 : 0;
  const setMonths = (m) => setInputs((p) => ({ ...p, buffer: Math.round(m * p.expenses) }));
  const persist = () => { if (canSave) updateSettings({ bufferTarget: inputs.buffer }).catch(() => {}); };

  const rules = [
    ['Taxes first', `Every payment sets aside ${(taxRate * 100).toFixed(1)}% before you can spend it.`],
    ['Bills second', `The next 30 days of fixed expenses (${usd(inputs.expenses)}) stay in cash.`],
    ['Buffer third', `An emergency buffer of ${months} ${months === 1 ? 'month' : 'months'} of expenses (${usd(inputs.buffer)}) is protected.`],
    ['Everything else is yours', 'Only the remainder shows up as safe to spend.'],
  ];

  return (
    <section className={`${CARD_INDIGO} p-6`} aria-labelledby="alloc-title">
      <p className="label-caps">Rules</p>
      <h2 id="alloc-title" className="mt-1 text-lg font-semibold">Allocation</h2>

      <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="img" aria-label="Cash allocation: tax, bills and buffer, safe">
        <div className="bg-[#D97706] transition-all" style={{ width: `${seg.tax}%` }} />
        <div className="bg-slate-500 transition-all dark:bg-zinc-500" style={{ width: `${seg.burn}%` }} />
        <div className="bg-[#16A34A] transition-all" style={{ width: `${seg.safe}%` }} />
      </div>
      <p className={`mt-2 text-xs ${MUTED}`}>Amber is locked for tax, grey is bills and buffer, green is safe to spend.</p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <label htmlFor="buffer-months" className="font-medium">Emergency buffer</label>
          <span className="num font-semibold">{months} {months === 1 ? 'month' : 'months'} · {usd(inputs.buffer)}</span>
        </div>
        <input id="buffer-months" type="range" min="0" max="12" step="0.5" value={months} onChange={(e) => setMonths(Number(e.target.value))} onPointerUp={persist} onKeyUp={persist} className="royal-range mt-1" style={{ '--pct': `${(months / 12) * 100}%` }} />
        <p className={`mt-1 text-xs ${MUTED}`}>Most freelancers aim for three to six months of expenses.</p>
      </div>

      <ol className="mt-6 space-y-3">
        {rules.map(([title, body], i) => (
          <li key={title} className={`flex gap-3 rounded-lg p-3 ${TINT_INDIGO}`}>
            <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#5B4FC4] text-xs font-bold text-white">{i + 1}</span>
            <span className="text-sm"><strong>{title}.</strong> <span className={MUTED}>{body}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function SafeToSpendPage() {
  const m = useCashModel();
  const canSave = TIER_LIMITS[m.userTier].canSaveData;
  const [drop, setDrop] = useState(0);
  const [purchase, setPurchase] = useState(0);
  const { inputs, taxRate, engine } = m;

  const baseline = calcSafeToSpend(inputs).safe;
  const cover = engine.avg * (1 - taxRate);
  const lostCover = cover * (drop / 100);
  const stressed = baseline - lostCover - purchase;
  const calc = { baseline, lostCover, stressed, cover };

  return (
    <div>
      <PageHeader title="Safe-to-Spend Engine" description="See exactly how much is free to spend after taxes, bills and your emergency buffer, then stress-test a bad month or a big purchase." />

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <section className={`${CARD_TEAL} p-6 xl:col-span-3`} aria-labelledby="gauge-title">
          <p className="label-caps">Spending power</p>
          <h2 id="gauge-title" className="mt-1 text-lg font-semibold">Concentric gauge</h2>
          <p className={`mb-5 mt-1 text-sm ${MUTED}`}>Each ring is a share of your cash. The faint gold arc marks where safe-to-spend started before stress.</p>
          <RadialGauge values={{ cash: inputs.cash, tax: inputs.tax, bills: inputs.expenses, buffer: inputs.buffer, safe: stressed }} baselineSafe={baseline} />
        </section>
        <div className="xl:col-span-2"><StressPanel drop={drop} setDrop={setDrop} purchase={purchase} setPurchase={setPurchase} calc={calc} /></div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <SafeToSpendCard inputs={inputs} setInputs={m.setInputs} taxRate={taxRate} canSave={canSave} entity={m.entity} showDial={false} />
        <AllocationCard inputs={inputs} setInputs={m.setInputs} taxRate={taxRate} canSave={canSave} />
      </div>

      <div className="mt-6">
        <LockedCard locked={!tierAtLeast(m.userTier, 'pro')} tier="pro" label="12-month liquidity simulator">
          <LiquidityCard start={inputs.cash - inputs.tax} monthlyInflow={engine.avg} expenses={inputs.expenses} draw={engine.draw} buffer={inputs.buffer} taxRate={taxRate} />
        </LockedCard>
      </div>
    </div>
  );
}

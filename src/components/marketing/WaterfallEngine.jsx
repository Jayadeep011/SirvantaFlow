// src/components/marketing/WaterfallEngine.jsx
// Phase 3: the Financial Architecture Waterfall. A horizontal flow of seven stages showing what happens
// to every dollar that comes in. Click any stage to open its inspection drawer.
// Values come from the same sandbox store as the hero, so moving a hero control updates this too.

import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usd } from '../../finance';
import { HIST, buildSeries, useSandboxModel } from '../../sandbox';
import { STAGES, remainingShare } from './waterfallModules';
import InspectionDrawer from './InspectionDrawer';
import SpringNumber from './SpringNumber';

const KIND = {
  source: { chip: 'Source', cls: 'text-[#F3D27C] border-[#E2B13C]/40' },
  deduct: { chip: 'Set aside', cls: 'text-[#F59E0B] border-[#F59E0B]/40' },
  result: { chip: 'Result', cls: 'text-[#10B981] border-[#10B981]/40' },
  insight: { chip: 'Insight', cls: 'text-[#8B83F0] border-[#8B83F0]/40' },
};

const stageValue = (key, m, gross) => ({ inflow: gross, tax: m.tax, retained: m.retained, salary: m.salary, fixed: m.fixed, safe: m.safe }[key]);

function Stage({ stage, index, value, left, onOpen }) {
  const kind = KIND[stage.kind];
  const isYield = stage.key === 'yield';
  const format = (v) => (isYield ? `${usd(v)}/hr` : stage.kind === 'deduct' ? `−${usd(v)}` : usd(v));
  const negative = !isYield && value < 0;

  return (
    <button
      onClick={(e) => onOpen(stage.key, e.currentTarget)}
      aria-haspopup="dialog"
      aria-label={`Inspect ${stage.label}`}
      className="stage node-shell min-w-[9.4rem] flex-1 text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666] motion-reduce:transform-none"
    >
      <span className="node-body flex min-h-[12rem] flex-col p-3.5">
        <span className="flex items-center justify-between">
          <span className="num text-[10px] text-[#5F6368]">0{index + 1}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${kind.cls}`}>{kind.chip}</span>
        </span>
        <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9AA0A6]">{stage.label}</span>
        <span className={`mt-1 text-xl font-semibold ${negative ? 'text-[#F43F5E]' : 'text-[#F3D27C]'}`}>
          <SpringNumber value={value} format={format} />
        </span>
        <span className="mt-1 text-[11px] text-[#9AA0A6]">{stage.caption}</span>
        <span className="mt-auto block pt-3">
          {left === null ? (
            <span className="text-[11px] text-[#5F6368]">Per billed hour</span>
          ) : (
            <>
              <span className="num mb-1 flex justify-between text-[10px] text-[#5F6368]"><span>Left</span><span>{Math.round(left * 100)}%</span></span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-[#E2B13C] to-[#10B981] transition-all duration-500 motion-reduce:transition-none" style={{ width: `${Math.min(100, left * 100)}%` }} />
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

function Bridge() {
  return (
    <div className="bridge" aria-hidden="true">
      <span className="bridge-line" />
      <span className="bridge-dot" />
    </div>
  );
}

function DollarBar({ m, gross }) {
  const parts = [
    ['Tax', m.tax, '#F59E0B'],
    ['Runway', m.retained, '#5B8DEF'],
    ['Fixed', m.fixed, '#64748B'],
    ['Safe', Math.max(m.safe, 0), '#10B981'],
  ];
  const total = parts.reduce((a, [, v]) => a + v, 0) || 1;
  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA0A6]">Where each dollar goes</p>
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label={parts.map(([n, v]) => `${n} ${Math.round((v / total) * 100)} percent`).join(', ')}>
        {parts.map(([n, v, c]) => <div key={n} className="h-full transition-all duration-500 motion-reduce:transition-none" style={{ width: `${(v / total) * 100}%`, background: c }} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
        {parts.map(([n, v, c]) => (
          <li key={n} className="flex items-center gap-2 text-xs text-[#9AA0A6]">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} aria-hidden="true" />{n}
            <span className="num text-[#F8F9FA]">{gross > 0 ? Math.round((v / gross) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
      {m.safe < 0 && <p className="mt-3 text-xs text-[#F43F5E]">Costs exceed inflow by {usd(-m.safe)} at these settings, so nothing is left to spend.</p>}
    </div>
  );
}

export default function WaterfallEngine() {
  const { gross, m, entity, strategy, months } = useSandboxModel();
  const [open, setOpen] = useState(null);
  const triggerRef = useRef(null);

  const openStage = (key, el) => {
    triggerRef.current = el;
    setOpen(key);
  };
  const close = () => {
    setOpen(null);
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  // Client yield for the current month, from the same series the drawer charts.
  const yieldValue = useMemo(() => buildSeries(gross, entity, strategy, months)[HIST - 1].ehr, [gross, entity, strategy, months]);

  return (
    <div>
      <p className="num mb-4 text-xs text-[#5F6368]">
        {usd(gross)} a month · {entity.label} · {Math.round(strategy.rate * 100)}% tax reserve. Change these in the canvas above.
      </p>
      <div className="flex items-stretch overflow-x-auto px-1 pb-4 pt-2" role="group" aria-label="Cashflow waterfall: select a stage to inspect it">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage.key}>
            <Stage stage={stage} index={i} value={stage.key === 'yield' ? yieldValue : stageValue(stage.key, m, gross)} left={remainingShare(stage.key, m, gross)} onOpen={openStage} />
            {i < STAGES.length - 1 && <Bridge />}
          </React.Fragment>
        ))}
      </div>
      <DollarBar m={m} gross={gross} />
      <AnimatePresence>{open && <InspectionDrawer key={open} moduleKey={open} onClose={close} />}</AnimatePresence>
    </div>
  );
}

// src/sandbox.js
// Shared engine behind the home page: the hero canvas, the waterfall diagram and the inspection drawers
// all read this one store, so moving a control anywhere updates everything.
// Illustrative model, not advice:
//   Tax vault        V_tax    = S_gross x tax rate
//   Fixed costs      E_fixed  = S_gross x entity overhead
//   Retained capital R_runway = E_fixed x runway months / 12
//   Virtual salary   D_salary = S_gross - V_tax - R_runway
//   Safe-to-spend    S_safe   = S_gross - V_tax - R_runway - E_fixed

import { useMemo } from 'react';
import { create } from 'zustand';

export const ENTITIES = [
  { id: 'solo', label: 'Solo Agency', overhead: 0.22 },
  { id: 'boutique', label: 'Boutique Studio', overhead: 0.35 },
  { id: 'hnw', label: 'High-Net-Worth Independent', overhead: 0.15 },
  { id: 'enterprise', label: 'Enterprise', overhead: 0.45 },
];
export const STRATEGIES = [
  { id: 'conservative', label: 'Conservative', rate: 0.35 },
  { id: 'balanced', label: 'Balanced', rate: 0.28 },
  { id: 'aggressive', label: 'Aggressive', rate: 0.2 },
];
export const RUNWAYS = [3, 6, 12];

// The gross slider is logarithmic so both $5K and $500K are easy to reach.
export const MIN = 5000;
export const MAX = 500000;
export const STEPS = 1000;
export const fromSlider = (t) => {
  const raw = MIN * Math.pow(MAX / MIN, t / STEPS);
  const step = raw < 20000 ? 100 : raw < 100000 ? 500 : 1000;
  return Math.round(raw / step) * step;
};
export const toSlider = (g) => Math.round((Math.log(g / MIN) / Math.log(MAX / MIN)) * STEPS);

export function compute(gross, entity, strategy, months) {
  const tax = gross * strategy.rate;
  const fixed = gross * entity.overhead;
  const retained = (fixed * months) / 12;
  const salary = gross - tax - retained;
  const safe = gross - tax - retained - fixed;
  return { tax, fixed, retained, salary, safe, quarterly: tax * 3 };
}

/* ---------- 12-month history and projection ---------- */
export const BILL_RATE = 150; // illustrative blended billing rate, per hour
export const HIST = 8; // months 0..7 are history, 8..11 are projected
export const SERIES_LEN = 12;
const SEASON = [0.91, 1.04, 0.87, 1.11, 0.96, 1.07, 0.9, 1.0]; // the last historical month equals the current setting
const CREEP = [0.04, 0.1, 0.18, 0.06, 0.12, 0.08, 0.2, 0.08, 0.1, 0.1, 0.1, 0.1]; // unbilled hours as a share of billed hours
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Twelve monthly points ending in the current setting; fixed costs and the runway reserve stay constant. */
export function buildSeries(gross, entity, strategy, months, now = new Date()) {
  const base = compute(gross, entity, strategy, months);
  const grosses = [];
  for (let i = 0; i < SERIES_LEN; i++) {
    if (i < HIST) grosses.push(gross * SEASON[i]);
    else grosses.push(grosses.slice(-3).reduce((a, b) => a + b, 0) / 3); // projection: trailing three-month average
  }
  return grosses.map((g, i) => {
    const tax = g * strategy.rate;
    const salary = g - tax - base.retained;
    const safe = salary - base.fixed;
    const hours = (g / BILL_RATE) * (1 + CREEP[i]);
    const monthIndex = (now.getMonth() - (HIST - 1) + i + 120) % 12;
    return {
      i, projected: i >= HIST, label: MONTHS[monthIndex],
      inflow: g, gross: g, tax, retained: base.retained, salary, fixed: base.fixed, safe,
      ehr: hours > 0 ? (g - base.fixed) / hours : 0, hours,
    };
  });
}

export const MODULE_KEYS = ['inflow', 'tax', 'retained', 'salary', 'fixed', 'safe', 'yield'];
export const moduleValue = (key, p) => (key === 'yield' ? p.ehr : p[key === 'inflow' ? 'inflow' : key]);

/* ---------- shared store with an audit log ---------- */
const stateSnapshot = (s) => {
  const entity = ENTITIES.find((e) => e.id === s.entityId);
  const strategy = STRATEGIES.find((x) => x.id === s.strategyId);
  const months = RUNWAYS[s.runwayIdx];
  return { gross: fromSlider(s.t), entity, strategy, months };
};

let seq = 0;
function entriesFor(s, reason) {
  const { gross, entity, strategy, months } = stateSnapshot(s);
  const series = buildSeries(gross, entity, strategy, months);
  const current = series[HIST - 1];
  const ts = Date.now();
  return MODULE_KEYS.map((key) => ({
    id: ++seq, ts, key, reason,
    inp: { gross, rate: strategy.rate, overhead: entity.overhead, months, fixed: current.fixed, hours: current.hours },
    value: moduleValue(key, current),
  }));
}

const MAX_LOG = 280;

export const useSandbox = create((set, get) => {
  const initial = { t: toSlider(48000), entityId: 'solo', strategyId: 'balanced', runwayIdx: 1 };
  const commit = (partial, reason) =>
    set((s) => ({ ...partial, log: [...s.log, ...entriesFor({ ...s, ...partial }, reason)].slice(-MAX_LOG) }));

  return {
    ...initial,
    log: entriesFor(initial, 'Session start'),
    setT: (t) => commit({ t }, 'Gross inflow changed'),
    setEntity: (entityId) => commit({ entityId }, 'Entity changed'),
    setStrategy: (strategyId) => commit({ strategyId }, 'Tax strategy changed'),
    setRunway: (runwayIdx) => commit({ runwayIdx }, 'Runway changed'),
    replay: () => commit({}, 'Manual recalculation'),
  };
});

/**
 * The current inputs and results. Selects only primitive values from the store (so React never sees a
 * fresh object on every read) and builds the model with useMemo.
 */
export function useSandboxModel() {
  const t = useSandbox((s) => s.t);
  const entityId = useSandbox((s) => s.entityId);
  const strategyId = useSandbox((s) => s.strategyId);
  const runwayIdx = useSandbox((s) => s.runwayIdx);
  return useMemo(() => {
    const snap = stateSnapshot({ t, entityId, strategyId, runwayIdx });
    return { ...snap, m: compute(snap.gross, snap.entity, snap.strategy, snap.months) };
  }, [t, entityId, strategyId, runwayIdx]);
}

export const fmtTime = (ts) => {
  const d = new Date(ts);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
};

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const stdDev = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

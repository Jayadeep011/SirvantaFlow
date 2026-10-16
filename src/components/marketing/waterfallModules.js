// src/components/marketing/waterfallModules.js
// What each waterfall stage means: its label, the exact formula, variable legend,
// the formula with today's numbers substituted, and how an audit-trail line is written.

import { usd } from '../../finance';
import { BILL_RATE } from '../../sandbox';

const pct = (n) => `${Math.round(n * 1000) / 10}%`;

export const STAGES = [
  { key: 'inflow', kind: 'source', label: 'Gross inflow', caption: 'Client payments land' },
  { key: 'tax', kind: 'deduct', label: 'Tax vault', caption: 'Reserved first' },
  { key: 'retained', kind: 'deduct', label: 'Runway capital', caption: 'Months of safety' },
  { key: 'salary', kind: 'result', label: 'Virtual salary', caption: 'Steady owner draw' },
  { key: 'fixed', kind: 'deduct', label: 'Fixed costs', caption: 'Bills that never skip' },
  { key: 'safe', kind: 'result', label: 'Safe-to-spend', caption: 'Truly spendable' },
  { key: 'yield', kind: 'insight', label: 'Client yield', caption: 'Who earned it' },
];

export const fmtValue = (key, v) => (key === 'yield' ? `${usd(v)}/hr` : usd(v));

/** The share of every incoming dollar that is still left after this stage. */
export function remainingShare(key, m, gross) {
  if (gross <= 0) return 0;
  const map = { inflow: gross, tax: gross - m.tax, retained: m.salary, salary: m.salary, fixed: m.safe, safe: m.safe };
  return key in map ? Math.max(0, map[key]) / gross : null;
}

export const MODULES = {
  inflow: {
    title: 'Gross inflow',
    blurb: 'Every payment that reaches your accounts this month, before anything is set aside.',
    formula: 'S_gross = Σ payments received',
    vars: [['S_gross', 'Gross monthly inflow']],
    now: (c) => `S_gross = ${usd(c.gross)}`,
    audit: (e) => `Σ payments = ${usd(e.inp.gross)}`,
  },
  tax: {
    title: 'Tax vault',
    blurb: 'A fixed share of each payment is locked away before it can be spent.',
    formula: 'V_tax = S_gross × τ\nQ_pay = 3 × V_tax',
    vars: [['V_tax', 'Monthly tax reserve'], ['τ', 'Reserve rate from your tax strategy'], ['Q_pay', 'Reserve held for a quarterly payment']],
    now: (c) => `V_tax = ${usd(c.gross)} × ${pct(c.rate)} = ${usd(c.m.tax)}\nQ_pay = 3 × ${usd(c.m.tax)} = ${usd(c.m.quarterly)}`,
    audit: (e) => `${usd(e.inp.gross)} × ${pct(e.inp.rate)}`,
  },
  retained: {
    title: 'Runway capital',
    blurb: 'Money set aside each month so that your fixed costs are covered for the runway you chose.',
    formula: 'R_runway = E_fixed × n ÷ 12',
    vars: [['R_runway', 'Monthly retained capital'], ['E_fixed', 'Fixed monthly costs'], ['n', 'Target runway in months']],
    now: (c) => `R_runway = ${usd(c.m.fixed)} × ${c.months} ÷ 12 = ${usd(c.m.retained)}`,
    audit: (e) => `${usd(e.inp.fixed)} × ${e.inp.months} ÷ 12`,
  },
  salary: {
    title: 'Virtual salary',
    blurb: 'The draw you can take after tax and runway are protected. Fixed costs are still to come.',
    formula: 'D_salary = S_gross − V_tax − R_runway',
    vars: [['D_salary', 'Optimal monthly draw capacity'], ['V_tax', 'Tax reserve'], ['R_runway', 'Retained capital']],
    now: (c) => `D_salary = ${usd(c.gross)} − ${usd(c.m.tax)} − ${usd(c.m.retained)} = ${usd(c.m.salary)}`,
    audit: (e) => `${usd(e.inp.gross)} − tax − runway`,
  },
  fixed: {
    title: 'Fixed costs',
    blurb: 'The bills that do not shrink in a slow month. They are held constant across the 12-month view.',
    formula: 'E_fixed = S_gross × ω',
    vars: [['E_fixed', 'Fixed monthly costs'], ['ω', 'Overhead rate for your business entity']],
    now: (c) => `E_fixed = ${usd(c.gross)} × ${pct(c.overhead)} = ${usd(c.m.fixed)}`,
    audit: (e) => `${usd(e.inp.gross)} × ${pct(e.inp.overhead)}`,
  },
  safe: {
    title: 'Safe-to-spend',
    blurb: 'What is genuinely free to spend once tax, runway and fixed costs are all covered.',
    formula: 'S_safe = S_gross − V_tax − R_runway − E_fixed',
    vars: [['S_safe', 'Safe-to-spend'], ['S_gross', 'Gross inflow'], ['V_tax', 'Tax reserve'], ['R_runway', 'Retained capital'], ['E_fixed', 'Fixed costs']],
    now: (c) => `S_safe = ${usd(c.gross)} − ${usd(c.m.tax)} − ${usd(c.m.retained)} − ${usd(c.m.fixed)} = ${usd(c.m.safe)}`,
    audit: (e) => `${usd(e.inp.gross)} − tax − runway − fixed`,
  },
  yield: {
    title: 'Client yield',
    blurb: `Effective hourly rate after costs and unbilled work. This model bills at an illustrative ${usd(BILL_RATE)} an hour.`,
    formula: 'EHR = (Revenue − Direct expenses)\n      ÷ (Billed hours + Scope-creep hours)',
    vars: [['EHR', 'Effective hourly rate'], ['Revenue', 'Gross inflow'], ['Direct expenses', 'Fixed costs in this model'], ['Hours', 'Billed plus unbilled scope-creep hours']],
    now: (c) => `EHR = (${usd(c.gross)} − ${usd(c.m.fixed)}) ÷ ${Math.round(c.point.hours)} h = ${usd(c.point.ehr)}/hr`,
    audit: (e) => `(${usd(e.inp.gross)} − ${usd(e.inp.fixed)}) ÷ ${Math.round(e.inp.hours)} h`,
  },
};

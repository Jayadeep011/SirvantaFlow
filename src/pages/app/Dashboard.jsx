// src/pages/app/Dashboard.jsx
// Dashboard Overview as a command center: metric cards with live sparklines and change badges,
// the Safe-to-Spend dial, a 30-day forecast, tax warnings, client alerts and recent activity.
// Every figure and every delta is calculated from the local database.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TriangleAlert, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarClock, FileText } from 'lucide-react';
import { db, toISODate } from '../../db';
import { useStore } from '../../store';
import { usd, usdCompact, calcSafeToSpend, buildForecast30, pctChange, mean } from '../../finance';
import { nextDeadline, daysUntil, fmtDate, getYearFigures } from '../../tax';
import { rankClients, blendedEhr, ehrTier, displayStatus, scopeCreepShare } from '../../clients';
import useCashModel from '../../hooks/useCashModel';
import PageHeader from '../../components/PageHeader';
import MetricCard from '../../components/MetricCard';
import LiveBadge from '../../components/LiveBadge';
import { SafeDial } from '../../components/CashFlowTab';
import { MUTED, GOLD_TEXT, DIVIDER, TINT_RED, TINT_GOLD, TINT_TEAL } from '../../ui';
import SpringNumber from '../../components/marketing/SpringNumber';

const daysBetween = (isoA, isoB) => Math.round((new Date(`${isoB}T12:00:00`) - new Date(`${isoA}T12:00:00`)) / 86400000);
const signed = (n, fmt) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
const pctText = (p) => `${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`;

const CellHeader = ({ id, label, title, action }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="label-caps">{label}</p>
      <h2 id={id} className="mt-1 text-base font-semibold">{title}</h2>
    </div>
    {action}
  </div>
);

export default function DashboardPage() {
  const m = useCashModel();
  const darkMode = useStore((s) => s.darkMode);
  const { inputs, taxRate, entity } = m;

  const clients = useLiveQuery(() => db.clients.toArray(), [], []);
  const invoices = useLiveQuery(() => db.invoices.toArray(), [], []);
  const recentTx = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(8).toArray(), [], []);
  const calendar = useMemo(() => nextDeadline(new Date()), []);
  const figures = useLiveQuery(() => getYearFigures(calendar.taxYear), [calendar.taxYear]);
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  }, []);
  const last30 = useLiveQuery(() => db.transactions.where('date').aboveOrEqual(since).toArray(), [since], []);

  const today = toISODate();
  const { safe, short } = calcSafeToSpend(inputs);
  const { active } = useMemo(() => rankClients(clients), [clients]);
  const overdue = invoices.filter((i) => displayStatus(i, today) === 'overdue');
  const overdueTotal = overdue.reduce((s, i) => s + i.amount, 0);
  const incomes = m.history ? m.history.map((h) => h.income) : [];

  /* ---- 30-day forecast: expected invoice payments in, fixed expenses out ---- */
  const forecast = useMemo(() => {
    const delays = Object.fromEntries(clients.map((c) => [c.name, c.avgPaymentDelayDays || 0]));
    const receipts = [];
    invoices.forEach((inv) => {
      const status = displayStatus(inv, today);
      if (status !== 'sent' && status !== 'overdue') return;
      let day = daysBetween(today, inv.dueDate) + (delays[inv.clientName] || 0);
      if (day < 1) day = 7; // already late: assume it arrives within a week
      if (day <= 30) receipts.push({ day, amount: inv.amount });
    });
    const points = buildForecast30({ startBalance: inputs.cash - inputs.tax, monthlyBurn: inputs.expenses, receipts, taxRate });
    const base = new Date();
    return points.map((p) => ({ ...p, label: new Date(base.getFullYear(), base.getMonth(), base.getDate() + p.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));
  }, [clients, invoices, inputs, taxRate, today]);

  const lowest = forecast.reduce((a, p) => (p.balance < a.balance ? p : a), forecast[0]);
  const endBalance = forecast[forecast.length - 1].balance;

  /* ---- metric card data: real deltas and sparklines ---- */
  const net30 = last30
    .filter((t) => entity === 'consolidated' || t.entity === entity)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const safeSeries = forecast.map((p) => p.balance - inputs.expenses - inputs.buffer);

  const incomeDelta = incomes.length >= 6 ? pctChange(mean(incomes.slice(3)), mean(incomes.slice(0, 3))) : null;

  const estimate = figures ? Math.round(figures.gross * taxRate) : 0;
  const funded = estimate > 0 ? (inputs.tax / estimate) * 100 : null;
  let running = 0;
  const taxSeries = incomes.map((v) => { running += v * taxRate; return running; });

  const invoicedByMonth = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return invoices.filter((i) => i.issueDate.startsWith(key)).reduce((s, i) => s + i.amount, 0);
    });
  }, [invoices]);

  const blended = blendedEhr(active);
  const blendedTier = ehrTier(blended);
  const ehrSeries = active.map((c) => c.ehr).reverse();

  const cards = [
    {
      label: 'Safe to spend', value: safe, format: usd, tone: short ? 'rose' : 'emerald', spark: safeSeries, sparkColor: short ? '#F43F5E' : '#10B981',
      delta: { tone: net30 > 0 ? 'up' : net30 < 0 ? 'down' : 'flat', text: `${signed(net30, usd)} · 30 days` },
    },
    {
      label: 'Locked for taxes', value: inputs.tax, format: usd, tone: 'gold', spark: taxSeries, sparkColor: '#F59E0B',
      delta: funded === null ? null : { tone: funded >= 100 ? 'up' : funded >= 70 ? 'warn' : 'down', text: `${Math.round(funded)}% funded` },
      hint: estimate > 0 ? `of ${usd(estimate)}` : undefined,
    },
    {
      label: 'Average monthly income', value: m.engine.avg, format: usd, tone: 'neutral', spark: incomes, sparkColor: '#5B8DEF',
      delta: incomeDelta === null ? null : { tone: incomeDelta > 0.05 ? 'up' : incomeDelta < -0.05 ? 'down' : 'flat', text: `${pctText(incomeDelta)} vs prior 3 mo` },
    },
    {
      label: 'Overdue invoices', value: overdueTotal, format: usd, tone: overdue.length ? 'rose' : 'neutral', spark: invoicedByMonth, sparkColor: '#F43F5E',
      delta: { tone: overdue.length ? 'down' : 'up', text: overdue.length ? `${overdue.length} late` : 'All current' },
    },
    {
      label: 'Blended hourly rate', value: blended, format: (v) => `${usd(v)}/hr`, tone: 'gold', spark: ehrSeries, sparkColor: '#E2B13C',
      delta: active.length ? { tone: blendedTier === 'high' ? 'up' : blendedTier === 'target' ? 'flat' : 'down', text: blendedTier === 'high' ? 'High margin' : blendedTier === 'target' ? 'On target' : 'Below floor' } : null,
      hint: `${active.length} active`,
    },
  ];

  /* ---- tax warnings ---- */
  const days = daysUntil(calendar.next.date);
  const reserveGap = Math.max(0, estimate - inputs.tax);
  const warnings = [];
  if (short) warnings.push({ tone: 'red', text: `Your reserves exceed your cash by ${usd(-safe)}. Hold spending until income arrives.` });
  if (reserveGap > 0) warnings.push({ tone: 'amber', text: `Your tax reserve is ${usd(reserveGap)} below the ${usd(estimate)} estimated from this year's income.` });
  if (days <= 30) warnings.push({ tone: 'amber', text: `${calendar.next.quarter} payment is due in ${days} ${days === 1 ? 'day' : 'days'}.` });
  if (overdue.length > 0) warnings.push({ tone: 'amber', text: `${overdue.length} overdue ${overdue.length === 1 ? 'invoice' : 'invoices'} worth ${usd(overdueTotal)}.` });
  const tones = { red: TINT_RED, amber: TINT_GOLD };

  /* ---- client alerts ---- */
  const alerts = active.filter((c) => ehrTier(c.ehr) === 'toxic' || scopeCreepShare(c) >= 0.3 || c.avgPaymentDelayDays > 30).slice(0, 4);

  /* ---- activity feed ---- */
  const feed = useMemo(() => {
    const items = recentTx.map((t) => ({ key: `t${t.id}`, date: t.date, title: t.description, sub: t.category, amount: t.type === 'income' ? t.amount : -t.amount, kind: 'tx' }));
    invoices.slice(-4).forEach((i) => items.push({ key: `i${i.id}`, date: i.issueDate, title: `Invoice ${i.invoiceNumber}`, sub: `${i.clientName} · ${displayStatus(i, today)}`, amount: i.amount, kind: 'invoice' }));
    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  }, [recentTx, invoices, today]);

  const axis = darkMode ? '#9AA0A6' : '#64748B';
  const grid = darkMode ? 'rgba(255,255,255,0.07)' : '#E2E8F0';

  return (
    <div>
      <PageHeader title="Dashboard Overview" description="Where your money stands today, what the next 30 days look like, and what needs attention.">
        <div className="flex flex-wrap gap-2">
          <LiveBadge>Engine synced</LiveBadge>
          {days <= 14 ? <LiveBadge tone="amber">Tax guard: payment in {days} {days === 1 ? 'day' : 'days'}</LiveBadge> : <LiveBadge>Tax guard active</LiveBadge>}
          {short ? <LiveBadge tone="rose">Reserves exceed cash</LiveBadge> : <LiveBadge>Local-first</LiveBadge>}
        </div>
      </PageHeader>

      {/* Row 1: metric cards */}
      <div className="command-grid sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => <MetricCard key={c.label} {...c} />)}
      </div>

      {/* Row 2: dial and forecast */}
      <div className="command-grid mt-4 xl:grid-cols-3">
        <section className="command-cell p-6" aria-labelledby="dash-dial">
          <CellHeader id="dash-dial" label="Spending power" title="Safe-to-Spend" action={<Link to="/app/safe-to-spend" className={`inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>Engine <ArrowRight size={14} aria-hidden="true" /></Link>} />
          <div className="mt-4"><SafeDial inputs={inputs} /></div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {[['bg-[#D97706]', 'Tax', inputs.tax], ['bg-slate-500 dark:bg-zinc-500', 'Bills + buffer', inputs.expenses + inputs.buffer], ['bg-[#16A34A]', 'Safe', Math.max(safe, 0)]].map(([dot, label, value]) => (
              <div key={label}><dt className={`flex items-center gap-1.5 ${MUTED}`}><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</dt><dd className="num mt-0.5 font-semibold"><SpringNumber value={value} /></dd></div>
            ))}
          </dl>
        </section>

        <section className="command-cell p-6 xl:col-span-2" aria-labelledby="dash-forecast">
          <CellHeader
            id="dash-forecast" label="Forecast" title="30-day cash outlook"
            action={
              <div className="flex gap-5 text-right text-sm">
                <div><p className="label-caps">Lowest</p><p className={`num font-bold ${lowest.balance < 0 ? 'text-rose-600 dark:text-[#F43F5E]' : ''}`}><SpringNumber value={lowest.balance} /></p></div>
                <div><p className="label-caps">In 30 days</p><p className={`num font-bold ${endBalance < 0 ? 'text-rose-600 dark:text-[#F43F5E]' : ''}`}><SpringNumber value={endBalance} /></p></div>
              </div>
            }
          />
          <div className="mt-4 h-60 w-full" role="img" aria-label="Forecast of spendable balance for the next 30 days">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E2B13C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E2B13C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" interval={6} tick={{ fill: axis, fontSize: 12 }} axisLine={{ stroke: grid }} tickLine={false} />
                <YAxis tickFormatter={usdCompact} tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(v) => [usd(v), 'Spendable']} contentStyle={{ background: darkMode ? '#0E0E11' : '#FFFFFF', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 13 }} labelStyle={{ color: axis }} />
                <ReferenceLine y={0} stroke="#F43F5E" strokeOpacity={0.5} />
                <Area type="monotone" dataKey="balance" stroke="#FFD666" strokeWidth={2.5} fill="url(#dashGold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className={`mt-3 text-xs leading-relaxed ${MUTED}`}>Unpaid invoices are expected on their due date plus the client&apos;s average payment delay. Invoices already late are assumed to arrive within a week. Each payment is reduced by your tax set-aside rate.</p>
        </section>
      </div>

      {/* Row 3: tax, clients, activity */}
      <div className="command-grid mt-4 lg:grid-cols-3">
        <section className="command-cell p-6" aria-labelledby="dash-tax">
          <CellHeader id="dash-tax" label="Tax guard" title="Next payment" />
          <div className={`mt-4 rounded-xl p-4 ${TINT_TEAL}`}>
            <p className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={16} aria-hidden="true" />{calendar.next.quarter} · <span className="num">{fmtDate(calendar.next.date)}</span></p>
            <p className="num mt-2 text-3xl font-bold">{days}<span className={`ml-2 text-sm font-medium ${MUTED}`}>{days === 1 ? 'day' : 'days'} left</span></p>
          </div>
          <ul className="mt-4 space-y-2" aria-live="polite">
            {warnings.length === 0 && <li className={`rounded-lg p-3 text-sm ${TINT_TEAL}`}>Nothing needs attention right now.</li>}
            {warnings.map((w) => (
              <li key={w.text} className={`flex gap-2 rounded-lg p-3 text-sm ${tones[w.tone]}`}><TriangleAlert size={15} className="mt-0.5 shrink-0 text-[#D97706]" aria-hidden="true" />{w.text}</li>
            ))}
          </ul>
          <Link to="/app/tax-vault" className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>Open Tax Vault <ArrowRight size={14} aria-hidden="true" /></Link>
        </section>

        <section className="command-cell p-6" aria-labelledby="dash-clients">
          <CellHeader id="dash-clients" label="Client yield" title="Alerts" />
          {alerts.length === 0 ? (
            <p className={`mt-4 rounded-lg p-3 text-sm ${TINT_TEAL}`}>No clients are flagged. Rates, scope and payment times look healthy.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((c) => (
                <li key={c.id} className={`rounded-lg border p-3 text-sm ${DIVIDER}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold">{c.name}</span><span className="num font-bold">{usd(c.ehr)}/hr</span></div>
                  <p className={`mt-1 text-xs ${MUTED}`}>
                    {[ehrTier(c.ehr) === 'toxic' && 'Below your rate floor', scopeCreepShare(c) >= 0.3 && `${Math.round(scopeCreepShare(c) * 100)}% unbilled scope creep`, c.avgPaymentDelayDays > 30 && `Pays ${c.avgPaymentDelayDays} days late`].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/client-matrix" className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>Open Client Matrix <ArrowRight size={14} aria-hidden="true" /></Link>
        </section>

        <section className="command-cell p-6" aria-labelledby="dash-activity">
          <CellHeader id="dash-activity" label="Ledger" title="Recent activity" />
          {feed.length === 0 ? (
            <p className={`mt-4 rounded-lg p-3 text-sm ${TINT_TEAL}`}>No activity yet. Import a statement or add a client to get started.</p>
          ) : (
            <ul className="mt-4">
              {feed.map((f) => (
                <li key={f.key} className={`flex items-center gap-3 border-t py-2.5 first:border-t-0 ${DIVIDER}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${f.kind === 'invoice' ? 'bg-[#E6E4F7] text-[#5B4FC4] dark:bg-[#1A1830] dark:text-[#8B83F0]' : f.amount >= 0 ? 'bg-[#DCF3E4] text-[#146C34] dark:bg-[#0F2A1A] dark:text-[#4ADE80]' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-[#D4D4D8]'}`}>
                    {f.kind === 'invoice' ? <FileText size={15} aria-hidden="true" /> : f.amount >= 0 ? <ArrowDownLeft size={15} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{f.title}</span><span className={`num block truncate text-xs ${MUTED}`}>{f.date} · {f.sub}</span></span>
                  <span className={`num text-sm font-semibold ${f.amount >= 0 ? 'text-emerald-600 dark:text-[#10B981]' : ''}`}>{f.amount >= 0 ? '+' : '−'}{usd(Math.abs(f.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

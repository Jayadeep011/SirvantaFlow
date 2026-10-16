// src/pages/public/Home.jsx
// Main landing page: interactive hero canvas, problem vs solution, cashflow waterfall, local-first, ROI calculator, social proof.

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Cloud, Database, HardDrive, ServerOff, X } from 'lucide-react';
import { useT } from '../../i18n';
import { FACTS, TESTIMONIALS, TRUST } from '../../content/site';
import OsCanvas from '../../components/marketing/OsCanvas';
import WaterfallEngine from '../../components/marketing/WaterfallEngine';
import RoiCalculator from '../../components/marketing/RoiCalculator';
import Reveal from '../../components/marketing/Reveal';
import { CARD, MUTED, GOLD_TEXT, BTN_GOLD, CONTAINER } from '../../ui';

const OLD_WAY = [
  'A spreadsheet that breaks the moment a column moves',
  'Tax deadlines you remember a week too late',
  'A bank balance that looks safe but is already owed to the IRS',
  'No idea which client is quietly costing you money',
];
const NEW_WAY = [
  'Tax set aside on every payment, before you can spend it',
  'A steady virtual salary built from six months of income',
  'One safe-to-spend number you can trust',
  'Hourly rate per client, after costs and unbilled scope creep',
];

function SectionTitle({ eyebrow, title, children }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={`text-sm font-semibold ${GOLD_TEXT}`}>{eyebrow}</p>}
      <h2 className="font-display mt-2 text-4xl sm:text-5xl">{title}</h2>
      {children && <p className={`mt-4 text-lg leading-relaxed ${MUTED}`}>{children}</p>}
    </div>
  );
}

export default function Home() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <>
      <section className="relative overflow-hidden bg-[#070708] text-[#F8F9FA]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(60rem_26rem_at_50%_-8%,rgba(226,177,60,0.14),transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-16 lg:pt-24">
          <Reveal className="mx-auto max-w-4xl text-center">
            <p className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9AA0A6]">
              <span className="pulse-dot" aria-hidden="true" />Financial operating system
            </p>
            <h1 className="font-display mt-6 text-5xl leading-[1.04] sm:text-6xl lg:text-7xl">
              The Financial Operating System for <em className="bg-gradient-to-r from-[#F3D27C] to-[#E2B13C] bg-clip-text pr-1 text-transparent">High-Yield Agencies &amp; Independents.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#9AA0A6]">
              Stop running your business out of a spreadsheet. See exactly what is safe to spend, set tax aside before it disappears, and find the clients that quietly cost you money, all before the next deadline surprises you.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={() => navigate('/app/dashboard')} className={`${BTN_GOLD} gap-2`}>{t('pub.launch')}<ArrowRight size={16} aria-hidden="true" /></button>
              <button onClick={() => navigate('/app/safe-to-spend')} className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-[#F8F9FA] transition-colors hover:bg-white/10">{t('pub.sandbox')}</button>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {TRUST.map((x) => <li key={x} className="flex items-center gap-1.5 text-sm text-[#9AA0A6]"><Check size={15} className="text-[#10B981]" aria-hidden="true" />{x}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="mt-14"><OsCanvas /></Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} py-20`}>
        <Reveal><SectionTitle eyebrow="Why it exists" title="Your bank balance is not your safe-to-spend.">Most independents find out the difference at tax time. Sirvanta Flow shows it every day.</SectionTitle></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className={`${CARD} h-full p-6`}>
              <h3 className="text-lg font-semibold text-[#B42318] dark:text-[#F87171]">The old way</h3>
              <ul className="mt-4 space-y-3">{OLD_WAY.map((x) => <li key={x} className="flex gap-3 text-sm"><X size={17} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />{x}</li>)}</ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-xl border border-[#C5A059]/50 bg-gradient-to-br from-[#C5A059]/10 to-transparent p-6">
              <h3 className={`text-lg font-semibold ${GOLD_TEXT}`}>The Sirvanta Flow way</h3>
              <ul className="mt-4 space-y-3">{NEW_WAY.map((x) => <li key={x} className="flex gap-3 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" />{x}</li>)}</ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="waterfall" className="relative overflow-hidden bg-[#070708] text-[#F8F9FA]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(50rem_20rem_at_50%_0%,rgba(226,177,60,0.10),transparent_70%)]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-5 py-20">
          <Reveal>
            <p className="text-sm font-semibold text-[#E2B13C]">The cashflow waterfall</p>
            <h2 className="font-display mt-2 max-w-3xl text-4xl sm:text-5xl">Follow every dollar from the moment it arrives.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#9AA0A6]">Tax is set aside first, then runway, then your salary, then fixed costs. What remains is truly yours. Select any stage to inspect its formula, trend, volatility and audit trail.</p>
          </Reveal>
          <Reveal className="mt-10" delay={0.05}><WaterfallEngine /></Reveal>
          <p className="mt-8"><Link to="/features" className="inline-flex items-center gap-1 text-sm font-semibold text-[#F3D27C]">See every formula and automation <ArrowRight size={14} aria-hidden="true" /></Link></p>
        </div>
      </section>

      <section className={`${CONTAINER} py-20`}>
        <Reveal><SectionTitle eyebrow="Local-first" title="Your numbers stay on your device.">Records are stored in your browser&apos;s own database. Nothing is uploaded unless you choose to use an AI feature.</SectionTitle></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[[HardDrive, 'Stored in your browser', 'Transactions, clients, invoices and settings live in IndexedDB on your device. No account database to breach.'], [ServerOff, 'No always-on sync', 'There is no background upload. Back up and restore with a file when you decide to.'], [Cloud, 'AI only when you ask', 'Statement parsing and questions send just the text or figures you submit, through a server function that keeps the API key off your device.']].map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className={`${CARD} h-full p-6`}>
                <Icon size={22} className={GOLD_TEXT} aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6"><Link to="/security" className={`inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}><Database size={14} aria-hidden="true" />Read the full privacy manifest <ArrowRight size={14} aria-hidden="true" /></Link></p>
      </section>

      <section className="border-y border-slate-200 bg-white/50 dark:border-white/10 dark:bg-white/[0.02]">
        <div className={`${CONTAINER} py-20`}>
          <Reveal><SectionTitle eyebrow="Estimate your savings" title="What could late tax and unbilled work be costing you?">Move the sliders. Every assumption is shown beneath them.</SectionTitle></Reveal>
          <Reveal className="mt-10"><RoiCalculator /></Reveal>
        </div>
      </section>

      <section className={`${CONTAINER} py-20`}>
        <Reveal><SectionTitle eyebrow="Built for people like you" title="What independents say.">These are illustrative examples while we collect real customer stories.</SectionTitle></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.06}>
              <figure className={`${CARD} flex h-full flex-col p-6`}>
                <blockquote className="flex-1 text-sm leading-relaxed">&ldquo;{q.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center justify-between gap-2 text-sm">
                  <span><span className="block font-semibold">{q.name}</span><span className={MUTED}>{q.role}</span></span>
                  {q.illustrative && <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/20 dark:text-[#9AA0A6]">Illustrative example</span>}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <dl className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {FACTS.map((f) => <div key={f.label} className={`${CARD} p-5 text-center`}><dt className={`text-sm ${MUTED}`}>{f.label}</dt><dd className="mt-1 text-3xl font-bold tabular-nums">{f.value}</dd></div>)}
        </dl>
      </section>

      <section className="bg-gradient-to-r from-[#12233F] to-[#0F5A66] text-white">
        <div className={`${CONTAINER} flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center`}>
          <h2 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">See your real safe-to-spend number before the next tax deadline.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate('/app/dashboard')} className={BTN_GOLD}>{t('pub.launch')}</button>
            <button onClick={() => navigate('/pricing')} className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{t('pub.pricing')}</button>
          </div>
        </div>
      </section>
    </>
  );
}

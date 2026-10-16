// src/pages/app/TaxVault.jsx
// Tax Vault: live schedule timeline and reserve layers (Pro and above), then the calculator,
// quarterly vault, Schedule C scanner and yield radar (TaxTab).

import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Info } from 'lucide-react';
import { getSettings } from '../../db';
import { useStore } from '../../store';
import { COUNTRIES } from '../../regions';
import { tierAtLeast } from '../../plans';
import { nextDeadline, getYearFigures } from '../../tax';
import TaxTab from '../../components/TaxTab';
import LockedCard from '../../components/LockedCard';
import { TaxTimeline, TaxLayers } from '../../components/TaxCharts';
import { MUTED, TINT_BLUE } from '../../ui';

export default function TaxVaultPage() {
  const country = useStore((s) => s.country);
  const userTier = useStore((s) => s.userTier);
  const settings = useLiveQuery(() => getSettings(), []);
  const calendar = useMemo(() => nextDeadline(new Date()), []);
  const figures = useLiveQuery(() => getYearFigures(calendar.taxYear), [calendar.taxYear]);

  const rates = {
    federal: settings ? settings.federalTaxRate : 24,
    state: settings ? settings.stateTaxRate : 5,
    local: settings ? settings.localTaxRate || 0 : 0,
    se: settings ? settings.selfEmploymentTax : true,
  };
  const byQuarter = figures ? figures.byQuarter : [0, 0, 0, 0];
  const name = (COUNTRIES.find((c) => c.id === country) || COUNTRIES[0]).name;

  return (
    <div>
      {country !== 'US' && (
        <p className={`mb-6 flex gap-2 rounded-lg p-3 text-sm ${TINT_BLUE}`}>
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Region set to {name}. Currency and starting rates follow your region, but the payment calendar, Schedule C and the 1040-ES worksheet below are United States rules. <span className={MUTED}>Check your own tax authority&apos;s deadlines.</span></span>
        </p>
      )}

      <div className="mb-8 space-y-6">
        <LockedCard locked={!tierAtLeast(userTier, 'pro')} tier="pro" label="Quarterly schedule timeline">
          <TaxTimeline calendar={calendar} byQuarter={byQuarter} rates={rates} />
        </LockedCard>
        <LockedCard locked={!tierAtLeast(userTier, 'pro')} tier="pro" label="Tax reserve layers">
          <TaxLayers byQuarter={byQuarter} rates={rates} />
        </LockedCard>
      </div>

      <TaxTab />
    </div>
  );
}

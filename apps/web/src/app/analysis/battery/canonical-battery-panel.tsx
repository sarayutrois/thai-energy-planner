"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBatteryAnalysisInputFromCanonicalLoadProfile,
  createDemoBatteryFinancialAssumptions,
  createDemoPhase6Input,
  runBatteryAnalysis,
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type {
  Authority,
  CanonicalLoadProfile,
} from "@thai-energy-planner/shared-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

export function CanonicalBatteryPanel() {
  const [profile, setProfile] = useState<CanonicalLoadProfile | null>(null);
  const [authority, setAuthority] = useState<Authority>("PEA");

  useEffect(
    () => setProfile(readLocalLoadProfileSnapshot()?.canonicalProfile ?? null),
    [],
  );

  const result = useMemo(() => {
    if (!profile) return null;
    try {
      const demo = createDemoPhase6Input("low_export_home");
      const monthlyEnergyKwh = profile.intervals.reduce(
        (sum, interval) => sum + interval.energyKwh,
        0,
      );
      const billDate = profile.period.startInclusive.slice(0, 10);
      const tariffs = getOfficialThaiTariffPair({
        authority,
        customerSegment: "residential",
        billDate,
        monthlyEnergyKwh,
        voltageLevel: "low_voltage",
      });
      return runBatteryAnalysis(
        createBatteryAnalysisInputFromCanonicalLoadProfile({
          profile,
          solarIntervals: [],
          normalTariff: tariffs.normalTariff,
          touTariff: tariffs.touTariff,
          config: demo.batteryConfig,
          financialAssumptions: createDemoBatteryFinancialAssumptions(
            demo.batteryConfig,
          ),
          meterMode: "tou",
        }),
      );
    } catch (caught) {
      return {
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to run Battery analysis.",
      };
    }
  }, [authority, profile]);

  if (!profile) return null;
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Battery from saved Load Profile</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Dispatch uses `{profile.name}`. Equipment cost and capacity are
              screening assumptions.
            </p>
          </div>
          <Badge variant="success">Canonical Profile</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="grid w-fit gap-1 text-sm font-medium">
          Authority
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={authority}
            onChange={(event) => setAuthority(event.target.value as Authority)}
          >
            <option value="PEA">PEA</option>
            <option value="MEA">MEA</option>
          </select>
        </label>
        {result && "error" in result ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : null}
        {result && !("error" in result) ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Metric
              label="Before"
              value={`${format(result.financial.billBeforeBatteryThb)} THB`}
            />
            <Metric
              label="After"
              value={`${format(result.financial.billAfterBatteryThb)} THB`}
            />
            <Metric
              label="Annual saving"
              value={`${format(result.financial.annualBillSavingsThb)} THB`}
            />
            <Metric
              label="Discharged"
              value={`${format(result.dispatch.totalDischargedKwh)} kWh`}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
function format(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createDemoPhase6Input,
  createEvScenarioComparisonInputFromCanonicalLoadProfile,
  runEvScenarioComparison,
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type {
  Authority,
  CanonicalLoadProfile,
} from "@thai-energy-planner/shared-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

export function CanonicalEvPanel() {
  const [profile, setProfile] = useState<CanonicalLoadProfile | null>(null);
  const [authority, setAuthority] = useState<Authority>("PEA");
  useEffect(
    () => setProfile(readLocalLoadProfileSnapshot()?.canonicalProfile ?? null),
    [],
  );
  const comparison = useMemo(() => {
    if (!profile) return null;
    try {
      const demo = createDemoPhase6Input("ev_evening");
      const billDate = profile.period.startInclusive.slice(0, 10);
      const monthlyEnergyKwh = profile.intervals.reduce(
        (sum, item) => sum + item.energyKwh,
        0,
      );
      const tariffs = getOfficialThaiTariffPair({
        authority,
        customerSegment: "residential",
        billDate,
        monthlyEnergyKwh,
        voltageLevel: "low_voltage",
      });
      return runEvScenarioComparison(
        createEvScenarioComparisonInputFromCanonicalLoadProfile({
          profile,
          solarIntervals: [],
          normalTariff: tariffs.normalTariff,
          touTariff: tariffs.touTariff,
          config: demo.evConfig,
          meterMode: "tou",
        }),
      );
    } catch (caught) {
      return {
        error:
          caught instanceof Error
            ? caught.message
            : "Unable to run EV analysis.",
      };
    }
  }, [authority, profile]);
  if (!profile) return null;
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <CardTitle>EV from saved Load Profile</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Charging strategies use `{profile.name}`; vehicle and charger
              settings remain screening assumptions.
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
        {comparison && "error" in comparison ? (
          <p className="text-sm text-destructive">{comparison.error}</p>
        ) : null}
        {comparison && !("error" in comparison) ? (
          <div className="grid gap-3 md:grid-cols-4">
            {comparison.scenarios.map((item) => (
              <div
                className="rounded-md border border-border bg-card p-4"
                key={item.strategy}
              >
                <p className="text-xs text-muted-foreground">{item.strategy}</p>
                <p className="mt-2 font-semibold">
                  {format(item.monthlyBillIncreaseThb)} THB/mo
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(item.addedEvKwh)} kWh
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
function format(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

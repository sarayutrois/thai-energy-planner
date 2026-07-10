"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createScenarioInputFromCanonicalLoadProfile,
  runScenarioComparison,
} from "@thai-energy-planner/calculation-engine";
import { getOfficialThaiTariffPair } from "@thai-energy-planner/tariff-engine";
import type {
  Authority,
  CanonicalLoadProfile,
} from "@thai-energy-planner/shared-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";
import { ScenarioView } from "./scenario-view";

export function CanonicalScenarioPanel() {
  const [profile, setProfile] = useState<CanonicalLoadProfile | null>(null);
  const [authority, setAuthority] = useState<Authority>("PEA");
  const [customerSegment, setCustomerSegment] = useState<
    "residential" | "small_business"
  >("residential");

  useEffect(() => {
    setProfile(readLocalLoadProfileSnapshot()?.canonicalProfile ?? null);
  }, []);

  const result = useMemo(() => {
    if (!profile) return null;
    try {
      const monthlyEnergyKwh = profile.intervals.reduce(
        (sum, interval) => sum + interval.energyKwh,
        0,
      );
      const billDate = profile.period.startInclusive.slice(0, 10);
      const tariffs = getOfficialThaiTariffPair({
        authority,
        customerSegment,
        billDate,
        monthlyEnergyKwh,
        voltageLevel: "low_voltage",
      });
      return runScenarioComparison(
        createScenarioInputFromCanonicalLoadProfile({
          profile,
          normalTariff: tariffs.normalTariff,
          touTariff: tariffs.touTariff,
          billDate,
          meterSwitchingCostThb: 2500,
        }),
      );
    } catch (caught) {
      return {
        error:
          caught instanceof Error ? caught.message : "Unable to run Scenario.",
      };
    }
  }, [authority, customerSegment, profile]);

  if (!profile) return null;

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Scenario from saved Load Profile</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Using `{profile.name}` from {profile.source.kind}; this replaces
              demo data for the result below.
            </p>
          </div>
          <Badge variant="success">Canonical Profile</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Authority
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={authority}
              onChange={(event) =>
                setAuthority(event.target.value as Authority)
              }
            >
              <option value="PEA">PEA</option>
              <option value="MEA">MEA</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Customer segment
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={customerSegment}
              onChange={(event) =>
                setCustomerSegment(
                  event.target.value as "residential" | "small_business",
                )
              }
            >
              <option value="residential">Residential</option>
              <option value="small_business">Small business</option>
            </select>
          </label>
        </div>
        {result && "error" in result ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : null}
        {result && !("error" in result) ? (
          <ScenarioView comparison={result} />
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, History, RefreshCw } from "lucide-react";
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
import {
  hydrateLocalLoadProfileSnapshot,
  formatLocalLoadProfileLabel,
  listDistinctLocalLoadProfileSnapshots,
  readLocalLoadProfileSnapshot,
  selectLocalLoadProfileSnapshot,
  type LocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { ScenarioView } from "./scenario-view";

export function CanonicalScenarioPanel() {
  const [snapshot, setSnapshot] = useState<LocalLoadProfileSnapshot | null>(null);
  const [profiles, setProfiles] = useState<LocalLoadProfileSnapshot[]>([]);
  const [accountProfiles, setAccountProfiles] = useState<
    Array<{ id: string; name: string; intervalCount: number }>
  >([]);
  const [authority, setAuthority] = useState<Authority>("PEA");
  const [customerSegment, setCustomerSegment] = useState<
    "residential" | "small_business"
  >("residential");
  const [showHistory, setShowHistory] = useState(false);

  function refreshProfiles() {
    setProfiles(listDistinctLocalLoadProfileSnapshots());
    setSnapshot(readLocalLoadProfileSnapshot());
  }

  useEffect(() => {
    refreshProfiles();
    void authenticatedFetch("/api/load-profiles")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          profiles?: Array<{ id: string; name: string; intervalCount: number }>;
        }>;
      })
      .then((payload) => setAccountProfiles(payload?.profiles ?? []))
      .catch(() => setAccountProfiles([]));
  }, []);

  const activeSnapshot = snapshot;
  const profile: CanonicalLoadProfile | null = activeSnapshot?.canonicalProfile ?? null;

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

  if (!profile || !activeSnapshot) {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader><CardTitle>ยังไม่มี Load Profile สำหรับเปรียบเทียบ</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">นำเข้าไฟล์ CSV หรือสร้างโปรไฟล์จากเครื่องใช้ไฟฟ้าก่อน แล้วกลับมาคำนวณ Scenario ได้ทันที</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/analysis/load-data/import">นำเข้าไฟล์โหลด</a>
            <a className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium" href="/analysis/load-data/appliances">สร้างจากเครื่องใช้ไฟฟ้า</a>
          </div>
          {accountProfiles.length > 0 ? (
            <label className="mt-4 grid max-w-xl gap-1 text-sm font-medium">
              หรือเลือก Load Profile ที่บันทึกในบัญชี
              <select
                className="h-10 rounded-md border border-input bg-background px-3"
                defaultValue=""
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) return;
                  void authenticatedFetch(`/api/load-profiles/${id}`)
                    .then(async (response) => {
                      if (!response.ok) return null;
                      return response.json() as Promise<{
                        profile?: { id: string; canonicalProfile?: CanonicalLoadProfile };
                      }>;
                    })
                    .then((payload) => {
                      const remote = payload?.profile;
                      if (!remote?.canonicalProfile) return;
                      const hydrated = hydrateLocalLoadProfileSnapshot(
                        remote.canonicalProfile,
                        remote.id,
                      );
                      setSnapshot(hydrated);
                      setProfiles(listDistinctLocalLoadProfileSnapshots());
                    })
                    .catch(() => undefined);
                }}
              >
                <option value="">เลือกโปรไฟล์ในบัญชี</option>
                {accountProfiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.intervalCount.toLocaleString("th-TH")} intervals
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Scenario from saved Load Profile</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              ใช้ “{profile.name}” จาก {profile.source.kind} โดยไม่มีข้อมูลตัวอย่างปะปน
            </p>
          </div>
          <Badge variant="success">Canonical Profile</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <section className="rounded-md border border-border bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Load Profile ที่กำลังใช้</p>
              <p className="mt-1 font-semibold">{formatLocalLoadProfileLabel(activeSnapshot)}</p>
              <p className="mt-1 text-xs text-muted-foreground">อัปเดต {new Date(activeSnapshot.updatedAt).toLocaleString("th-TH-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted" type="button" onClick={refreshProfiles}><RefreshCw className="h-4 w-4" />รีเฟรชข้อมูลล่าสุด</button>
              {profiles.length > 1 ? <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted" type="button" onClick={() => setShowHistory((visible) => !visible)}><History className="h-4 w-4" />{showHistory ? "ซ่อนประวัติ" : "ดูประวัติ"}</button> : null}
            </div>
          </div>
          {showHistory ? <div className="mt-4 grid gap-2 border-t border-border pt-4">{profiles.map((item) => <button key={item.id} className={`flex items-center justify-between gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted ${item.id === activeSnapshot.id ? "border-primary bg-primary/5" : "border-border"}`} type="button" onClick={() => { const selected = selectLocalLoadProfileSnapshot(item.id); setSnapshot(selected); setShowHistory(false); refreshProfiles(); }}><span><span className="block font-medium">{formatLocalLoadProfileLabel(item)}</span><span className="mt-1 block text-xs text-muted-foreground">อัปเดต {new Date(item.updatedAt).toLocaleString("th-TH-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" })}</span></span>{item.id === activeSnapshot.id ? <Check className="h-4 w-4 text-primary" /> : null}</button>)}</div> : null}
        </section>
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

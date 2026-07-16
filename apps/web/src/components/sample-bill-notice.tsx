"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  readStoredBillWorkspace,
  storedBillWorkspaceMatchesProject,
} from "@/lib/local-bill-workspace";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
} from "@/lib/local-analysis-snapshot";
import {
  clearSampleLocalLoadProfiles,
  isSampleLocalLoadProfile,
  localLoadProfileMatchesProject,
  readLocalLoadProfileSnapshot,
} from "@/lib/local-load-profile";
import {
  analysisStorageChangedEvent,
  announceAnalysisStorageChanged,
} from "@/lib/analysis-storage";
import { clearStoredSolarAnalysis } from "@/lib/local-solar-analysis";
import {
  activeProjectChangedEvent,
  readActiveProject,
} from "@/lib/active-project";

export function SampleBillNotice() {
  const [hasSampleBills, setHasSampleBills] = useState(false);
  const [hasSampleProfile, setHasSampleProfile] = useState(false);

  const refresh = useCallback(() => {
    try {
      const projectId = readActiveProject(window.localStorage)?.id;
      const workspace = readStoredBillWorkspace();
      setHasSampleBills(
        workspace?.mode === "sample" &&
          storedBillWorkspaceMatchesProject(workspace, projectId),
      );
      const profile = readLocalLoadProfileSnapshot();
      setHasSampleProfile(
        localLoadProfileMatchesProject(profile, projectId) &&
          isSampleLocalLoadProfile(profile),
      );
    } catch {
      setHasSampleBills(false);
      setHasSampleProfile(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(analysisStorageChangedEvent, refresh);
    window.addEventListener(activeProjectChangedEvent, refresh);
    return () => {
      window.removeEventListener(analysisStorageChangedEvent, refresh);
      window.removeEventListener(activeProjectChangedEvent, refresh);
    };
  }, [refresh]);

  if (!hasSampleBills && !hasSampleProfile) return null;

  function clearSampleData() {
    if (hasSampleBills) {
      window.localStorage.removeItem(billWorkspaceStorageKey);
      window.localStorage.removeItem(billReportStorageKey);
    }
    if (hasSampleProfile) {
      clearSampleLocalLoadProfiles();
      clearStoredSolarAnalysis(
        window.localStorage,
        readActiveProject(window.localStorage)?.id,
      );
    }
    announceAnalysisStorageChanged();
    refresh();
  }

  return (
    <div className="mb-5 rounded-md border border-warning bg-warning/10 p-4 text-sm leading-6">
      <p className="font-semibold">คุณกำลังใช้ข้อมูลตัวอย่าง</p>
      <p className="mt-1 text-muted-foreground">
        {hasSampleBills && hasSampleProfile
          ? "บิลและ Load Profile ชุดนี้ไม่ใช่ข้อมูลจริงของคุณ"
          : hasSampleBills
            ? "บิลชุดนี้ไม่ใช่ข้อมูลค่าไฟจริงของคุณ"
            : "Load Profile ชุดนี้ไม่ใช่ข้อมูลการใช้ไฟจริงของคุณ"}
        ผลลัพธ์จึงใช้สำหรับทดลองขั้นตอนเท่านั้น
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          className="inline-flex font-medium text-primary hover:underline"
          href="/analysis/load-data"
        >
          แทนที่ด้วยข้อมูลของฉัน
        </Link>
        <button
          className="font-medium text-primary hover:underline"
          onClick={clearSampleData}
          type="button"
        >
          ล้างข้อมูลตัวอย่าง
        </button>
      </div>
    </div>
  );
}

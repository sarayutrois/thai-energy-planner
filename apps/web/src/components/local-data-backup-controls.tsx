"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  localAnalysisReportsStorageKey,
} from "@/lib/local-analysis-snapshot";
import {
  activeLocalLoadProfileIdStorageKey,
  localLoadProfileStorageKey,
  localLoadProfilesStorageKey,
} from "@/lib/local-load-profile";
import { downloadJsonFile } from "@/lib/file-download";

const backupKeys = [
  billWorkspaceStorageKey,
  billReportStorageKey,
  localAnalysisReportsStorageKey,
  localLoadProfileStorageKey,
  localLoadProfilesStorageKey,
  activeLocalLoadProfileIdStorageKey,
] as const;

type LocalBackup = {
  format: "thai-energy-planner-local-backup";
  version: 1;
  createdAt: string;
  data: Partial<Record<(typeof backupKeys)[number], string>>;
};

export function LocalDataBackupControls() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function exportBackup() {
    const data: LocalBackup["data"] = {};
    for (const key of backupKeys) {
      const value = window.localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }
    downloadJsonFile(
      `thai-energy-planner-backup-${new Date().toISOString().slice(0, 10)}.json`,
      {
        format: "thai-energy-planner-local-backup",
        version: 1,
        createdAt: new Date().toISOString(),
        data,
      } satisfies LocalBackup,
    );
    setStatus("สำรองข้อมูลในเครื่องแล้ว");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์มีขนาดเกิน 5 MB");
      const parsed = JSON.parse(await file.text()) as Partial<LocalBackup>;
      if (
        parsed.format !== "thai-energy-planner-local-backup" ||
        parsed.version !== 1 ||
        !parsed.data ||
        typeof parsed.data !== "object"
      )
        throw new Error("ไฟล์สำรองไม่ใช่รูปแบบของ Thai Energy Planner");
      for (const key of backupKeys) {
        const value = parsed.data[key];
        if (value !== undefined && typeof value !== "string")
          throw new Error("ข้อมูลในไฟล์สำรองไม่ถูกต้อง");
      }
      for (const key of backupKeys) window.localStorage.removeItem(key);
      for (const key of backupKeys) {
        const value = parsed.data[key];
        if (typeof value === "string") window.localStorage.setItem(key, value);
      }
      setStatus("กู้คืนข้อมูลแล้ว กำลังโหลดหน้าใหม่...");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (caught) {
      setStatus(
        caught instanceof Error ? caught.message : "กู้คืนข้อมูลไม่สำเร็จ",
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={exportBackup}
          type="button"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          สำรองข้อมูล
        </button>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          กู้คืนข้อมูล
        </button>
        <input
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void importBackup(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
      </div>
      {status ? (
        <p className="text-xs text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}

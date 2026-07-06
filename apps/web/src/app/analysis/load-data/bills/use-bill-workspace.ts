import { useEffect, useRef, useState } from "react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { type AnalysisAudience } from "@/lib/analysis-start";
import { billWorkspaceStorageKey, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";
import { parseBillCsv } from "@/lib/csv-parser";
import { exportToCsv } from "@thai-energy-planner/report-engine";
import { downloadJsonFile, downloadTextFile } from "@/lib/file-download";

function useDebouncedEffect(callback: () => void, deps: unknown[], delayMs: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(callback, delayMs);
    return () => clearTimeout(timerRef.current);
  }, deps);
}

function sanitizeRow(row: unknown): EditableBillRow {
  const obj = typeof row === "object" && row !== null
    ? (row as Record<string, unknown>)
    : {};
  return {
    id: typeof obj["id"] === "string" && obj["id"] ? obj["id"] : crypto.randomUUID(),
    month: typeof obj["month"] === "string" ? obj["month"] : "",
    energyKwh: typeof obj["energyKwh"] === "string" ? obj["energyKwh"] : String(obj["energyKwh"] ?? ""),
    totalCostThb: typeof obj["totalCostThb"] === "string" ? obj["totalCostThb"] : String(obj["totalCostThb"] ?? ""),
    authority: obj["authority"] === "MEA" ? "MEA" : "PEA",
    meterMode: obj["meterMode"] === "tou" ? "tou" : "normal",
  };
}

export type EditableBillRow = {
  id: string;
  month: string;
  energyKwh: string;
  totalCostThb: string;
  authority: "PEA" | "MEA";
  meterMode: "normal" | "tou";
};

export function useBillWorkspace(initialBills: MonthlyBillInput[], audience: AnalysisAudience) {
  const [rows, setRows] = useState<EditableBillRow[]>(() => loadStoredRows(initialBills, audience));
  const [saveStatus, setSaveStatus] = useState("บันทึกในเครื่องอัตโนมัติ");

  useDebouncedEffect(() => {
    const payload: StoredBillWorkspace = {
      audience,
      rows,
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(billWorkspaceStorageKey, JSON.stringify(payload));
    setSaveStatus(`บันทึกอัตโนมัติ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
  }, [audience, rows], 500);

  function updateRow(id: string, patch: Partial<EditableBillRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const latest = rows
      .map((row) => row.month)
      .filter(Boolean)
      .sort()
      .at(-1);
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        month: nextMonth(latest),
        energyKwh: "",
        totalCostThb: "",
        authority: current.at(-1)?.authority ?? "PEA",
        meterMode: current.at(-1)?.meterMode ?? "normal"
      }
    ]);
  }

  function removeRow(id: string) {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  }

  function upsertRow(patch: Partial<EditableBillRow> & { month: string }) {
    setRows((current) => {
      const existingIdx = current.findIndex(r => r.month === patch.month);
      if (existingIdx !== -1) {
        const next = [...current];
        next[existingIdx] = { ...next[existingIdx], ...patch } as EditableBillRow;
        return next;
      }
      return [...current, {
        id: crypto.randomUUID(),
        month: patch.month,
        energyKwh: patch.energyKwh || "",
        totalCostThb: patch.totalCostThb || "",
        authority: (patch.authority as "PEA" | "MEA") || current.at(-1)?.authority || "PEA",
        meterMode: current.at(-1)?.meterMode ?? "normal"
      }].sort((a, b) => a.month.localeCompare(b.month));
    });
  }

  function loadExample(kind: "home" | "shop") {
    const multiplier = kind === "shop" ? 2.4 : 1;
    setRows(
      initialBills.map((bill, index) => ({
        ...toEditableRow({
          ...bill,
          customerSegment: kind === "shop" ? "small_business" : "residential",
          energyKwh: Math.round(bill.energyKwh * multiplier + index * 18),
          totalCostThb: Math.round(bill.totalCostThb * multiplier + index * 95)
        }),
        authority: "PEA"
      }))
    );
  }

  function resetWorkspace() {
    window.localStorage.removeItem(billWorkspaceStorageKey);
    setRows(initialBills.map(toEditableRow));
  }

  function exportWorkspace() {
    const payload: StoredBillWorkspace = {
      audience,
      rows,
      updatedAt: new Date().toISOString()
    };
    downloadJsonFile("thai-energy-planner-bills.json", payload);
  }

  function exportWorkspaceCsv() {
    downloadTextFile(
      "thai-energy-planner-bills.csv",
      exportToCsv(
        rows.map((row) => ({
          authority: row.authority,
          energyKwh: row.energyKwh,
          meterMode: row.meterMode,
          month: row.month,
          totalCostThb: row.totalCostThb
        }))
      ),
      "text/csv;charset=utf-8"
    );
  }

  async function importWorkspace(file: File | undefined, clearInputCallback?: () => void) {
    if (!file) return;
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
    const MAX_IMPORT_ROWS = 120; // 10 years of monthly data
    if (file.size > MAX_FILE_SIZE) {
      setSaveStatus("ไฟล์ใหญ่เกิน 2 MB");
      return;
    }

    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".csv") || text.trimStart().startsWith("month,")) {
        const importedRows = parseBillCsv(text);
        if (importedRows.length === 0) {
          setSaveStatus("ไฟล์ CSV ไม่มีข้อมูลบิลที่นำเข้าได้");
          return;
        }
        setRows(importedRows);
        setSaveStatus("นำเข้า CSV แล้ว");
        return;
      }

      const raw: unknown = JSON.parse(text);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        setSaveStatus("ไฟล์ JSON ไม่ถูกรูปแบบ");
        return;
      }
      const parsed = raw as Record<string, unknown>;
      const rawRows = parsed["rows"];
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        setSaveStatus("ไฟล์ไม่มีข้อมูลบิลที่นำเข้าได้");
        return;
      }
      if (rawRows.length > MAX_IMPORT_ROWS) {
        setSaveStatus(`จำนวนแถวเกิน ${MAX_IMPORT_ROWS} แถว`);
        return;
      }

      setRows(rawRows.map(sanitizeRow));
      setSaveStatus("นำเข้าข้อมูลบิลแล้ว");
    } catch {
      setSaveStatus("นำเข้าไฟล์ไม่สำเร็จ");
    } finally {
      if (clearInputCallback) clearInputCallback();
    }
  }

  return {
    rows,
    saveStatus,
    updateRow,
    addRow,
    removeRow,
    loadExample,
    resetWorkspace,
    exportWorkspace,
    exportWorkspaceCsv,
    importWorkspace,
    upsertRow
  };
}

export function toEditableRow(bill: MonthlyBillInput): EditableBillRow {
  return {
    id: crypto.randomUUID(),
    month: bill.month,
    energyKwh: String(bill.energyKwh),
    totalCostThb: String(bill.totalCostThb),
    authority: bill.authority ?? "PEA",
    meterMode: bill.meterMode ?? "normal"
  };
}

export function toBillInput(row: EditableBillRow): MonthlyBillInput {
  const kwh = Number(row.energyKwh);
  const cost = Number(row.totalCostThb);
  return {
    month: row.month,
    energyKwh: Number.isFinite(kwh) ? kwh : 0,
    totalCostThb: Number.isFinite(cost) ? cost : 0,
    authority: row.authority,
    meterMode: row.meterMode,
    customerSegment: "residential"
  };
}

function loadStoredRows(initialBills: MonthlyBillInput[], audience: AnalysisAudience): EditableBillRow[] {
  if (typeof window === "undefined") return initialBills.map(toEditableRow);

  try {
    const raw = window.localStorage.getItem(billWorkspaceStorageKey);
    if (!raw) return initialBills.map(toEditableRow);
    const parsed = JSON.parse(raw) as Partial<StoredBillWorkspace>;
    if (parsed.audience !== audience || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return initialBills.map(toEditableRow);
    }

    return parsed.rows.map(sanitizeRow);
  } catch {
    return initialBills.map(toEditableRow);
  }
}

function nextMonth(month: string | undefined): string {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!month) return fallback;
  const parts = month.split("-").map(Number);
  const year = parts[0];
  const monthNumber = parts[1];
  if (year === undefined || monthNumber === undefined || !Number.isFinite(year) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return fallback;
  }
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

import { useEffect, useState } from "react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { type AnalysisAudience } from "@/lib/analysis-start";
import { billWorkspaceStorageKey, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";
import { parseBillCsv } from "@/lib/csv-parser";
import { exportToCsv } from "@thai-energy-planner/report-engine";
import { downloadJsonFile, downloadTextFile } from "@/lib/file-download";

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

  useEffect(() => {
    const payload: StoredBillWorkspace = {
      audience,
      rows,
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(billWorkspaceStorageKey, JSON.stringify(payload));
    setSaveStatus(`บันทึกอัตโนมัติ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
  }, [audience, rows]);

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

      const parsed = JSON.parse(text) as Partial<StoredBillWorkspace>;
      if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
        setSaveStatus("ไฟล์ไม่มีข้อมูลบิลที่นำเข้าได้");
        return;
      }

      setRows(
        parsed.rows.map((row) => ({
          id: row.id || crypto.randomUUID(),
          month: row.month ?? "",
          energyKwh: row.energyKwh ?? "",
          totalCostThb: row.totalCostThb ?? "",
          authority: row.authority === "MEA" ? "MEA" : "PEA",
          meterMode: row.meterMode === "tou" ? "tou" : "normal"
        }))
      );
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
    importWorkspace
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
  return {
    month: row.month,
    energyKwh: Number(row.energyKwh),
    totalCostThb: Number(row.totalCostThb),
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

    return parsed.rows.map((row) => ({
      id: row.id || crypto.randomUUID(),
      month: row.month ?? "",
      energyKwh: row.energyKwh ?? "",
      totalCostThb: row.totalCostThb ?? "",
      authority: row.authority === "MEA" ? "MEA" : "PEA",
      meterMode: row.meterMode === "tou" ? "tou" : "normal"
    }));
  } catch {
    return initialBills.map(toEditableRow);
  }
}

function nextMonth(month: string | undefined) {
  if (!month) return "2026-05";
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return "2026-05";
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

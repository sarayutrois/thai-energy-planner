import { useEffect, useRef, useState } from "react";
import type { MonthlyBillInput } from "@thai-energy-planner/shared-types";
import { type AnalysisAudience } from "@/lib/analysis-start";
import {
  billReportStorageKey,
  billWorkspaceStorageKey,
  type BillWorkspaceMode,
  type StoredBillWorkspace,
} from "@/lib/local-analysis-snapshot";
import { parseBillCsv } from "@/lib/csv-parser";
import { exportToCsv } from "@thai-energy-planner/report-engine";
import { downloadJsonFile, downloadTextFile } from "@/lib/file-download";
import {
  getStoredWorkspaceMode,
  sampleHomeBills,
} from "./bill-workspace-state";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";

function useDebouncedEffect(
  callback: () => void,
  deps: unknown[],
  delayMs: number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(callback, delayMs);
    return () => clearTimeout(timerRef.current);
  }, deps);
}

function sanitizeRow(row: unknown): EditableBillRow {
  const obj =
    typeof row === "object" && row !== null
      ? (row as Record<string, unknown>)
      : {};
  return {
    id:
      typeof obj["id"] === "string" && obj["id"]
        ? obj["id"]
        : crypto.randomUUID(),
    month: typeof obj["month"] === "string" ? obj["month"] : "",
    energyKwh:
      typeof obj["energyKwh"] === "string"
        ? obj["energyKwh"]
        : String(obj["energyKwh"] ?? ""),
    totalCostThb:
      typeof obj["totalCostThb"] === "string"
        ? obj["totalCostThb"]
        : String(obj["totalCostThb"] ?? ""),
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

export function useBillWorkspace(
  initialBills: MonthlyBillInput[],
  audience: AnalysisAudience,
) {
  const [workspace, setWorkspace] = useState(() =>
    createInitialWorkspace(initialBills),
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  const { mode, rows } = workspace;
  const [saveStatus, setSaveStatus] = useState("บันทึกในเครื่องอัตโนมัติ");

  useEffect(() => {
    setWorkspace(loadStoredWorkspace(initialBills, audience));
    setHasHydrated(true);
  }, [audience, initialBills]);

  useDebouncedEffect(
    () => {
      if (!hasHydrated) return;
      if (mode === "empty") {
        window.localStorage.removeItem(billWorkspaceStorageKey);
        setSaveStatus("ยังไม่มีข้อมูลที่บันทึกไว้");
        return;
      }
      const payload: StoredBillWorkspace = {
        audience,
        mode,
        rows,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(
        billWorkspaceStorageKey,
        JSON.stringify(payload),
      );
      window.localStorage.removeItem(billReportStorageKey);
      setSaveStatus(
        `บันทึกอัตโนมัติ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`,
      );
    },
    [audience, hasHydrated, mode, rows],
    500,
  );

  function updateRow(id: string, patch: Partial<EditableBillRow>) {
    setWorkspace((current) => {
      if (current.mode === "sample") {
        return { mode: "user", rows: [{ ...emptyRow(), id, ...patch }] };
      }
      return {
        mode: "user",
        rows: current.rows.map((row) =>
          row.id === id ? { ...row, ...patch } : row,
        ),
      };
    });
  }

  function addRow() {
    const latest = rows
      .map((row) => row.month)
      .filter(Boolean)
      .sort()
      .at(-1);
    setWorkspace((current) => ({
      mode: "user",
      rows:
        current.mode === "sample"
          ? [{ ...emptyRow(), month: nextMonth(undefined) }]
          : [
              ...current.rows,
              {
                ...emptyRow(),
                month: nextMonth(latest),
                authority: current.rows.at(-1)?.authority ?? "PEA",
                meterMode: current.rows.at(-1)?.meterMode ?? "normal",
              },
            ],
    }));
  }

  function removeRow(id: string) {
    setWorkspace((current) => {
      const rows = current.rows.filter((row) => row.id !== id);
      return { mode: rows.length === 0 ? "empty" : current.mode, rows };
    });
  }

  function upsertRow(patch: Partial<EditableBillRow> & { month: string }) {
    setWorkspace((current) => {
      if (current.mode === "sample") {
        return {
          mode: "user",
          rows: [{ ...emptyRow(), ...patch, id: crypto.randomUUID() }],
        };
      }
      const rows = current.rows;
      const existingIdx = rows.findIndex((r) => r.month === patch.month);
      if (existingIdx !== -1) {
        const next = [...rows];
        next[existingIdx] = {
          ...next[existingIdx],
          ...patch,
        } as EditableBillRow;
        return { mode: "user", rows: next };
      }
      return {
        mode: "user",
        rows: [
          ...rows,
          {
            id: crypto.randomUUID(),
            month: patch.month,
            energyKwh: patch.energyKwh || "",
            totalCostThb: patch.totalCostThb || "",
            authority:
              (patch.authority as "PEA" | "MEA") ||
              rows.at(-1)?.authority ||
              "PEA",
            meterMode: rows.at(-1)?.meterMode ?? "normal",
          },
        ].sort((a, b) => a.month.localeCompare(b.month)),
      };
    });
  }

  function loadExample() {
    const sampleRows = sampleHomeBills.map(toEditableRow);
    setWorkspace({ mode: "sample", rows: sampleRows });
    persistWorkspace(audience, "sample", sampleRows);
  }

  function resetWorkspace() {
    window.localStorage.removeItem(billWorkspaceStorageKey);
    setWorkspace({ mode: "empty", rows: [] });
  }

  function startUserEntry() {
    setWorkspace({ mode: "user", rows: [] });
  }

  function exportWorkspace() {
    const payload: StoredBillWorkspace = {
      audience,
      mode,
      rows,
      updatedAt: new Date().toISOString(),
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
          totalCostThb: row.totalCostThb,
        })),
      ),
      "text/csv;charset=utf-8",
    );
  }

  async function importWorkspace(
    file: File | undefined,
    clearInputCallback?: () => void,
  ) {
    if (!file) return;
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
    const MAX_IMPORT_ROWS = 120; // 10 years of monthly data
    if (file.size > MAX_FILE_SIZE) {
      setSaveStatus("ไฟล์ใหญ่เกิน 2 MB");
      return;
    }

    try {
      const text = await file.text();
      if (
        file.name.toLowerCase().endsWith(".csv") ||
        text.trimStart().startsWith("month,")
      ) {
        const importedRows = parseBillCsv(text);
        if (importedRows.length === 0) {
          setSaveStatus("ไฟล์ CSV ไม่มีข้อมูลบิลที่นำเข้าได้");
          return;
        }
        setWorkspace({ mode: "user", rows: importedRows });
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

      setWorkspace({ mode: "user", rows: rawRows.map(sanitizeRow) });
      setSaveStatus("นำเข้าข้อมูลบิลแล้ว");
    } catch {
      setSaveStatus("นำเข้าไฟล์ไม่สำเร็จ");
    } finally {
      if (clearInputCallback) clearInputCallback();
    }
  }

  return {
    rows,
    mode,
    saveStatus,
    updateRow,
    addRow,
    removeRow,
    loadExample,
    resetWorkspace,
    startUserEntry,
    exportWorkspace,
    exportWorkspaceCsv,
    importWorkspace,
    upsertRow,
  };
}

export function toEditableRow(bill: MonthlyBillInput): EditableBillRow {
  return {
    id: crypto.randomUUID(),
    month: bill.month,
    energyKwh: String(bill.energyKwh),
    totalCostThb: String(bill.totalCostThb),
    authority: bill.authority ?? "PEA",
    meterMode: bill.meterMode ?? "normal",
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
    customerSegment: "residential",
  };
}

function loadStoredWorkspace(
  initialBills: MonthlyBillInput[],
  audience: AnalysisAudience,
): { mode: BillWorkspaceMode; rows: EditableBillRow[] } {
  if (typeof window === "undefined")
    return createInitialWorkspace(initialBills);

  try {
    const parsed = readStoredBillWorkspace();
    if (!parsed)
      return {
        mode: initialBills.length > 0 ? "user" : "empty",
        rows: initialBills.map(toEditableRow),
      };
    const mode = getStoredWorkspaceMode(parsed, audience);
    return {
      mode,
      rows: mode === "empty" ? [] : parsed.rows!.map(sanitizeRow),
    };
  } catch {
    return {
      mode: initialBills.length > 0 ? "user" : "empty",
      rows: initialBills.map(toEditableRow),
    };
  }
}

function createInitialWorkspace(initialBills: MonthlyBillInput[]): {
  mode: BillWorkspaceMode;
  rows: EditableBillRow[];
} {
  return {
    mode: initialBills.length > 0 ? "user" : "empty",
    rows: initialBills.map(toEditableRow),
  };
}

function persistWorkspace(
  audience: AnalysisAudience,
  mode: BillWorkspaceMode,
  rows: EditableBillRow[],
) {
  window.localStorage.setItem(
    billWorkspaceStorageKey,
    JSON.stringify({
      audience,
      mode,
      rows,
      updatedAt: new Date().toISOString(),
    } satisfies StoredBillWorkspace),
  );
  window.localStorage.removeItem(billReportStorageKey);
}

function emptyRow(): EditableBillRow {
  return {
    id: crypto.randomUUID(),
    month: "",
    energyKwh: "",
    totalCostThb: "",
    authority: "PEA",
    meterMode: "normal",
  };
}

function nextMonth(month: string | undefined): string {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!month) return fallback;
  const parts = month.split("-").map(Number);
  const year = parts[0];
  const monthNumber = parts[1];
  if (
    year === undefined ||
    monthNumber === undefined ||
    !Number.isFinite(year) ||
    !Number.isFinite(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return fallback;
  }
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

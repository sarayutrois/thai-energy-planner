"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, LockKeyhole } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readLocalAnalysisReports } from "@/lib/local-analysis-report";
import { readStoredBillWorkspace } from "@/lib/local-bill-workspace";
import { readLocalLoadProfileSnapshot } from "@/lib/local-load-profile";

type Step = {
  label: string;
  href: string;
  activePaths: string[];
  done: boolean;
  missing: string;
};

function buildSteps(): Step[] {
  let hasBills = false;
  let hasProfile = false;
  let hasAnalysis = false;

  try {
    const workspace = readStoredBillWorkspace();
    hasBills = Boolean(
      workspace?.mode === "user" &&
      workspace.rows.some(
        (row) => Number(row.energyKwh) > 0 && Number(row.totalCostThb) > 0,
      ),
    );
    hasProfile = Boolean(readLocalLoadProfileSnapshot()?.canonicalProfile);
    hasAnalysis = readLocalAnalysisReports().some(
      (report) => report.module === "scenario" || report.module === "solar",
    );
  } catch {
    // The checklist remains actionable if a legacy or corrupt local value is found.
  }

  return [
    {
      label: "เริ่มต้น",
      href: "/analysis/new",
      activePaths: ["/analysis/new"],
      done: true,
      missing: "เลือกเป้าหมาย",
    },
    {
      label: "รูปแบบการใช้ไฟ",
      href: "/analysis/load-data/appliances",
      activePaths: [
        "/analysis/load-data",
        "/analysis/load-data/appliances",
        "/analysis/load-data/import",
        "/analysis/load-data/upload",
      ],
      done: hasProfile,
      missing: "สร้างจากเครื่องใช้ไฟฟ้าหรือนำเข้าไฟล์",
    },
    {
      label: "บิลค่าไฟ",
      href: "/analysis/load-data/bills",
      activePaths: [
        "/analysis/load-data/bills",
        "/analysis/load-data/dashboard",
      ],
      done: hasBills,
      missing: "เพิ่มบิลอย่างน้อย 1 เดือน",
    },
    {
      label: "วิเคราะห์ทางเลือก",
      href: "/analysis/scenarios",
      activePaths: ["/analysis/scenarios", "/analysis/solar"],
      done: hasAnalysis,
      missing: "เทียบ TOU หรือ Solar",
    },
    {
      label: "สรุปและรายงาน",
      href: "/analysis/reports",
      activePaths: ["/analysis/reports"],
      done: false,
      missing: "สร้างรายงานเมื่อพร้อม",
    },
  ];
}

export function AnalysisProgress() {
  const pathname = usePathname();
  const [steps, setSteps] = useState<Step[]>([]);
  const refresh = useCallback(() => setSteps(buildSteps()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [pathname, refresh]);

  if (
    !pathname.startsWith("/analysis") ||
    pathname.startsWith("/analysis/unavailable")
  )
    return null;
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) =>
      step.activePaths.some(
        (path) =>
          pathname === path ||
          (path !== "/analysis/load-data" && pathname.startsWith(`${path}/`)),
      ),
    ),
  );

  return (
    <aside
      aria-label="ความคืบหน้าการวิเคราะห์"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <p className="shrink-0 text-xs font-semibold text-foreground">
            แผนวิเคราะห์ของคุณ
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            ทำทีละขั้น ข้อมูลที่บันทึกไว้จะไม่หาย
          </p>
        </div>
        <ol
          className="mt-3 grid grid-flow-col auto-cols-[minmax(9rem,1fr)] gap-2 overflow-x-auto pb-1"
          aria-label="ขั้นตอนการวิเคราะห์"
        >
          {steps.map((step, index) => {
            const active = index === currentIndex;
            const unlocked =
              index === 0 ||
              steps.slice(0, index).some((item) => item.done) ||
              active;
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-h-14 min-w-36 items-start gap-2 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${
                    active
                      ? "border-primary bg-primary/8"
                      : step.done
                        ? "border-success/40 bg-success/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    />
                  ) : unlocked ? (
                    <Circle
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    />
                  ) : (
                    <LockKeyhole
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    />
                  )}
                  <span>
                    <span className="block text-xs font-semibold">
                      {index + 1}. {step.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                      {step.done ? "เสร็จแล้ว" : step.missing}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

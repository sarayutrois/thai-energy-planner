"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalBillReportSnapshot } from "@/lib/local-bill-report";
import { localBillReportId, type LocalBillReportSnapshot } from "@/lib/local-analysis-snapshot";

export function LocalReportCard() {
  const [snapshot, setSnapshot] = useState<LocalBillReportSnapshot | null>(null);

  useEffect(() => {
    try {
      setSnapshot(readLocalBillReportSnapshot());
    } catch {
      setSnapshot(null);
    }
  }, []);

  if (!snapshot) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />
              รายงานจากบิลล่าสุด
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              สร้างจากข้อมูลที่กรอกใน browser นี้ เมื่อ {new Date(snapshot.createdAt).toLocaleString("th-TH")}
            </p>
          </div>
          <Badge variant="success">Local</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="เดือน" value={`${snapshot.monthCount}`} />
          <Metric label="ค่าไฟรวม" value={`${formatNumber(snapshot.totalCostThb)} บาท`} />
          <Metric label="เฉลี่ย/เดือน" value={`${formatNumber(snapshot.averageMonthlyCostThb)} บาท`} />
        </div>
        <a
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
          href={`/analysis/reports/${localBillReportId}`}
        >
          เปิดรายงานนี้
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

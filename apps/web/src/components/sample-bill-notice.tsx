"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { billWorkspaceStorageKey, type StoredBillWorkspace } from "@/lib/local-analysis-snapshot";

export function SampleBillNotice() {
  const [hasSampleBills, setHasSampleBills] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(billWorkspaceStorageKey);
      const workspace = raw ? JSON.parse(raw) as Partial<StoredBillWorkspace> : null;
      setHasSampleBills(workspace?.mode === "sample");
    } catch {
      setHasSampleBills(false);
    }
  }, []);

  if (!hasSampleBills) return null;

  return (
    <div className="mb-5 rounded-md border border-warning bg-warning/10 p-4 text-sm leading-6">
      <p className="font-semibold">กำลังใช้ข้อมูลบิลตัวอย่าง — ตัวเลขเหล่านี้ยังไม่ใช่ข้อมูลค่าไฟของคุณ</p>
      <p className="mt-1 text-muted-foreground">หน้านี้จะไม่ถือข้อมูลตัวอย่างเป็นข้อมูลจริง และจะไม่บันทึกผลเป็นรายงานของคุณ</p>
      <Link className="mt-2 inline-flex font-medium text-primary hover:underline" href="/analysis/load-data/bills">ล้างข้อมูลตัวอย่างหรือเริ่มกรอกข้อมูลของฉัน</Link>
    </div>
  );
}

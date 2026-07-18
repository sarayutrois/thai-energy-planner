"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SolarError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  void error;
  return (
    <main className="energy-workspace-bg min-h-screen">
      <section className="mx-auto w-full max-w-[90rem] px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <Card className="energy-panel-solar shadow-panel">
          <CardContent className="p-6">
            <p className="text-sm font-medium">
              ไม่สามารถแสดงผลการประเมิน Solar ได้
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ตรวจสอบค่าที่กรอก เช่น ขนาดระบบ Solar, ต้นทุนติดตั้ง, อายุโครงการ
              และอัตรารับซื้อไฟฟ้า แล้วลองคำนวณอีกครั้ง
            </p>
            <Button className="mt-4" onClick={reset}>
              ลองอีกครั้ง
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

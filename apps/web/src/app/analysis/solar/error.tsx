"use client";

import { MainNav } from "@/components/main-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SolarError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium">ไม่สามารถแสดงผล Solar Analysis ได้</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ตรวจสอบค่าที่กรอก เช่น ขนาด Solar, CAPEX, อายุโครงการ และ export rate แล้วลองรันใหม่
            </p>
            <p className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              {error.message}
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

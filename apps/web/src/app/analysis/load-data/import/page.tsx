import { FileUp } from "lucide-react";
import { AnalysisStartContextCard } from "@/components/analysis-start-context-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadProfileImporter } from "@/components/load-profile-importer";
import { getAnalysisStartContext, type AnalysisStartSearchParams } from "@/lib/analysis-start";

export default async function ImportLoadPage({ searchParams }: { searchParams?: Promise<AnalysisStartSearchParams> }) {
  const startContext = getAnalysisStartContext((await searchParams) ?? {}, "interval");

  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>นำเข้าข้อมูลจาก CSV หรือ XLSX</Badge>
          <Badge variant="outline">Asia/Bangkok</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">นำเข้าข้อมูลการใช้ไฟ</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          รองรับ CSV/XLSX พร้อมการจับคู่คอลัมน์ข้อมูล ช่วงเวลา 15/30/60 นาที และตัวอย่างข้อมูลก่อนนำเข้าจริง ระบบต้องการข้อมูลวันและเวลาร่วมกับพลังงานไฟฟ้า (kWh) หรือกำลังไฟฟ้า (kW)
        </p>

        <AnalysisStartContextCard {...startContext} />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="h-5 w-5 text-primary" />
              ตัวอย่างข้อมูลก่อนนำเข้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoadProfileImporter />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

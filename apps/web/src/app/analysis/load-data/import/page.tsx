import { FileUp } from "lucide-react";
import { AnalysisStartContextCard } from "@/components/analysis-start-context-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadProfileImporter } from "@/components/load-profile-importer";
import { PageHeader } from "@/components/ui/page-layout";
import {
  getAnalysisStartContext,
  type AnalysisStartSearchParams,
} from "@/lib/analysis-start";

export default async function ImportLoadPage({
  searchParams,
}: {
  searchParams?: Promise<AnalysisStartSearchParams>;
}) {
  const startContext = getAnalysisStartContext(
    (await searchParams) ?? {},
    "interval",
  );

  return (
    <main className="energy-workspace-bg min-h-screen">
      <section className="mx-auto w-full max-w-[90rem] px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>นำเข้าข้อมูลจาก CSV หรือ XLSX</Badge>
          <Badge variant="outline">Asia/Bangkok</Badge>
        </div>
        <PageHeader
          eyebrow="ข้อมูลของฉัน · มิเตอร์"
          title="นำเข้าข้อมูลการใช้ไฟ"
          description="รองรับ CSV/XLSX พร้อมการจับคู่คอลัมน์ ช่วงเวลา 15, 30 หรือ 60 นาที และแสดงตัวอย่างก่อนนำเข้าจริง โดยต้องมีวันเวลาร่วมกับพลังงาน (kWh) หรือกำลังไฟฟ้า (kW)"
        />

        <AnalysisStartContextCard {...startContext} />

        <Card className="energy-panel-load mt-6 shadow-panel">
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

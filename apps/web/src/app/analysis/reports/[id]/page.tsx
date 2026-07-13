import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { localAnalysisReportIdPrefix, localBillReportId } from "@/lib/local-analysis-snapshot";
import { LocalAnalysisReport } from "./local-analysis-report";
import { LocalBillReport } from "./local-bill-report";

export default async function AnalysisReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === localBillReportId) {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5 flex flex-wrap gap-2 print:hidden">
            <Badge>ตัวอย่างรายงาน</Badge>
            <Badge variant="outline">ข้อมูลบิลที่บันทึกในอุปกรณ์นี้</Badge>
          </div>
          <LocalBillReport />
        </section>
      </main>
    );
  }

  if (id.startsWith(localAnalysisReportIdPrefix)) {
    return (
      <main className="min-h-screen bg-background">
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5 flex flex-wrap gap-2 print:hidden">
            <Badge>ตัวอย่างรายงาน</Badge>
            <Badge variant="outline">รายงานผลวิเคราะห์ที่บันทึกไว้</Badge>
          </div>
          <LocalAnalysisReport id={id} />
        </section>
      </main>
    );
  }

  notFound();
}

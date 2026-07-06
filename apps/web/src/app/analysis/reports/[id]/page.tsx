import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { localAnalysisReportIdPrefix, localBillReportId } from "@/lib/local-analysis-snapshot";
import { LocalAnalysisReport } from "./local-analysis-report";
import { LocalBillReport } from "./local-bill-report";

export default async function AnalysisReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === localBillReportId) {
    return (
      <main className="min-h-screen bg-background">
        <MainNav />
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5 flex flex-wrap gap-2 print:hidden">
            <Badge>Report Preview</Badge>
            <Badge variant="outline">Local bill snapshot</Badge>
          </div>
          <LocalBillReport />
        </section>
      </main>
    );
  }

  if (id.startsWith(localAnalysisReportIdPrefix)) {
    return (
      <main className="min-h-screen bg-background">
        <MainNav />
        <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-5 flex flex-wrap gap-2 print:hidden">
            <Badge>Report Preview</Badge>
            <Badge variant="outline">Saved analysis report</Badge>
          </div>
          <LocalAnalysisReport id={id} />
        </section>
      </main>
    );
  }

  notFound();
}

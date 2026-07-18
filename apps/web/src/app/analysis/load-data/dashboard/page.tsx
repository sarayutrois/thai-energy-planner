import { EnergyOverviewDashboard } from "./energy-overview-dashboard";
import { LocalBillSummary } from "./local-bill-summary";
import { ProjectLoadProfileSync } from "./project-load-profile-sync";
import { PageHeader } from "@/components/ui/page-layout";

export default function LoadDashboardPage() {
  return (
    <main className="energy-workspace-bg min-h-screen">
      <section className="mx-auto w-full max-w-[90rem] px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="My energy workspace"
          title="แผนพลังงานของคุณในที่เดียว"
          description="ดูสถานะข้อมูล รูปแบบการใช้ไฟ และสิ่งที่ควรทำต่อ ก่อนเปรียบเทียบ TOU หรือประเมิน Solar"
        />
        <ProjectLoadProfileSync />
        <EnergyOverviewDashboard />
        <LocalBillSummary />
      </section>
    </main>
  );
}

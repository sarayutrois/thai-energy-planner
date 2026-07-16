import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/ui/page-layout";
import { ProjectManager } from "./project-manager";

export default function AnalysisProjectsPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              ข้อมูลของฉัน · โปรเจกต์
            </span>
          }
          title="จัดการโปรเจกต์พลังงาน"
          description="แยกบ้าน ร้านค้า หรือสำนักงานออกจากกัน แล้วเลือกโปรเจกต์ที่จะรับ Load Profile และรายงานที่บันทึกลงบัญชี"
        />
        <ProjectManager />
      </section>
    </main>
  );
}

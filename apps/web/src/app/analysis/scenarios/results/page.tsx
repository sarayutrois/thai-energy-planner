import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/main-nav";
import { CanonicalScenarioPanel } from "../canonical-scenario-panel";

export default function ScenarioResultsPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Scenario Results</Badge>
          <Badge variant="success">Canonical Load Profile</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          ผลเปรียบเทียบค่าไฟ
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          ผลลัพธ์นี้คำนวณจาก Load Profile ที่เลือกเท่านั้น ไม่มีข้อมูลตัวอย่างปะปน
        </p>
        <CanonicalScenarioPanel />
      </section>
    </main>
  );
}

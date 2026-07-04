import { MainNav } from "@/components/main-nav";
import { StartAnalysisWizard } from "./start-analysis-wizard";

export default function NewAnalysisPage() {
  return (
    <main className="min-h-screen bg-background">
      <MainNav />
      <StartAnalysisWizard />
    </main>
  );
}

import { StartAnalysisWizard } from "./start-analysis-wizard";

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const fresh = (await searchParams)?.fresh === "1";
  return (
    <main className="min-h-screen bg-background">
      <StartAnalysisWizard fresh={fresh} />
    </main>
  );
}

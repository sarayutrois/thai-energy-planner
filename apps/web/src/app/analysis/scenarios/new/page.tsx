import { PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainNav } from "@/components/main-nav";
import { scenarioProfileOptions } from "@/lib/scenario-demo";

export default function NewScenarioPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="flex flex-wrap gap-2">
          <Badge>Scenario Setup</Badge>
          <Badge variant="outline">Sample Load Profile</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">สร้าง Scenario เปรียบเทียบ</h1>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle aria-hidden="true" className="h-5 w-5 text-primary" />
              ตั้งค่าและ Run Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/analysis/scenarios/results" className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium">
                  Load Profile
                  <select name="profile" className="h-10 rounded-md border border-input bg-background px-3">
                    {scenarioProfileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Current tariff
                  <select name="normalTariff" className="h-10 rounded-md border border-input bg-background px-3">
                    <option value="official-seed-normal">Official seed - Normal</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Candidate tariff
                  <select name="touTariff" className="h-10 rounded-md border border-input bg-background px-3">
                    <option value="official-seed-tou">Official seed - TOU</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-5">
                <label className="grid gap-2 text-sm font-medium">
                  ค่าเปลี่ยนมิเตอร์
                  <input name="meterCost" type="number" min="0" defaultValue="2500" className="h-10 rounded-md border border-input px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Shift % ของ Peak
                  <input name="shiftPercent" type="number" min="0" max="100" defaultValue="25" className="h-10 rounded-md border border-input px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Source start
                  <input name="sourceStart" defaultValue="18:00" className="h-10 rounded-md border border-input px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Source end
                  <input name="sourceEnd" defaultValue="22:00" className="h-10 rounded-md border border-input px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Target window
                  <input name="targetWindow" defaultValue="22:00-06:00" className="h-10 rounded-md border border-input px-3" />
                </label>
              </div>

              <Button className="w-fit" type="submit">
                Run Scenario
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

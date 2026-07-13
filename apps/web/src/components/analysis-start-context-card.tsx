import { ArrowRight, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AnalysisStartContextCardProps = {
  audienceLabel: string;
  audienceDescription: string;
  sourceLabel: string;
  focus: string;
  nextAction: string;
};

export function AnalysisStartContextCard({
  audienceLabel,
  audienceDescription,
  sourceLabel,
  focus,
  nextAction
}: AnalysisStartContextCardProps) {
  return (
    <Card className="mt-6 border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>เส้นทางที่เลือก</Badge>
          <Badge variant="outline">{audienceLabel}</Badge>
          <Badge variant="outline">{sourceLabel}</Badge>
        </div>
        <CardTitle className="flex items-center gap-2 pt-1">
          <Route aria-hidden="true" className="h-5 w-5 text-primary" />
          เส้นทางวิเคราะห์ที่กำลังทำ
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <ContextItem label="ประเภทผู้ใช้" value={audienceDescription} />
        <ContextItem label="ควรโฟกัส" value={focus} />
        <ContextItem label="ขั้นตอนนี้" value={nextAction} />
        <a
          className="inline-flex items-center gap-2 text-sm font-medium text-primary md:col-span-3"
          href="/analysis/new"
        >
          กลับไปเปลี่ยนเส้นทาง
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

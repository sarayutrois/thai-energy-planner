import { FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadProfileImporter } from "@/components/load-profile-importer";
import { MainNav } from "@/components/main-nav";

export default function ImportLoadPage() {
  return (
    <main className="min-h-screen">
      <MainNav />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>CSV/XLSX Import</Badge>
          <Badge variant="outline">Asia/Bangkok</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">อัปโหลด Load Profile</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          รองรับ CSV/XLSX พร้อม Column Mapping, interval 15/30/60 นาที และ Data Preview ก่อน import จริง
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="h-5 w-5 text-primary" />
              Data Preview
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

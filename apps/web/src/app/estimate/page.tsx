"use client";

import { useState } from "react";
import { MainNav } from "@/components/main-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home, Building2, Store } from "lucide-react";

type PropertyType = "home" | "business" | "factory";
type UsageTime = "day" | "night" | "both";

type EstimateResult = {
  estimatedMonthlyKwh: number;
  recommendedSystemSizeKwp: number;
  estimatedPanelCount: { min: number; max: number };
  monthlySavingsThb: number;
  annualSavingsThb: number;
  annualExportRevenueThb: number;
  paybackYears: number | null;
  capexThb: number;
};

type EstimateApiResponse =
  | { ok: true; result: EstimateResult; warnings: string[] }
  | { ok: false; error: string; issues?: Array<{ path: string; message: string }> };

export default function EstimateWizardPage() {
  const [phase, setPhase] = useState(1);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [province, setProvince] = useState("bangkok");
  const [monthlyBill, setMonthlyBill] = useState<number | "">("");
  const [usageTime, setUsageTime] = useState<UsageTime | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimateWarnings, setEstimateWarnings] = useState<string[]>([]);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  async function runEstimate() {
    if (typeof monthlyBill !== "number" || monthlyBill <= 0 || !propertyType || !usageTime) return;

    setIsEstimating(true);
    setEstimateError(null);
    setEstimateWarnings([]);

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyBillThb: monthlyBill,
          province,
          propertyType,
          usageShape: usageTime,
          billDate: "2026-07-01"
        })
      });
      const payload = (await response.json()) as EstimateApiResponse;
      if (!response.ok || !payload.ok) {
        const issueText = payload.ok ? "" : payload.issues?.map((issue) => issue.message).join(", ");
        throw new Error((payload.ok ? null : payload.error) || issueText || "Estimate failed.");
      }

      setEstimate(payload.result);
      setEstimateWarnings(payload.warnings);
      setPhase(3);
    } catch (error) {
      setEstimateError(error instanceof Error ? error.message : "Estimate failed.");
    } finally {
      setIsEstimating(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <MainNav />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 lg:py-12">
        {/* Progress Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between text-sm font-medium relative">
            <div className="flex flex-col items-center gap-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${phase >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
              <span className={phase >= 1 ? "text-primary" : "text-muted-foreground"}>สถานที่</span>
            </div>
            
            <div className="flex-1 h-1 mx-4 bg-border relative top-[-12px]">
               <div className={`h-full bg-primary transition-all duration-500`} style={{ width: phase >= 2 ? '100%' : '0%' }} />
            </div>
            
            <div className="flex flex-col items-center gap-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${phase >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
              <span className={phase >= 2 ? "text-primary" : "text-muted-foreground"}>การใช้ไฟฟ้า</span>
            </div>
            
            <div className="flex-1 h-1 mx-4 bg-border relative top-[-12px]">
               <div className={`h-full bg-primary transition-all duration-500`} style={{ width: phase >= 3 ? '100%' : '0%' }} />
            </div>
            
            <div className="flex flex-col items-center gap-2 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${phase >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
              <span className={phase >= 3 ? "text-primary" : "text-muted-foreground"}>ผลลัพธ์</span>
            </div>
          </div>
        </div>

        {phase === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight">ข้อมูลสถานที่ของคุณ</h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                เพื่อให้เรารู้ว่าบ้านของคุณรับแสงแดดได้ดีแค่ไหน โปรดระบุประเภทอาคารและพื้นที่ของคุณ <br className="hidden sm:block" />
                ข้อมูลนี้จะถูกนำไปประเมินความเข้มแสงอาทิตย์ในพื้นที่จริงเพื่อความแม่นยำสูงสุด
              </p>
            </div>

            <Card className="shadow-sm border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg">1. ประเภทอาคาร</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setPropertyType("home")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:-translate-y-1 ${propertyType === 'home' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                  >
                    <Home className={`w-10 h-10 mb-3 ${propertyType === 'home' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-semibold">บ้านพักอาศัย</span>
                  </button>
                  <button 
                    onClick={() => setPropertyType("business")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:-translate-y-1 ${propertyType === 'business' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                  >
                    <Store className={`w-10 h-10 mb-3 ${propertyType === 'business' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-semibold">ธุรกิจขนาดเล็ก</span>
                  </button>
                  <button 
                    onClick={() => setPropertyType("factory")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:-translate-y-1 ${propertyType === 'factory' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                  >
                    <Building2 className={`w-10 h-10 mb-3 ${propertyType === 'factory' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-semibold">โรงงาน / อาคารใหญ่</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg">2. พื้นที่ติดตั้ง</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <MapPin className="text-primary w-5 h-5" />
                  <select 
                    value={province} 
                    onChange={(e) => setProvince(e.target.value)}
                    className="flex-1 h-12 rounded-md border border-input bg-background px-4 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  >
                    <option value="bangkok">กรุงเทพมหานคร และปริมณฑล</option>
                    <option value="central">ภาคกลาง</option>
                    <option value="north">ภาคเหนือ</option>
                    <option value="south">ภาคใต้</option>
                    <option value="east">ภาคตะวันออก</option>
                    <option value="isaan">ภาคตะวันออกเฉียงเหนือ</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-6">
              <Button 
                size="lg" 
                disabled={!propertyType}
                onClick={() => setPhase(2)}
                className="w-full sm:w-auto px-10 text-base h-12 shadow-md transition-transform active:scale-95"
              >
                ถัดไป: ข้อมูลการใช้ไฟฟ้า
              </Button>
            </div>
          </div>
        )}

        {phase === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight">พฤติกรรมการใช้ไฟฟ้า</h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                ระบุค่าไฟเฉลี่ยรายเดือนของคุณ ข้อมูลส่วนนี้สำคัญมาก <br className="hidden sm:block" />
                เพราะเราจะใช้คำนวณขนาดระบบที่คุ้มค่าที่สุด โดยผลิตไฟมาใช้พอดีและไม่เหลือทิ้ง
              </p>
            </div>

            <Card className="shadow-sm border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg">1. ค่าไฟเฉลี่ยต่อเดือน (บาท)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="max-w-md mx-auto">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">฿</span>
                    <input 
                      type="number" 
                      min="0"
                      step="100"
                      placeholder="เช่น 3500"
                      value={monthlyBill}
                      onChange={(e) => setMonthlyBill(e.target.value ? Number(e.target.value) : "")}
                      className="w-full h-14 pl-12 pr-4 text-xl rounded-xl border-2 border-input bg-background outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setMonthlyBill(1500)}>1,500 บ.</Button>
                    <Button variant="outline" size="sm" onClick={() => setMonthlyBill(3000)}>3,000 บ.</Button>
                    <Button variant="outline" size="sm" onClick={() => setMonthlyBill(5000)}>5,000 บ.</Button>
                    <Button variant="outline" size="sm" onClick={() => setMonthlyBill(10000)}>10,000 บ.</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg">2. ช่วงเวลาที่ใช้ไฟเยอะที่สุด</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setUsageTime("day")}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all hover:-translate-y-1 ${usageTime === 'day' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                  >
                    <span className="text-3xl mb-2">☀️</span>
                    <span className="font-semibold text-sm">เน้นกลางวัน</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">มีคนอยู่บ้าน/ทำงาน</span>
                  </button>
                  <button 
                    onClick={() => setUsageTime("night")}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all hover:-translate-y-1 ${usageTime === 'night' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                  >
                    <span className="text-3xl mb-2">🌙</span>
                    <span className="font-semibold text-sm">เน้นกลางคืน</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">กลับบ้านหลังเลิกงาน</span>
                  </button>
                  <button 
                    onClick={() => setUsageTime("both")}
                    className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all hover:-translate-y-1 ${usageTime === 'both' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
                  >
                    <span className="text-3xl mb-2">⚖️</span>
                    <span className="font-semibold text-sm">พอๆ กัน</span>
                    <span className="text-xs text-muted-foreground mt-1 text-center">ใช้ไฟตลอดทั้งวัน</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <Button 
                variant="ghost"
                onClick={() => setPhase(1)}
                className="w-full sm:w-auto text-muted-foreground"
              >
                ย้อนกลับ
              </Button>
              <Button 
                size="lg" 
                disabled={!monthlyBill || !usageTime || isEstimating}
                onClick={() => void runEstimate()}
                className="w-full sm:w-auto px-10 text-base h-12 shadow-md transition-transform active:scale-95"
              >
                {isEstimating ? "กำลังคำนวณ..." : "ประเมินความคุ้มค่า (Simulate)"}
              </Button>
            </div>
            {estimateError ? (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {estimateError}
              </div>
            ) : null}
          </div>
        )}

        {phase === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-primary">ระบบที่เหมาะสมกับคุณ</h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                เราได้คำนวณขนาดที่คุ้มค่าที่สุดให้คุณแล้ว คุณสามารถใช้เป็นสเปกเบื้องต้น <br className="hidden sm:block" />
                เพื่อคุยกับผู้รับเหมา หรือใช้เปรียบเทียบใบเสนอราคาได้เลย
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-primary/30 shadow-md">
                 <CardHeader className="bg-primary/5 border-b border-primary/10">
                   <CardTitle className="text-center text-lg">ขนาดติดตั้งแนะนำ</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 text-center flex flex-col items-center justify-center">
                   <div className="text-6xl font-bold text-primary mb-3">
                     {estimate?.recommendedSystemSizeKwp.toLocaleString("th-TH", { maximumFractionDigits: 1 }) ?? "-"}{" "}
                     <span className="text-2xl text-primary/70">kW</span>
                   </div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                     <span>
                       {estimate
                         ? `แผงประมาณ ${estimate.estimatedPanelCount.min}-${estimate.estimatedPanelCount.max} แผง, ใช้ไฟราว ${estimate.estimatedMonthlyKwh.toLocaleString("th-TH", { maximumFractionDigits: 0 })} kWh/เดือน`
                         : "คำนวณจากค่าไฟและพฤติกรรมการใช้ไฟ"}
                     </span>
                   </div>
                 </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                 <CardHeader className="bg-muted/20 border-b border-border/50">
                   <CardTitle className="text-center text-lg">คาดว่าจะประหยัดค่าไฟได้</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 text-center flex flex-col items-center justify-center">
                   <div className="text-5xl font-bold text-emerald-600 mb-3">
                     ~{estimate ? Math.max(0, estimate.monthlySavingsThb).toLocaleString("th-TH", { maximumFractionDigits: 0 }) : "-"}{" "}
                     <span className="text-xl text-emerald-600/70">บ./เดือน</span>
                   </div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                     <span>
                       {estimate
                         ? `ประหยัด ~${estimate.annualSavingsThb.toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท/ปี, คืนทุน ${estimate.paybackYears ?? "-"} ปี`
                         : "คำนวณเงินประหยัดต่อปีและจุดคุ้มทุนจาก tariff จริง"}
                     </span>
                   </div>
                 </CardContent>
              </Card>
            </div>

            {estimateWarnings.length > 0 ? (
              <div className="rounded-md border border-warning bg-warning/10 p-4 text-sm leading-6 text-warning-foreground">
                {estimateWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {/* Disclaimer Banner */}
            <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-900">
              <div className="flex gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <strong>ข้อควรทราบ: </strong>ผลการประเมินนี้เป็นการประมาณการเบื้องต้นจากข้อมูลที่คุณระบุและค่าเฉลี่ยทางสถิติเท่านั้น ไม่ใช่ใบเสนอราคาทางการ และไม่อาจใช้รับประกันผลประหยัดพลังงานหรือค่าใช้จ่ายจริงได้ โปรดปรึกษาวิศวกรหรือผู้เชี่ยวชาญเพื่อประเมินหน้างานจริง
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 border-t border-border mt-8">
               <Button variant="outline" size="lg" onClick={() => setPhase(2)} className="w-full sm:w-auto">กลับไปแก้ไขข้อมูล</Button>
               <Button size="lg" className="w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                 ดาวน์โหลดรายงานสรุป (PDF)
               </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

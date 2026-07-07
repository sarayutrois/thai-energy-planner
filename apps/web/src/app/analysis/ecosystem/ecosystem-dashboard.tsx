"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { ArrowRight, ArrowDown, BatteryCharging, Home, PlugZap, SunMedium, Zap } from "lucide-react";
import { motion } from "framer-motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EcosystemDashboard({ solar, battery, ev }: { solar: any; battery: any; ev: any }) {
  // Extract some fake/real data from the demos to show the unified effect
  const solarSavings = solar?.billComparison?.netAnnualBenefit?.max ?? 0;
  const batterySavings = battery?.financial?.annualBillSavingsThb ?? 0;
  
  // Calculate total monthly savings
  const totalAnnualSavings = solarSavings + batterySavings;
  const totalMonthlySavings = totalAnnualSavings / 12;

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-orange-50 to-amber-100/50 dark:from-orange-950/30 dark:to-amber-900/20 border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <SunMedium className="h-5 w-5" />
                Solar Production
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {formatNumber(solar?.sizing?.recommendedCapacityKw ?? 0)} <span className="text-sm font-normal">kWp</span>
              </div>
              <p className="text-sm text-orange-700/80 dark:text-orange-300/80 mt-1">ประหยัดเฉลี่ย {formatNumber(solarSavings / 12)} ฿/เดือน</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100/50 dark:from-blue-950/30 dark:to-indigo-900/20 border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <BatteryCharging className="h-5 w-5" />
                Battery Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {formatNumber(battery?.dispatch?.usableCapacityKwh ?? 0)} <span className="text-sm font-normal">kWh</span>
              </div>
              <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-1">ประหยัดเพิ่ม {formatNumber(batterySavings / 12)} ฿/เดือน</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-100/50 dark:from-emerald-950/30 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                <PlugZap className="h-5 w-5" />
                EV Charging
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                {formatNumber(ev?.bestChargingStrategy?.addedEvKwh ?? 0)} <span className="text-sm font-normal">kWh/เดือน</span>
              </div>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">ค่าชาร์จรถ {formatNumber(ev?.bestChargingStrategy?.monthlyBillIncreaseThb ?? 0)} ฿/เดือน</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Energy Flow Diagram UI */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative bg-card border rounded-xl p-8 overflow-hidden">
        <h3 className="text-xl font-semibold mb-8 text-center">ระบบไหลเวียนพลังงาน (Energy Flow)</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-4xl mx-auto">
          {/* Solar Node */}
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center border-4 border-orange-200 dark:border-orange-800 relative z-10 shadow-lg">
              <SunMedium className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="mt-2 font-medium">Solar</span>
          </div>

          <ArrowRight className="hidden md:block h-8 w-8 text-muted-foreground animate-pulse" />
          <ArrowDown className="md:hidden h-8 w-8 text-muted-foreground animate-pulse" />

          {/* Home Node */}
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 relative z-10 shadow-lg">
              <Home className="h-12 w-12 text-primary" />
            </div>
            <span className="mt-2 font-medium">Home Usage</span>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <ArrowRight className="hidden md:block h-8 w-8 text-muted-foreground animate-pulse" />
            <ArrowDown className="md:hidden h-8 w-8 text-muted-foreground animate-pulse" />

            {/* EV Node */}
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border-4 border-emerald-200 dark:border-emerald-800 relative z-10 shadow-lg">
                <PlugZap className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="mt-2 font-medium">EV</span>
            </div>
          </div>
        </div>

        {/* Battery & Grid (Below Home) */}
        <div className="flex justify-center gap-16 md:gap-32 mt-8">
          <div className="flex flex-col items-center">
            <ArrowDown className="h-8 w-8 text-muted-foreground animate-pulse mb-2" />
            <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center border-4 border-blue-200 dark:border-blue-800 relative z-10 shadow-lg">
              <BatteryCharging className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="mt-2 font-medium">Battery</span>
          </div>

          <div className="flex flex-col items-center">
            <ArrowDown className="h-8 w-8 text-muted-foreground animate-pulse mb-2" />
            <div className="h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-4 border-zinc-200 dark:border-zinc-700 relative z-10 shadow-lg">
              <Zap className="h-10 w-10 text-zinc-600 dark:text-zinc-400" />
            </div>
            <span className="mt-2 font-medium">Grid</span>
          </div>
        </div>
      </motion.div>

      {/* Summary Financial */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-col md:flex-row items-center justify-between p-6">
          <div>
            <h3 className="text-xl font-bold">ผลประโยชน์สุทธิรายเดือน (Net Monthly Benefit)</h3>
            <p className="text-primary-foreground/80">เมื่อนำระบบทั้ง 3 มารวมกัน</p>
          </div>
          <div className="text-4xl font-black tracking-tight mt-4 md:mt-0">
            {formatNumber(totalMonthlySavings)} <span className="text-2xl font-medium">฿</span>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

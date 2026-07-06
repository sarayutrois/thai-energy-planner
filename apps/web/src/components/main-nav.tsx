import { BarChart3, BatteryCharging, Calculator, FileText, Gauge, PlugZap, SunMedium, UploadCloud } from "lucide-react";

const navItems = [
  { label: "วิเคราะห์", href: "/analysis/new", icon: Gauge },
  { label: "Tariff", href: "/tariff-demo", icon: Calculator },
  { label: "Load Data", href: "/analysis/load-data", icon: UploadCloud },
  { label: "เปรียบเทียบ", href: "/analysis/scenarios", icon: BarChart3 },
  { label: "Solar", href: "/analysis/solar", icon: SunMedium },
  { label: "Battery", href: "/analysis/battery", icon: BatteryCharging },
  { label: "EV", href: "/analysis/ev", icon: PlugZap },
  { label: "รายงาน", href: "/analysis/reports", icon: FileText }
];

export function MainNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <a href="#" className="flex items-center gap-3 font-semibold" aria-label="Thai Energy Planner">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gauge aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">Thai Energy Planner</span>
        </a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <item.icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>
        <a
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 focus:outline-none focus:ring-2 focus:ring-ring"
          href="/analysis/new"
        >
          เริ่มวิเคราะห์
        </a>
      </div>
    </header>
  );
}

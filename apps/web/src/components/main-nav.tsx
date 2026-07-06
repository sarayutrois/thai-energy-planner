"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, BatteryCharging, Calculator, FileText, Gauge, PlugZap, SunMedium, UploadCloud, Menu, X } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          
          <Link href="/" className="flex items-center gap-3 font-semibold" aria-label="Thai Energy Planner">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Gauge aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Thai Energy Planner</span>
          </Link>
        </div>

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

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 py-4 shadow-lg absolute w-full left-0">
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <item.icon aria-hidden="true" className="h-5 w-5" />
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

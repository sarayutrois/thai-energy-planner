"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Calculator, FileText, Gauge, Menu, SunMedium, UploadCloud, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "เริ่มวิเคราะห์", href: "/analysis/new", icon: Gauge },
  { label: "ข้อมูลการใช้ไฟ", href: "/analysis/load-data", icon: UploadCloud },
  { label: "ค่าไฟ", href: "/tariff-demo", icon: Calculator },
  { label: "เปรียบเทียบแผน", href: "/analysis/scenarios", icon: BarChart3 },
  { label: "Solar", href: "/analysis/solar", icon: SunMedium },
  { label: "รายงาน", href: "/analysis/reports", icon: FileText },
];

export function MainNav() {
  const [isOpen, setIsOpen] = useState(false);
  return <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur"><div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6"><div className="flex items-center gap-4"><button aria-label="เปิดหรือปิดเมนู" className="-ml-2 p-2 text-muted-foreground hover:text-foreground focus:outline-none lg:hidden" onClick={() => setIsOpen((open) => !open)}>{isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button><Link href="/" className="flex items-center gap-3 font-semibold" aria-label="Thai Energy Planner"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Gauge className="h-5 w-5" /></span><span className="hidden sm:inline">Thai Energy Planner</span></Link></div><nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหลัก">{navItems.map((item) => <a key={item.href} href={item.href} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"><item.icon className="h-4 w-4" />{item.label}</a>)}</nav><div className="flex items-center gap-2"><ThemeToggle /><a className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring" href="/analysis/load-data">เริ่มต้น</a></div></div>{isOpen ? <div className="absolute left-0 w-full border-t border-border bg-background px-4 py-4 shadow-lg lg:hidden"><nav className="flex flex-col gap-2" aria-label="เมนูหลักบนมือถือ">{navItems.map((item) => <a key={item.href} href={item.href} onClick={() => setIsOpen(false)} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"><item.icon className="h-5 w-5" />{item.label}</a>)}</nav></div> : null}</header>;
}

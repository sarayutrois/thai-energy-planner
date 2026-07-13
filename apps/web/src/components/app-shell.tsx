"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Calculator,
  ChevronRight,
  FileText,
  Gauge,
  Menu,
  SunMedium,
  UploadCloud,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnalysisProgress } from "@/components/analysis-progress";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  { label: "ภาพรวม", items: [{ label: "เริ่มวิเคราะห์", href: "/analysis/new", icon: Gauge }] },
  { label: "ข้อมูลของฉัน", items: [{ label: "บิลและรูปแบบการใช้ไฟ", href: "/analysis/load-data", icon: UploadCloud }] },
  { label: "การวิเคราะห์", items: [
    { label: "ค่าไฟและ TOU", href: "/analysis/scenarios", icon: Calculator },
    { label: "Solar", href: "/analysis/solar", icon: SunMedium },
    { label: "เปรียบเทียบทางเลือก", href: "/analysis/scenarios/compare", icon: BarChart3 },
  ] },
  { label: "ผลลัพธ์", items: [{ label: "คำแนะนำและรายงาน", href: "/analysis/reports", icon: FileText }] },
  { label: "เพิ่มเติม", items: [
    { label: "แบตเตอรี่", href: "/analysis/battery", icon: Gauge },
    { label: "รถยนต์ไฟฟ้า", href: "/analysis/ev", icon: Gauge },
    { label: "อัตราค่าไฟและสมมติฐาน", href: "/analysis/tariff", icon: Calculator },
  ] },
];

const breadcrumbLabels: Array<{ href: string; label: string }> = [
  { href: "/analysis/load-data/appliances", label: "สร้างรูปแบบการใช้ไฟ" },
  { href: "/analysis/load-data/dashboard", label: "ตรวจสอบข้อมูล" },
  { href: "/analysis/load-data/bills", label: "บิลค่าไฟ" },
  { href: "/analysis/load-data/import", label: "นำเข้าข้อมูลมิเตอร์" },
  { href: "/analysis/load-data", label: "ข้อมูลของฉัน" },
  { href: "/analysis/scenarios", label: "ค่าไฟและ TOU" },
  { href: "/analysis/solar", label: "Solar" },
  { href: "/analysis/battery", label: "Battery" },
  { href: "/analysis/ecosystem", label: "การวิเคราะห์เพิ่มเติม" },
  { href: "/analysis/ev", label: "รถยนต์ไฟฟ้า" },
  { href: "/analysis/reports", label: "รายงาน" },
  { href: "/analysis/new", label: "เริ่มวิเคราะห์" },
  { href: "/analysis/tariff", label: "ค่าไฟ" }
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/analysis/new" && pathname.startsWith(`${href}/`));
}

function breadcrumbFor(pathname: string) {
  const matches = breadcrumbLabels
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => a.href.length - b.href.length);

  return [{ href: "/", label: "หน้าแรก" }, ...matches];
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 md:px-6">{children}</div>;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const items = breadcrumbFor(pathname);

  return (
    <nav aria-label="เส้นทางการนำทาง" className="flex min-h-10 items-center gap-1 overflow-x-auto py-2 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.href}-${index}`} className="flex shrink-0 items-center gap-1">
          {index > 0 ? <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /> : null}
          {index === items.length - 1 ? <span className="font-medium text-foreground" aria-current="page">{item.label}</span> : <Link href={item.href} className="hover:text-foreground">{item.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLink = (item: NavigationItem, mobile = false) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-2 rounded-md px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ring ${
          mobile ? "h-10" : "h-9"
        } ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      >
        <item.icon className={mobile ? "h-5 w-5" : "h-4 w-4"} />
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <PageContainer>
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button aria-label={isOpen ? "ปิดเมนู" : "เปิดเมนู"} aria-expanded={isOpen} className="-ml-2 p-2 text-muted-foreground hover:text-foreground focus:outline-none lg:hidden" onClick={() => setIsOpen((open) => !open)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link href="/" className="flex items-center gap-3 font-semibold" onClick={() => setIsOpen(false)} aria-label="Thai Energy Planner">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Gauge className="h-5 w-5" /></span>
              <span className="hidden sm:inline">Thai Energy Planner</span>
            </Link>
          </div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหลัก">
            {navigationGroups.map((group) => <div className="group relative" key={group.label}>
              <button className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring" type="button">{group.label}<ChevronRight aria-hidden="true" className="h-3.5 w-3.5 rotate-90" /></button>
              <div className="invisible absolute left-0 top-full z-50 mt-2 min-w-60 rounded-lg border border-border bg-popover p-1 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                {group.items.map((item) => navLink(item))}
              </div>
            </div>)}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className="hidden h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:inline-flex" href="/analysis/new">เริ่มต้น</Link>
          </div>
        </div>
      </PageContainer>
      {isOpen ? <div className="border-t border-border bg-background shadow-lg lg:hidden"><PageContainer><nav className="grid gap-3 py-4" aria-label="เมนูหลักบนมือถือ">{navigationGroups.map((group) => <div key={group.label}><p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{group.label}</p><div className="grid gap-1">{group.items.map((item) => navLink(item, true))}</div></div>)}</nav></PageContainer></div> : null}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <><AppHeader /><div className="border-b border-border bg-muted/20"><PageContainer><Breadcrumbs /></PageContainer></div><AnalysisProgress />{children}</>;
}

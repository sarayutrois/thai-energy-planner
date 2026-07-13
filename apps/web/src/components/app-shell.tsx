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

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof Gauge;
};

const navigationItems: NavigationItem[] = [
  { label: "เริ่มวิเคราะห์", href: "/analysis/new", icon: Gauge },
  { label: "ข้อมูลการใช้ไฟ", href: "/analysis/load-data", icon: UploadCloud },
  { label: "ค่าไฟ", href: "/analysis/tariff", icon: Calculator },
  { label: "เปรียบเทียบแผน", href: "/analysis/scenarios", icon: BarChart3 },
  { label: "Solar", href: "/analysis/solar", icon: SunMedium },
  { label: "รายงาน", href: "/analysis/reports", icon: FileText }
];

const breadcrumbLabels: Array<{ href: string; label: string }> = [
  { href: "/analysis/load-data/appliances", label: "เครื่องใช้ไฟฟ้า" },
  { href: "/analysis/load-data/dashboard", label: "ตรวจสอบข้อมูล" },
  { href: "/analysis/load-data/bills", label: "บิลค่าไฟ" },
  { href: "/analysis/load-data/import", label: "อัปโหลดข้อมูล" },
  { href: "/analysis/load-data", label: "ข้อมูลการใช้ไฟ" },
  { href: "/analysis/scenarios", label: "เปรียบเทียบแผน" },
  { href: "/analysis/solar", label: "Solar" },
  { href: "/analysis/battery", label: "Battery" },
  { href: "/analysis/ecosystem", label: "Ecosystem" },
  { href: "/analysis/ev", label: "EV" },
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
          <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหลัก">{navigationItems.map((item) => navLink(item))}</nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className="hidden h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:inline-flex" href="/analysis/new">เริ่มต้น</Link>
          </div>
        </div>
      </PageContainer>
      {isOpen ? <div className="border-t border-border bg-background shadow-lg lg:hidden"><PageContainer><nav className="flex flex-col gap-1 py-3" aria-label="เมนูหลักบนมือถือ">{navigationItems.map((item) => navLink(item, true))}</nav></PageContainer></div> : null}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <><AppHeader /><div className="border-b border-border bg-muted/20"><PageContainer><Breadcrumbs /></PageContainer></div>{children}</>;
}

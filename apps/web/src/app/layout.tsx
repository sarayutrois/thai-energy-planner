import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const prompt = Prompt({ weight: ["300", "400", "500", "600", "700"], subsets: ["thai"], variable: "--font-prompt" });

export const metadata: Metadata = { title: "Thai Energy Planner", description: "วิเคราะห์ค่าไฟ เปรียบเทียบ Normal/TOU และประเมิน Solar จากข้อมูลที่ตรวจสอบได้" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={`${inter.variable} ${prompt.variable}`} suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange><AppShell>{children}</AppShell></ThemeProvider></body></html>;
}

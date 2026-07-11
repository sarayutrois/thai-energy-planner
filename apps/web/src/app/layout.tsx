import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const prompt = Prompt({ weight: ["300", "400", "500", "600", "700"], subsets: ["thai"], variable: "--font-prompt" });

export const metadata: Metadata = { title: "Thai Energy Planner", description: "วางแผนการใช้ไฟ Solar และ Battery จากข้อมูลที่ตรวจสอบได้" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={`${inter.variable} ${prompt.variable}`} suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" disableTransitionOnChange>{children}</ThemeProvider></body></html>;
}

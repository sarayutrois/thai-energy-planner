import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "Thai Energy Planner",
  description: "ระบบวิเคราะห์การใช้ไฟฟ้าและความคุ้มค่าด้านพลังงานสำหรับประเทศไทย"
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${prompt.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

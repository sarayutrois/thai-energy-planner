import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thai Energy Planner",
  description: "ระบบวิเคราะห์การใช้ไฟฟ้าและความคุ้มค่าด้านพลังงานสำหรับประเทศไทย"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

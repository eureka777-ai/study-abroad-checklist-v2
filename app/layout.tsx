import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "留学材料助手",
  description: "账号版留学材料 Checklist，支持家庭只读分享。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

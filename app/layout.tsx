import type { Metadata } from "next";
import AppToaster from "./toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pathfolio",
  description: "留学、签证和行前材料路径管理工具。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}

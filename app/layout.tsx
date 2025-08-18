import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mock Hub - API Mock 测试平台",
  description: "企业级 Mock API 管理和测试平台，支持动态数据生成、团队协作、实时监控",
  keywords: ["Mock API", "API测试", "Mock服务", "API管理", "团队协作"],
  authors: [{ name: "Mock Hub Team" }],
  creator: "Mock Hub",
  publisher: "Mock Hub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicons/icon.svg",
    apple: "/favicons/apple-icon.svg",
  },
  openGraph: {
    title: "Mock Hub - API Mock 测试平台",
    description: "企业级 Mock API 管理和测试平台",
    type: "website",
    locale: "zh_CN",
    siteName: "Mock Hub",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mock Hub - API Mock 测试平台",
    description: "企业级 Mock API 管理和测试平台",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

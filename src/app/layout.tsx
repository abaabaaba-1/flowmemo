import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EazoProvider } from "@eazo/sdk/react";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";
import { LocalRuntimeEffect } from "@/components/local-runtime-effect";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;
const EAZO_RUNTIME_ENABLED =
  process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME !== "local" &&
  process.env.AI_PROVIDER !== "deepseek";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: "织流 FlowMemo — AI 旅行记忆导演",
  description: "随手说拍，AI 自动编织成高颜值旅行手账与 Vlog 图片集，直接发到社交平台。",
  icons: {
    icon: "https://eazo.ai/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "织流 FlowMemo",
    title: "织流 FlowMemo — AI 旅行记忆导演",
    description: "随手说拍，AI 自动编织成高颜值旅行手账。",
    url: "/",
    locale: "zh_CN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const app = (
    <>
      <LocalRuntimeEffect />
      {EAZO_RUNTIME_ENABLED && <UserSyncEffect />}
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#121216",
            border: "1px solid #1E1E24",
            color: "#F5F5F7",
          },
        }}
      />
    </>
  );

  return (
    <html lang="zh-CN" className={cn("h-full antialiased dark")}>
      <body className="min-h-svh flex flex-col bg-[#0C0C0E] text-[#F5F5F7]">
        {EAZO_RUNTIME_ENABLED ? <EazoProvider>{app}</EazoProvider> : app}
      </body>
    </html>
  );
}

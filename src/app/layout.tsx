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
  title: "Conch — 旅行回忆回响器",
  description: "把声音、照片和碎片记忆收进海螺，AI 帮你在耳边重现旅途。",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Conch",
    title: "Conch — 旅行回忆回响器",
    description: "把声音、照片和碎片记忆收进海螺，AI 帮你在耳边重现旅途。",
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

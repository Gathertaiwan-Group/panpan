import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Noto_Serif_TC } from "next/font/google";
import { BrandClosing } from "@/components/BrandClosing";
import { RevealObserver } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_URL } from "@/lib/env";
import { SITE_DESC, SITE_NAME } from "@/lib/seo";
import "./globals.css";

// 可變字重：@font-face 數量從「字重 × 子集」降為「子集」，縮小阻塞渲染的 CSS
const serif = Noto_Serif_TC({
  weight: "variable",
  variable: "--font-noto-serif",
  display: "swap",
  preload: false,
  // CJK 字型不在 Google 子集內的字元（如「——」）需落到系統字型，與原型一致；不用 Arial 調整後備字
  adjustFontFallback: false,
});
const en = Cormorant_Garamond({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} Duoduo Whispers｜在人生轉場時・陪妳優雅重啟`,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: `${SITE_NAME} Duoduo Whispers`,
    title: `${SITE_NAME} Duoduo Whispers`,
    description: SITE_DESC,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF5F2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW" className={`${serif.variable} ${en.variable}`}>
      <body>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">
            {children}
            <BrandClosing />
          </main>
          <SiteFooter />
        </div>
        <RevealObserver />
      </body>
    </html>
  );
}

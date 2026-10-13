import type { Metadata } from "next";

export const SITE_NAME = "朵朵曉語";
export const SITE_DESC =
  "朵朵曉語 Duoduo Whispers——以朵朵的故事陪妳走過人生轉場；「好好告別」以美甲、美髮、寫真與儀式，陪妳好好告別，也好好開始。";

/** 每頁 metadata：title「頁名｜朵朵曉語」由 layout 的 template 產生 */
export function pageMeta(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title}｜${SITE_NAME}`, description, url: path },
    twitter: { title: `${title}｜${SITE_NAME}`, description },
  };
}

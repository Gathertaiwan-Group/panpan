import { getImageProps } from "next/image";

/**
 * 首頁 Hero 美術指導：行動版用直式構圖、桌面用橫式構圖（<picture> 只下載符合的那一張）。
 * 首屏 LCP 圖：fetchPriority high、不 lazy。
 */
export function HeroPicture({ alt }: { alt: string }) {
  const common = { alt, fill: true, priority: true, quality: 72 } as const;
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: "/images/hero.webp", sizes: "100vw" });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: "/images/hero-mobile.webp", sizes: "100vw" });
  return (
    <picture>
      <source media="(min-width: 820px)" srcSet={desktop} sizes="100vw" />
      <source media="(max-width: 819.98px)" srcSet={mobile} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt 由 rest 帶入 */}
      <img {...rest} srcSet={mobile} className="-z-10 object-cover object-[50%_40%] dt:object-[52%_50%]" />
    </picture>
  );
}

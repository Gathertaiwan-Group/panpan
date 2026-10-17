import { preload } from "react-dom";

/**
 * 首頁 Hero 美術指導：行動版用直式構圖、桌面用橫式構圖（<picture> 只下載符合的那一張）。
 * 首屏 LCP 圖：直接送 public 的 webp（已壓到 ~40KB，不經影像最佳化 API，避免冷啟動），
 * 並以 media 條件 preload，讓瀏覽器在解析 CSS 前就開始下載。
 */
const MOBILE = "/images/hero-mobile.webp"; // 768×1376
const DESKTOP = "/images/hero.webp"; // 1376×768
const MQ_DESKTOP = "(min-width: 820px)";
const MQ_MOBILE = "(max-width: 819.98px)";

export function HeroPicture({ alt }: { alt: string }) {
  preload(MOBILE, { as: "image", fetchPriority: "high", media: MQ_MOBILE });
  preload(DESKTOP, { as: "image", fetchPriority: "high", media: MQ_DESKTOP });
  return (
    <picture>
      <source media={MQ_DESKTOP} srcSet={DESKTOP} width={1376} height={768} />
      <img
        src={MOBILE}
        alt={alt}
        width={768}
        height={1376}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_40%] dt:object-[52%_50%]"
      />
    </picture>
  );
}

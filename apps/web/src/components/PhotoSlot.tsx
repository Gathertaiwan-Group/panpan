import Image from "next/image";

/** 照片比例框：有圖顯示 Storage 圖片，無圖顯示原型斜紋佔位＋標籤 */
export function PhotoSlot({
  ratio,
  label,
  src,
  pad = 14,
  sizes = "(max-width: 819px) 100vw, 40vw",
  className = "",
  priority,
}: {
  ratio: string; // e.g. "4/5"
  label: string;
  src?: string | null;
  pad?: 14 | 16;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={`relative w-full overflow-hidden bg-blush ${className}`} style={{ aspectRatio: ratio }}>
        <Image src={src} alt={label} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`照片佔位：${label}`}
      className={`photo-stripes flex w-full items-end ${className}`}
      style={{ aspectRatio: ratio, padding: pad }}
    >
      <span className="bg-cream px-2 py-1 font-mono text-[11px] text-muted">{label}</span>
    </div>
  );
}

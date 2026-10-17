import Image from "next/image";

export const JOURNEY = [
  { no: "01", zh: "告別", en: "Farewell", line: "把過去，好好收進盒子裡", img: "/images/journey-farewell.webp", alt: "雙手把一朵乾燥玫瑰放進亞麻收納盒" },
  { no: "02", zh: "整理", en: "Tidy", line: "騰出空間，給新的自己", img: "/images/journey-tidy.webp", alt: "陽光下整理好的衣物與行李箱" },
  { no: "03", zh: "重拾自己", en: "Rediscover", line: "重新喜歡鏡子裡的妳", img: "/images/journey-self.webp", alt: "女性坐在鏡前輕撫剛整理好的頭髮" },
  { no: "04", zh: "綻放", en: "Bloom", line: "讓光，再回到妳身上", img: "/images/journey-bloom.webp", alt: "晨光中盛開的淡粉色芍藥" },
  { no: "05", zh: "重新開始", en: "Begin again", line: "帶著自己，走向下一季", img: "/images/journey-restart.webp", alt: "清晨海邊赤腳散步的女性背影" },
] as const;

/** 旅程五階段：行動版橫向滑動圖卡，桌面五欄 */
export function JourneyStrip() {
  return (
    <ol
      aria-label="好好告別的五個階段"
      className="snap-row -mx-[clamp(20px,4vw,48px)] flex snap-x snap-mandatory scroll-px-[clamp(20px,4vw,48px)] list-none gap-3 overflow-x-auto px-[clamp(20px,4vw,48px)] pb-2 dt:mx-0 dt:grid dt:grid-cols-5 dt:gap-4 dt:overflow-visible dt:px-0"
    >
      {JOURNEY.map((j, i) => (
        <li
          key={j.no}
          data-reveal
          style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
          className="relative w-[72%] max-w-[300px] shrink-0 snap-start dt:w-auto dt:max-w-none"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-blush">
            <Image src={j.img} alt={j.alt} fill sizes="(max-width: 819px) 72vw, 20vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(58,40,38,.62)_100%)]" />
            <div className="on-photo absolute right-0 bottom-0 left-0 flex flex-col gap-1 p-4 text-on-rose">
              <span className="font-en text-[13px] tracking-[.24em] text-on-rose-2">{j.no} · {j.en}</span>
              <span className="font-serif text-[22px] tracking-[.16em] text-white">{j.zh}</span>
            </div>
          </div>
          <p className="m-0 mt-3 font-serif text-[15px] leading-[1.8] tracking-[.06em] text-ink-2">{j.line}</p>
        </li>
      ))}
    </ol>
  );
}

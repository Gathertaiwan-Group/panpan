import Image from "next/image";
import Link from "next/link";
import { JourneyStrip } from "@/components/Journey";
import { PhotoSlot } from "@/components/PhotoSlot";
import { Phrase } from "@/components/Phrase";
import { SectionHead } from "@/components/SectionHead";
import { getRoadmap, getSets } from "@/lib/data";
import { storagePublicUrl } from "@/lib/env";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMeta(
  "好好告別",
  "有些告別，是為了讓我們重新遇見自己。「好好告別」把美麗、紀錄、儀式與生活重新組合，陪妳好好走過人生轉場。",
  "/farewell",
);

const PILLARS = [
  { zh: "美麗", en: "BEAUTY", line: "重新打理自己", img: "/images/pillar-beauty.webp", alt: "剛做好裸粉色指甲的雙手" },
  { zh: "紀錄", en: "MEMORY", line: "留下這一天的樣子", img: "/images/pillar-memory.webp", alt: "散落在亞麻桌布上的拍立得照片與乾燥玫瑰" },
  { zh: "儀式", en: "RITUAL", line: "為過去畫下句點", img: "/images/pillar-ritual.webp", alt: "燭光、玫瑰與封蠟信封" },
  { zh: "生活", en: "LIVING", line: "把美好帶回日常", img: "/images/pillar-living.webp", alt: "窗邊的一杯熱茶與一枝洋桔梗" },
] as const;

export default async function FarewellPage() {
  const [sets, roadmap] = await Promise.all([getSets(), getRoadmap()]);
  const portrait = storagePublicUrl("panpan-brand/farewell-portrait.jpg");
  return (
    <>
      {/* 1. 共鳴：大圖 + 一句話 */}
      <section data-screen-label="好好告別 共鳴" className="bg-dawn-glow text-ink">
        <div className="mx-auto grid max-w-[1240px] items-stretch dt:grid-cols-2">
          <div className="relative aspect-[4/5] max-h-[72svh] w-full overflow-hidden bg-blush dt:aspect-auto dt:max-h-none dt:min-h-[640px]">
            {portrait && (
              <Image
                src={portrait}
                alt="鏡前重新打理自己的女性"
                fill
                priority
                sizes="(max-width: 819px) 100vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
          <div className="poem flex flex-col justify-center gap-7 px-[clamp(20px,5vw,72px)] py-[clamp(48px,7vw,96px)]">
            <span className="font-en text-[14px] tracking-[.3em] text-gold">
              A GRACEFUL FAREWELL <span className="whitespace-nowrap">· 好好告別</span>
            </span>
            <h1 className="m-0 font-serif text-[clamp(28px,3.8vw,46px)] leading-[1.6] font-normal tracking-[.1em]">
              有些告別，
              <br />
              是為了<span className="inline-block">重新遇見自己。</span>
            </h1>
            <p className="m-0 font-serif text-[17px] leading-[2.1] tracking-[.06em] text-body">
              不是失去一個版本的自己，
              <br />
              而是終於能成為下一個自己。
            </p>
            <a
              href="#sets"
              className="inline-flex min-h-[48px] items-center self-start bg-rose px-[28px] text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep hover:text-on-rose"
            >
              探索體驗 ↓
            </a>
          </div>
        </div>
      </section>

      {/* 2. 旅程五階段 */}
      <section data-screen-label="好好告別 旅程" className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <SectionHead
            eyebrow="THE JOURNEY"
            title={
              <>
                <span className="inline-block">為每一次轉身，</span>
                <span className="inline-block">留下一點美、一點紀念</span>
              </>
            }
          />
          <JourneyStrip />
        </div>
      </section>

      {/* 3. 四大支柱 */}
      <section data-screen-label="好好告別 組合" className="bg-blush px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <SectionHead
            eyebrow="FOUR ELEMENTS"
            title={
              <>
                <span className="inline-block">不只是服務，</span>
                <span className="inline-block">是一段為妳設計的體驗</span>
              </>
            }
            lead="依照妳此刻的需要，把四種美好重新組合。"
          />
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 dt:grid-cols-4 dt:gap-5">
            {PILLARS.map((p, i) => (
              <li key={p.en} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className="flex flex-col gap-3">
                <div className="relative aspect-square overflow-hidden bg-cream">
                  <Image src={p.img} alt={p.alt} fill sizes="(max-width: 819px) 50vw, 25vw" className="object-cover" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-serif text-[22px] tracking-[.18em] text-rose-deep">{p.zh}</span>
                    <span className="font-en text-[12px] tracking-[.26em] text-muted">{p.en}</span>
                  </span>
                  <span className="text-[14px] leading-[1.7] tracking-[.06em] text-body">{p.line}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. 三個 SET */}
      <section id="sets" data-screen-label="好好告別 三個 SET" className="scroll-mt-20 px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <SectionHead eyebrow="✦ EXPERIENCES" title="為自己，選一段值得的體驗" />
          <div className="grid gap-10 dt:grid-cols-3 dt:gap-7">
            {sets.map((s, i) => (
              <article
                key={s.slug}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 110}ms` }}
                className="flex flex-col gap-4"
              >
                <Link href={`/farewell/${s.slug}`} className="block hover:opacity-[.9]" tabIndex={-1} aria-hidden>
                  <PhotoSlot ratio="4/5" label={s.photo} src={s.coverUrl} sizes="(max-width: 819px) 100vw, 33vw" />
                </Link>
                <span className="font-en text-[13px] tracking-[.24em] text-gold">{s.no}</span>
                <h3 className="poem m-0 font-serif text-[23px] font-medium tracking-[.1em] text-ink">
                  <Phrase text={s.name} />
                </h3>
                <p className="m-0 font-serif text-[16px] leading-[1.8] text-rose-deep">{s.tagline}</p>
                <Link
                  href={`/farewell/${s.slug}`}
                  className="mt-1 inline-flex min-h-[48px] items-center self-start bg-rose px-[24px] text-[15px] tracking-[.14em] text-on-rose hover:bg-rose-deep hover:text-on-rose"
                >
                  探索這段體驗 →
                </Link>
              </article>
            ))}
          </div>
          {roadmap.show && (
            <div className="flex flex-col gap-4 border-t border-line pt-9">
              <span className="text-[14px] tracking-[.16em] text-muted">更多轉場體驗，陸續加入中</span>
              <div className="flex flex-wrap gap-[10px]">
                {roadmap.items.map((r) => (
                  <span key={r} className="border border-dashed border-gold-line px-4 py-2 text-[14px] tracking-[.08em] text-muted">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

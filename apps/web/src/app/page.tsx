import Image from "next/image";
import Link from "next/link";
import { HeroPicture } from "@/components/HeroPicture";
import { JourneyStrip } from "@/components/Journey";
import { PhotoSlot } from "@/components/PhotoSlot";
import { Phrase } from "@/components/Phrase";
import { SectionHead } from "@/components/SectionHead";
import { getSets } from "@/lib/data";

export const revalidate = 300;

const btnLight =
  "inline-flex min-h-[48px] items-center bg-rose px-[28px] text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep hover:text-on-rose";
const btnGhostLight =
  "inline-flex min-h-[48px] items-center border border-rose bg-[rgba(255,249,245,.55)] px-[28px] text-[15px] tracking-[.16em] text-rose-deep hover:bg-cream hover:text-rose-deep";

export default async function HomePage() {
  const sets = await getSets();
  return (
    <>
      {/* 1. Hero：滿版情境圖 + 主標 */}
      <section data-screen-label="首頁 Hero" className="relative isolate overflow-hidden bg-blush text-ink">
        <HeroPicture alt="晨光窗邊，捧著粉色玫瑰的女性背影" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,249,245,0)_28%,rgba(255,249,245,.8)_56%,rgba(255,249,245,.94)_100%)] dt:bg-[linear-gradient(90deg,rgba(255,249,245,.95)_0%,rgba(255,249,245,.86)_38%,rgba(255,249,245,.18)_62%,transparent_78%)]"
        />
        <div className="mx-auto flex min-h-[calc(100svh-68px)] max-w-[1240px] flex-col justify-end px-[clamp(20px,4vw,48px)] pt-24 pb-[clamp(44px,8vw,96px)] dt:min-h-[min(calc(100svh-68px),760px)] dt:justify-center">
          <div className="on-photo flex max-w-[560px] flex-col gap-6">
            <span className="font-en text-[17px] tracking-[.14em] text-rose-deep italic">Every flower has its own season</span>
            <h1 className="m-0 font-serif text-[clamp(32px,4.4vw,56px)] leading-[1.45] font-normal tracking-[.08em]">
              每一朵花，
              <br />
              都有屬於自己的花期
            </h1>
            <span aria-hidden className="block h-px w-12 bg-gold-line" />
            <p className="poem m-0 font-serif text-[clamp(16px,1.5vw,19px)] leading-[2] tracking-[.1em] text-body">
              <span className="inline-block">我是朵朵。</span>
              <span className="inline-block">曾經弄丟自己，</span>
              <span className="inline-block">也把自己找了回來。</span>
              <br />
              <span className="inline-block">現在，想陪正在轉場的妳，</span>
              <span className="inline-block">走一段。</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/farewell" className={btnLight}>
                探索體驗 →
              </Link>
              <Link href="/about" className={btnGhostLight}>
                認識朵朵
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 好好告別是什麼：旅程五階段 */}
      <section data-screen-label="首頁 好好告別" className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <SectionHead
            eyebrow="A GRACEFUL FAREWELL"
            title={
              <>
                <span className="inline-block">好好告別，</span>
                <span className="inline-block">是一段溫柔的轉場</span>
              </>
            }
            lead="陪妳好好告別，也陪妳好好開始。"
          />
          <JourneyStrip />
          <Link href="/farewell" className="hit self-start border-b border-gold-line pb-1 text-[15px] tracking-[.14em] text-rose-deep">
            探索好好告別 →
          </Link>
        </div>
      </section>

      {/* 4. 我能預約什麼：三個 SET */}
      <section data-screen-label="首頁 體驗入口" className="bg-blush px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <SectionHead eyebrow="EXPERIENCES" title="為自己，選一段值得的體驗" />
          <div className="grid gap-5 dt:grid-cols-3 dt:gap-6">
            {sets.map((s, i) => (
              <Link
                key={s.slug}
                href={`/farewell/${s.slug}`}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 110}ms` }}
                className="group relative block overflow-hidden text-ink hover:text-ink"
              >
                <PhotoSlot
                  ratio="4/5"
                  label={s.photo}
                  src={s.coverUrl}
                  sizes="(max-width: 819px) 100vw, 33vw"
                  className="transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div aria-hidden className="absolute inset-0 veil-bottom" />
                <div className="on-photo absolute right-0 bottom-0 left-0 flex flex-col gap-2 p-6">
                  <span className="font-en text-[13px] tracking-[.24em] text-gold">{s.no}</span>
                  <h3 className="poem m-0 font-serif text-[23px] font-medium tracking-[.1em]">
                    <Phrase text={s.name} />
                  </h3>
                  <p className="m-0 font-serif text-[15px] leading-[1.8] tracking-[.06em] text-body">{s.tagline}</p>
                  <span className="mt-1 text-[14px] tracking-[.16em] text-rose-deep">預約這段體驗 →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 朵朵曉語：滿版心語 */}
      <section data-screen-label="首頁 朵朵曉語" className="relative isolate overflow-hidden bg-blush text-ink">
        <Image
          src="/images/whispers.webp"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover object-[40%_50%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 veil-center" />
        <div className="poem on-photo mx-auto flex min-h-[min(70svh,560px)] max-w-[680px] flex-col items-center justify-center gap-6 px-6 py-[clamp(80px,10vw,130px)] text-center">
          <span data-reveal className="font-en text-[14px] tracking-[.3em] text-gold">
            WHISPERS
          </span>
          <h2 data-reveal className="m-0 font-serif text-[clamp(24px,3vw,36px)] leading-[1.7] font-normal tracking-[.08em]">
            把走過的人生，
            <br />
            沉澱成溫柔而堅定的心語
          </h2>
          <Link data-reveal href="/whispers" className={btnGhostLight}>
            讀朵朵的心語 →
          </Link>
        </div>
      </section>
    </>
  );
}

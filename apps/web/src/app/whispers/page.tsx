import Image from "next/image";
import Link from "next/link";
import { Phrase } from "@/components/Phrase";
import { getWhispers } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMeta(
  "朵朵曉語",
  "把走過的人生，沉澱成溫柔而堅定的心語。朵朵記錄生活、心情、故事與體悟。",
  "/whispers",
);

export default async function WhispersPage() {
  const whispers = await getWhispers();
  return (
    <>
      {/* 1. 滿版氛圍圖 + 標題 */}
      <section data-screen-label="朵朵曉語 列表" className="relative isolate overflow-hidden bg-blush text-ink">
        <Image
          src="/images/whispers.webp"
          alt="晨光書桌上攤開的空白筆記本、鋼筆與一杯茶"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[40%_50%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,249,245,.2)_0%,rgba(255,249,245,.8)_40%,rgba(255,249,245,.95)_100%)]" />
        <div className="poem on-photo mx-auto flex min-h-[min(62svh,520px)] max-w-[1000px] flex-col justify-end gap-5 px-[clamp(20px,4vw,48px)] pt-24 pb-[clamp(40px,6vw,72px)]">
          <span className="font-en text-[14px] tracking-[.3em] text-gold">WHISPERS</span>
          <h1 className="m-0 font-serif text-[clamp(28px,3.4vw,42px)] leading-[1.6] font-normal tracking-[.08em]">
            把走過的人生，
            <br />
            沉澱成<span className="inline-block">溫柔而堅定的心語。</span>
          </h1>
          <p className="m-0 font-serif text-[16px] leading-[2] tracking-[.06em] text-body">
            <span className="inline-block">如果有一句話剛好說中妳，</span>
            <span className="inline-block">就讓它陪妳走一段。</span>
          </p>
        </div>
      </section>

      {/* 2. 文章列表：編號 + 主題 + 標題 */}
      <section className="px-[clamp(20px,4vw,48px)] py-[clamp(56px,8vw,110px)]">
        <ol className="mx-auto m-0 flex max-w-[1000px] list-none flex-col p-0">
          {whispers.map((ar) => (
            <li key={ar.slug} data-reveal>
              <Link
                href={`/whispers/${ar.slug}`}
                className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-[clamp(14px,3vw,40px)] border-t border-line py-[24px] hover:bg-row-hover dt:grid-cols-[minmax(0,120px)_minmax(0,1fr)_auto] dt:py-[32px]"
              >
                <span className="font-en text-[clamp(34px,4vw,48px)] leading-none text-gold-large">{ar.no}</span>
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] tracking-[.2em] text-gold">{ar.theme}</span>
                  <h2 className="poem m-0 font-serif text-[clamp(18px,2vw,23px)] leading-[1.6] font-medium tracking-[.04em] text-ink">
                    <Phrase text={ar.title} />
                  </h2>
                </div>
                <span aria-hidden className="text-[18px] text-rose-deep">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

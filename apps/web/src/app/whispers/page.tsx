import Link from "next/link";
import { getWhispers } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { Phrase } from "@/components/Phrase";

export const revalidate = 300;

export const metadata = pageMeta(
  "朵朵曉語",
  "把走過的人生，沉澱成溫柔而堅定的心語。朵朵記錄生活、心情、故事與體悟。",
  "/whispers",
);

export default async function WhispersPage() {
  const whispers = await getWhispers();
  return (
    <section data-screen-label="朵朵曉語 列表" className="px-[clamp(20px,4vw,48px)] py-[clamp(64px,9vw,120px)]">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-14">
        <div className="flex max-w-[680px] flex-col gap-[22px]">
          <span className="font-en text-[14px] tracking-[.3em] text-gold">WHISPERS</span>
          <h1 className="poem m-0 font-serif text-[clamp(26px,3.2vw,40px)] leading-[1.6] font-normal tracking-[.08em]">
            把走過的人生，
            <br />
            沉澱成
            <wbr />
            溫柔而堅定的心語。
          </h1>
          <p className="m-0 text-[16px] leading-[2.1] text-body">
            有些故事，是經歷過才懂得。這裡記錄我的生活、心情、故事與體悟，也分享那些曾經困住我，後來才漸漸明白的事。
          </p>
          <p className="m-0 font-serif text-[16px] leading-[2.1] text-rose-deep">如果有一句話，剛好說中了妳的心情，那就讓它陪妳走一段。</p>
        </div>
        <div className="flex flex-col">
          {whispers.map((ar) => (
            <Link
              key={ar.slug}
              href={`/whispers/${ar.slug}`}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-[clamp(16px,3vw,40px)] border-t border-line py-[26px] hover:bg-row-hover dt:grid-cols-[minmax(0,120px)_minmax(0,1fr)] dt:py-[34px]"
            >
              <span className="font-en text-[clamp(30px,4vw,46px)] leading-none text-gold-line">{ar.no}</span>
              <div className="flex flex-col gap-[10px]">
                <span className="text-[13px] tracking-[.2em] text-gold">{ar.theme}</span>
                <h3 className="poem m-0 font-serif text-[clamp(18px,2vw,23px)] leading-[1.6] font-medium tracking-[.04em] text-ink">
                  <Phrase text={ar.title} />
                </h3>
                <p className="m-0 text-[15px] leading-[1.9] text-body">{ar.sub}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="border-t border-line py-10 text-center font-serif text-[17px] leading-[2.1] text-ink-2">
          我是朵朵。還在生活，也還在學習；還在經歷，也還在慢慢明白。
          <br />
          每一朵花，都有屬於自己的花期。
        </div>
      </div>
    </section>
  );
}

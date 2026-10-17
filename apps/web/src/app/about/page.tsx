import Image from "next/image";
import Link from "next/link";
import { PhotoSlot } from "@/components/PhotoSlot";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "關於朵朵",
  "我不是天生閃亮，只是決定重新把自己找回來。認識朵朵，以及她創立「朵朵曉語」與「好好告別」的原因。",
  "/about",
);

/** 朵朵的故事：以朵朵原文的關鍵句為主，濃縮成三個章節 */
const CHAPTERS = [
  {
    eyebrow: "BEFORE",
    title: "曾經，努力撐著",
    text: "長期偽單親、婚內失婚。我一個人扛起家，也在無數個獨自承擔的日子裡，慢慢弄丟了自己。",
    img: "/images/journey-tidy.webp",
    alt: "陽光下整理好的衣物與行李箱",
  },
  {
    eyebrow: "2026",
    title: "把自己，帶回自己的人生",
    text: "恢復單身後，我開始做喜歡的事：說走就走的微旅行、到海邊吹吹風、重新打理自己的模樣。",
    img: "/images/about-sea.webp",
    alt: "停在海邊的車內，副駕上放著粉色絲巾",
  },
  {
    eyebrow: "NOW",
    title: "妳並不孤單",
    text: "從美感新生、珍藏紀錄與轉場儀式開始陪妳，也逐步串連形象、心理與法律等專業資源。",
    img: "/images/pillar-ritual.webp",
    alt: "燭光、玫瑰與封蠟信封",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      {/* 1. 開場：朵朵本人照（佔位，待業主提供）＋主標 */}
      <section data-screen-label="關於朵朵" className="px-[clamp(20px,4vw,48px)] pt-[clamp(40px,7vw,96px)] pb-[clamp(64px,8vw,110px)]">
        <div className="mx-auto grid max-w-[1140px] items-center gap-[clamp(32px,6vw,90px)] dt:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <PhotoSlot ratio="3/4" label="朵朵本人形象照" pad={16} className="max-dt:max-h-[70svh]" />
            <span className="font-en text-[17px] tracking-[.1em] text-gold italic">About Duoduo</span>
          </div>
          <div className="poem flex flex-col gap-6">
            <h1 className="m-0 font-serif text-[clamp(28px,3.4vw,42px)] leading-[1.6] font-normal tracking-[.08em] text-ink">
              我不是天生閃亮，
              <br />
              只是決定<span className="inline-block">重新把自己找回來。</span>
            </h1>
            <p className="m-0 font-serif text-[17px] leading-[2] tracking-[.06em] text-body">
              我是朵朵。<span className="inline-block">一個曾經在婚姻裡努力撐著，</span>
              <span className="inline-block">卻慢慢弄丟自己的女人。</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. 轉折金句 */}
      <section data-screen-label="關於朵朵 轉折" className="bg-rose px-6 py-[clamp(72px,10vw,130px)] text-center text-on-rose">
        <blockquote data-reveal className="poem mx-auto my-0 flex max-w-[720px] flex-col gap-6 font-serif">
          <p className="m-0 text-[clamp(20px,2.4vw,28px)] leading-[1.9] tracking-[.06em]">
            <span className="inline-block">那段不忠的事實，</span>
            <span className="inline-block">像是上帝狠狠打醒我的一巴掌。</span>
          </p>
          <p className="m-0 text-[clamp(22px,2.8vw,32px)] tracking-[.2em] text-white">——不值得！</p>
        </blockquote>
      </section>

      {/* 3. 三個章節：圖文交錯 */}
      <section data-screen-label="關於朵朵 故事" className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-[clamp(56px,8vw,110px)]">
          {CHAPTERS.map((c, i) => (
            <div
              key={c.title}
              className="grid items-center gap-[clamp(24px,5vw,72px)] dt:grid-cols-2"
            >
              <div data-reveal className={i % 2 ? "dt:order-2" : ""}>
                <div className="relative aspect-[3/2] overflow-hidden bg-blush">
                  <Image src={c.img} alt={c.alt} fill sizes="(max-width: 819px) 100vw, 50vw" className="object-cover" />
                </div>
              </div>
              <div data-reveal className="poem flex flex-col gap-4">
                <span className="font-en text-[14px] tracking-[.3em] text-gold">{c.eyebrow}</span>
                <h2 className="m-0 font-serif text-[clamp(23px,2.6vw,32px)] leading-[1.6] font-normal tracking-[.08em] text-ink">{c.title}</h2>
                <p className="m-0 text-[16px] leading-[2] tracking-[.04em] text-body">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 滿版金句 */}
      <section data-screen-label="關於朵朵 發光" className="relative isolate overflow-hidden bg-ink-2 text-white">
        <Image src="/images/journey-bloom.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_40%]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[rgba(58,40,38,.42)]" />
        <div className="poem on-photo mx-auto flex min-h-[min(64svh,520px)] max-w-[680px] flex-col items-center justify-center gap-5 px-6 py-24 text-center font-serif">
          <p data-reveal className="m-0 text-[clamp(26px,3.4vw,42px)] leading-[1.6] tracking-[.12em]">
            <span className="inline-block">原來，</span>
            <span className="inline-block">我一直都還在發著光。</span>
          </p>
        </div>
      </section>

      {/* 5. 收尾 + CTA */}
      <section data-screen-label="關於朵朵 收尾" className="px-6 py-[clamp(72px,9vw,120px)] text-center">
        <div className="poem mx-auto flex max-w-[640px] flex-col items-center gap-7">
          <p data-reveal className="m-0 font-serif text-[clamp(19px,2vw,23px)] leading-[2] tracking-[.06em] text-rose-deep">
            我不是站在終點告訴妳該怎麼走，
            <br />
            <span className="inline-block">而是正走在路上，</span>
            <span className="inline-block">把相信的事一步一步實現。</span>
          </p>
          <div data-reveal className="flex flex-wrap justify-center gap-3">
            <Link
              href="/farewell"
              className="inline-flex min-h-[48px] items-center bg-rose px-[28px] text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep hover:text-on-rose"
            >
              探索好好告別 →
            </Link>
            <Link
              href="/whispers"
              className="inline-flex min-h-[48px] items-center border border-rose px-[28px] text-[15px] tracking-[.16em] text-rose-deep hover:text-rose-deep"
            >
              讀朵朵的心語
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

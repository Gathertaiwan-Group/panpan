import Link from "next/link";
import { content } from "@duoduo/content";
import { PhotoSlot } from "@/components/PhotoSlot";
import { getRoadmap, getSets } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMeta(
  "好好告別",
  "有些告別，是為了讓我們重新遇見自己。「好好告別」把美麗、紀錄、儀式與生活重新組合，陪妳好好走過人生轉場。",
  "/farewell",
);

export default async function FarewellPage() {
  const [sets, roadmap] = await Promise.all([getSets(), getRoadmap()]);
  return (
    <>
      <section data-screen-label="好好告別 共鳴" className="bg-rose px-6 py-[clamp(80px,11vw,150px)] text-center text-on-rose">
        <div className="mx-auto flex max-w-[680px] flex-col items-center gap-[30px]">
          <span className="font-en text-[14px] tracking-[.34em] text-on-rose-2">A GRACEFUL FAREWELL · <span className="whitespace-nowrap">好好告別</span>
          </span>
          <h1 className="m-0 font-serif text-[clamp(28px,3.8vw,46px)] leading-[1.6] font-normal tracking-[.1em]">
            有些告別，
            <br />
            是為了讓我們重新遇見自己。
          </h1>
          <p className="m-0 font-serif text-[17px] leading-[2.2] tracking-[.06em]">
            人生裡，總會有一些時刻，讓我們不得不重新選擇。
            <br />
            離開熟悉的關係，換一種生活方式，
            <br />
            重新整理自己，也重新想像下一個自己。
          </p>
          <p className="m-0 font-serif text-[17px] leading-[2.2] tracking-[.06em]">
            原來人生不是失去了一個版本的自己，
            <br />
            而是終於有機會，成為下一個自己。
          </p>
        </div>
      </section>

      <section className="border-b border-line px-6 py-11">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-center gap-[clamp(10px,2vw,24px)] font-serif text-[clamp(16px,1.8vw,20px)] tracking-[.14em] text-rose-deep">
          {["告別", "整理", "重拾自己", "綻放", "重新開始"].map((w, i) => (
            <span key={w} className="contents">
              {i > 0 && <span className="text-gold-line">—</span>}
              <span>{w}</span>
            </span>
          ))}
        </div>
      </section>

      <section data-screen-label="好好告別 是什麼" className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto grid max-w-[1140px] grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-center gap-[clamp(32px,6vw,90px)]">
          <PhotoSlot ratio="4/5" label="形象照：鏡前重新打理自己的女性" pad={16} />
          <div className="flex flex-col gap-[22px] text-[16px] leading-[2.1] text-body">
            <h2 className="m-0 font-serif text-[clamp(24px,2.6vw,32px)] leading-[1.7] font-normal tracking-[.08em] text-ink">
              為每一次重要的轉身，
              <br />
              留下一點美、一點紀念。
            </h2>
            <p className="m-0">「好好告別」，想陪妳走過的，就是這一段轉身的過程——也為下一個自己，留一份美好的期待。</p>
            <p className="m-0">
              在生活與歲月裡奔波，有些時候，我們會忘記自己最初的模樣。有些時候，只是重新打理一次自己，就會發現——原來，我們一直都還在發著光。
            </p>
            <p className="m-0 font-serif text-rose-deep">就像被歲月輕輕覆上一層塵埃，拂去之後，才再次看見那個熟悉而閃耀的自己。</p>
          </div>
        </div>
      </section>

      <section data-screen-label="好好告別 組合" className="bg-blush px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-11 text-center">
          <p className="m-0 max-w-[600px] text-[16px] leading-[2.1] text-body">
            真正的改變，往往從一個小小的念頭開始。所以，「好好告別」想做的，不是一項項單獨的服務，而是把不同領域的美好重新組合。
          </p>
          <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(150px,1fr))] border-y border-line-2">
            {content.experiencePillars.map((p) => (
              <div key={p.en} className="flex flex-col items-center gap-2 px-3 py-[34px]">
                <span className="font-serif text-[30px] tracking-[.2em] text-rose-deep">{p.zh}</span>
                <span className="font-en text-[13px] tracking-[.3em] text-gold">{p.en}</span>
              </div>
            ))}
          </div>
          <p className="m-0 max-w-[600px] font-serif text-[17px] leading-[2.1] text-ink">
            依照妳此刻的需要，搭配不同的專業與服務，設計一段屬於妳的人生轉場體驗。讓妳不只是完成一件事，而是真真實實地，好好走過一個階段。
          </p>
        </div>
      </section>

      <section data-screen-label="好好告別 三個 SET" className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-12">
          <div className="flex max-w-[640px] flex-col gap-[18px]">
            <span className="font-en text-[14px] tracking-[.3em] text-gold">✦ 重新看見自己</span>
            <h2 className="m-0 font-serif text-[clamp(26px,3vw,38px)] font-normal tracking-[.1em]">為自己選一段值得的體驗</h2>
            <p className="m-0 text-[16px] leading-[2.1] text-body">
              有時候，改變不需要很大。重新整理髮型、做一雙喜歡的手、重新畫上喜歡的妝，當妳再次看見鏡子裡的自己，也許會發現——那個閃閃發光的妳，一直都在。
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-7">
            {sets.map((s) => (
              <div key={s.slug} className="flex flex-col gap-4 border border-line bg-white">
                <PhotoSlot ratio="4/3" label={s.photo} src={s.coverUrl} sizes="(max-width: 819px) 100vw, 33vw" />
                <div className="flex flex-1 flex-col gap-[14px] px-7 pt-2 pb-[30px]">
                  <span className="font-en text-[13px] tracking-[.24em] text-gold">{s.no}</span>
                  <h3 className="m-0 font-serif text-[22px] font-medium tracking-[.1em] text-ink">{s.name}</h3>
                  <p className="m-0 font-serif text-[16px] text-rose-deep">{s.tagline}</p>
                  <p className="m-0 text-[14px] leading-[1.9] text-body">{s.desc}</p>
                  <Link
                    href={`/farewell/${s.slug}`}
                    className="mt-auto self-start bg-rose px-[22px] py-3 text-[14px] tracking-[.14em] text-on-rose hover:bg-rose-deep hover:text-on-rose"
                  >
                    探索這段體驗 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {roadmap.show && (
            <div className="flex flex-col gap-[18px] border-t border-line pt-9">
              <span className="text-[14px] tracking-[.16em] text-muted">更多人生轉場體驗，陸續加入中</span>
              <div className="flex flex-wrap gap-[10px]">
                {roadmap.items.map((r) => (
                  <span key={r} className="border border-dashed border-gold-line px-4 py-2 text-[14px] tracking-[.08em] text-muted">
                    {r}
                  </span>
                ))}
              </div>
              <p className="m-0 text-[14px] leading-[1.9] text-muted">未來也能依照妳的需求，單選或自由搭配成專屬體驗。</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

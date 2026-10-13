import { content } from "@duoduo/content";
import { PhotoSlot } from "@/components/PhotoSlot";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "關於朵朵",
  "我不是天生閃亮，只是決定重新把自己找回來。認識朵朵，以及她創立「朵朵曉語」與「好好告別」的原因。",
  "/about",
);

export default function AboutPage() {
  return (
    <section data-screen-label="關於朵朵" className="px-[clamp(20px,4vw,48px)] py-[clamp(56px,8vw,110px)]">
      <div className="mx-auto grid max-w-[1140px] grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-[clamp(32px,6vw,90px)]">
        <div className="flex flex-col gap-5 dt:sticky dt:top-[110px]">
          <PhotoSlot ratio="3/4" label="朵朵本人形象照" pad={16} />
          <span className="font-en text-[17px] tracking-[.1em] text-gold italic">About Duoduo</span>
        </div>
        <div className="flex flex-col gap-[22px]">
          <h1 className="m-0 font-serif text-[clamp(26px,3.2vw,40px)] leading-[1.6] font-normal tracking-[.08em] text-ink">
            我不是天生閃亮，
            <br />
            只是決定重新把自己找回來。
          </h1>
          {content.about.map((t, i) =>
            t.startsWith(">") ? (
              <p key={i} className="m-0 font-serif text-[19px] leading-[2.1] tracking-[.04em] text-rose-deep">
                {t.slice(1)}
              </p>
            ) : (
              <p key={i} className="m-0 text-[16px] leading-[2.1] tracking-[.04em] text-body">
                {t}
              </p>
            ),
          )}
          <div className="mt-5 border-y border-line py-9 font-serif text-[19px] leading-[2] text-rose-deep">
            我是朵朵。
            <br />
            願每一個曾經努力撐著的妳，都能慢慢找回自己，活出有底氣、也有光的模樣。
            <br />
            每一朵花，都有屬於自己的花期。
          </div>
        </div>
      </div>
    </section>
  );
}

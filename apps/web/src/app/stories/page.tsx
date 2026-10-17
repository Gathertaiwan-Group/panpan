import Image from "next/image";
import Link from "next/link";
import { PhotoSlot } from "@/components/PhotoSlot";
import { Phrase } from "@/components/Phrase";
import { StoryShareButton } from "@/components/StoryShare";
import { getStories } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMeta(
  "新生故事",
  "每一段轉身，都值得被好好珍藏。她們也曾經站在人生的轉身處——分享與公開均經當事人同意。",
  "/stories",
);

export default async function StoriesPage() {
  const stories = await getStories();
  return (
    <>
      {/* 1. 開場 */}
      <section data-screen-label="新生故事" className="px-[clamp(20px,4vw,48px)] pt-[clamp(48px,8vw,110px)] pb-[clamp(40px,6vw,72px)]">
        <div className="poem mx-auto flex max-w-[1140px] flex-col gap-5">
          <span className="font-en text-[14px] tracking-[.3em] text-gold">STORIES OF RENEWAL</span>
          <h1 className="m-0 font-serif text-[clamp(28px,3.4vw,42px)] leading-[1.6] font-normal tracking-[.08em] text-ink">
            每一段轉身，
            <br />
            都值得被好好珍藏
          </h1>
          <p className="m-0 max-w-[560px] font-serif text-[16px] leading-[2] tracking-[.06em] text-body">
            <span className="inline-block">人生可以有不同的走法，</span>
            <span className="inline-block">妳也可以有自己的下一步。</span>
          </p>
        </div>
      </section>

      {/* 2. 故事卡：行動版橫向滑動，桌面三欄 */}
      <section aria-label="故事列表" className="px-[clamp(20px,4vw,48px)] pb-[clamp(72px,9vw,120px)]">
        <div className="mx-auto max-w-[1140px]">
          <div className="snap-row -mx-[clamp(20px,4vw,48px)] flex snap-x snap-mandatory scroll-px-[clamp(20px,4vw,48px)] gap-4 overflow-x-auto px-[clamp(20px,4vw,48px)] pb-2 dt:mx-0 dt:grid dt:grid-cols-3 dt:gap-7 dt:overflow-visible dt:px-0">
            {stories.map((st, i) => (
              <Link
                key={st.slug}
                href={`/stories/${st.slug}`}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 110}ms` }}
                className="flex w-[80%] max-w-[340px] shrink-0 snap-start flex-col gap-3 hover:opacity-[.88] dt:w-auto dt:max-w-none"
              >
                <PhotoSlot ratio="3/2" label="故事主視覺（經同意）" src={st.coverUrl} sizes="(max-width: 819px) 80vw, 33vw" />
                <span className="mt-1 text-[13px] tracking-[.2em] text-gold">{st.no}</span>
                <h2 className="poem m-0 font-serif text-[20px] leading-[1.6] font-medium tracking-[.06em] text-ink">
                  <Phrase text={st.title} />
                </h2>
                <span className="text-[14px] tracking-[.14em] text-rose-deep">閱讀故事 →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 分享徵集 */}
      <section data-screen-label="新生故事 分享" className="bg-blush">
        <div className="mx-auto grid max-w-[1240px] items-stretch dt:grid-cols-2">
          <div className="relative aspect-[3/2] overflow-hidden dt:aspect-auto dt:min-h-[480px]">
            <Image src="/images/stories-share.webp" alt="咖啡桌上兩雙輕輕相握的手" fill sizes="(max-width: 819px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="poem flex flex-col items-start justify-center gap-5 px-[clamp(20px,5vw,72px)] py-[clamp(48px,7vw,88px)]">
            <span data-reveal className="font-en text-[14px] tracking-[.3em] text-gold">
              SHARE YOUR STORY
            </span>
            <h2 data-reveal className="m-0 font-serif text-[clamp(24px,2.8vw,34px)] leading-[1.6] font-normal tracking-[.08em] text-ink">
              準備好的時候，
              <br />
              說說妳的轉身故事
            </h2>
            <div data-reveal>
              <StoryShareButton />
            </div>
            <span className="text-[13px] leading-[1.8] text-muted">分享與公開均須經當事人同意，尊重匿名、隱私與撤回的意願。</span>
          </div>
        </div>
      </section>
    </>
  );
}

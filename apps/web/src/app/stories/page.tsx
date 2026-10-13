import Link from "next/link";
import { PhotoSlot } from "@/components/PhotoSlot";
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
    <section data-screen-label="新生故事" className="px-[clamp(20px,4vw,48px)] py-[clamp(64px,9vw,120px)]">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-14">
        <div className="flex max-w-[680px] flex-col gap-[22px]">
          <span className="font-en text-[14px] tracking-[.3em] text-gold">STORIES OF RENEWAL</span>
          <h1 className="m-0 font-serif text-[clamp(26px,3.2vw,40px)] leading-[1.6] font-normal tracking-[.08em]">
            每一段轉身，
            <br />
            都值得被好好珍藏
          </h1>
          <p className="m-0 text-[16px] leading-[2.1] text-body">
            她們也曾經站在人生的轉身處。有人正在告別一段關係，有人正在重新開始；有人走過了很長一段辛苦的日子，終於願意為自己做一件事。
          </p>
          <p className="m-0 text-[16px] leading-[2.1] text-body">
            不是為了比較誰過得比較辛苦，而是希望當下一個正在人生轉彎處的妳走進這裡時，能夠知道：人生可以有不同的走法，而妳也可以有自己的下一步。
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-7">
          {stories.map((st) => (
            <Link
              key={st.slug}
              href={`/stories/${st.slug}`}
              className="flex flex-col gap-4 border-b border-line pb-5 hover:opacity-[.86]"
            >
              <PhotoSlot ratio="3/2" label="故事主視覺（經同意）" src={st.coverUrl} sizes="(max-width: 819px) 100vw, 33vw" />
              <span className="text-[13px] tracking-[.2em] text-gold">{st.no}</span>
              <h3 className="m-0 font-serif text-[20px] leading-[1.6] font-medium tracking-[.06em] text-ink">{st.title}</h3>
              <p className="m-0 text-[15px] leading-[1.9] text-body">{st.desc}</p>
              <span className="text-[14px] tracking-[.14em] text-rose-deep">閱讀這段故事 →</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-col items-center gap-5 bg-blush p-[clamp(36px,5vw,64px)] text-center">
          <p className="m-0 font-serif text-[clamp(17px,1.8vw,21px)] leading-[2] text-ink">
            每個人都有自己的故事，也有自己的步調。
            <br />
            如果妳也曾經歷過一段重要的轉身，歡迎在準備好的時候，與我們分享。
          </p>
          <StoryShareButton />
          <span className="text-[13px] leading-[1.8] text-muted">
            分享與公開故事均須取得當事人同意，並尊重匿名、隱私及撤回公開的意願。
          </span>
        </div>
      </div>
    </section>
  );
}

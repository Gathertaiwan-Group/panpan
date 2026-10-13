import Link from "next/link";
import { notFound } from "next/navigation";
import { content, fallbackStories } from "@duoduo/content";
import { getStory } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

export function generateStaticParams() {
  return fallbackStories.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) return {};
  const meta = pageMeta(story.title, story.desc, `/stories/${slug}`);
  // 範例故事（非真實會員故事）不讓搜尋引擎收錄
  return story.isSample ? { ...meta, robots: { index: false, follow: true } } : meta;
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) notFound();

  return (
    <section
      data-screen-label="新生故事 詳細頁"
      className="px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,72px)] pb-[clamp(72px,9vw,120px)]"
    >
      <div className="mx-auto flex max-w-[760px] flex-col gap-9">
        <Link href="/stories" className="hit self-start text-[14px] tracking-[.12em] text-muted">
          ← 新生故事
        </Link>
        <div className="flex flex-col gap-[14px]">
          <span className="text-[13px] tracking-[.2em] text-gold">{story.no}</span>
          <h1 className="m-0 font-serif text-[clamp(26px,3vw,36px)] leading-[1.6] font-normal tracking-[.06em]">{story.title}</h1>
        </div>
        {content.storyDetailStructure.map((part, i) => {
          const text = story.parts[i];
          return (
            <div key={part.title} className="flex flex-col gap-[14px] border-t border-line pt-7">
              <span className="font-serif text-[19px] tracking-[.1em] text-rose-deep">{part.title}</span>
              {text ? (
                <div className="flex flex-col gap-3 text-[16.5px] leading-[2.15] text-ink-2">
                  {text.split("\n").filter(Boolean).map((p, j) => (
                    <p key={j} className="m-0">
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-gold-line p-[22px] text-[14px] leading-[1.9] text-muted">{part.hint}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

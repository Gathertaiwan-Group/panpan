import Link from "next/link";
import { notFound } from "next/navigation";
import { fallbackWhispers } from "@duoduo/content";
import { getWhisper } from "@/lib/data";
import { pageMeta } from "@/lib/seo";
import { parseWhisperBody } from "@/lib/whisper-body";
import { Phrase } from "@/components/Phrase";

export const revalidate = 300;

export function generateStaticParams() {
  return fallbackWhispers.map((w) => ({ slug: w.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const found = await getWhisper(slug);
  if (!found) return {};
  const meta = pageMeta(found.whisper.title, found.whisper.sub, `/whispers/${slug}`);
  return { ...meta, openGraph: { ...meta.openGraph, type: "article" as const } };
}

/** 內文 blocks 樣式：依原型 renderVals() articleBlocks */
const blockClass = {
  heading: "mt-7 font-serif text-[22px] leading-[1.7] text-rose-deep",
  quote: "my-[10px] border-l-2 border-gold-line py-1 pl-[22px] font-serif text-[19px] leading-[2] text-ink",
  sign: "mt-2 font-serif text-[16px] leading-[2] text-rose-deep",
  para: "m-0 font-sans text-[16.5px] leading-[2.15] text-ink-2",
} as const;

export default async function WhisperPage({ params }: Props) {
  const { slug } = await params;
  const found = await getWhisper(slug);
  if (!found) notFound();
  const { whisper: a, prev, next } = found;
  const blocks = parseWhisperBody(a.body);

  return (
    <article
      data-screen-label="朵朵曉語 文章"
      className="px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,72px)] pb-[clamp(72px,9vw,120px)]"
    >
      <div className="mx-auto flex max-w-[680px] flex-col gap-[22px]">
        <Link href="/whispers" className="hit self-start text-[14px] tracking-[.12em] text-muted">
          ← 朵朵曉語
        </Link>
        <span className="mt-6 text-[13px] tracking-[.2em] text-gold">
          {a.no}｜{a.theme}
        </span>
        <h1 className="poem m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.6] font-normal tracking-[.04em] text-ink">
          <Phrase text={a.title} />
        </h1>
        <p className="m-0 mb-5 font-serif text-[17px] leading-[1.9] text-rose-deep">{a.sub}</p>
        {blocks.map((b, i) =>
          b.kind === "heading" ? (
            <h2 key={i} className={`poem mb-0 font-normal tracking-[.03em] ${blockClass.heading}`}>
              <Phrase text={b.text} />
            </h2>
          ) : b.kind === "quote" ? (
            <blockquote key={i} className={`mx-0 tracking-[.03em] [text-wrap:pretty] ${blockClass.quote}`}>
              {b.text}
            </blockquote>
          ) : (
            <p key={i} className={`mb-0 tracking-[.03em] [text-wrap:pretty] ${b.kind === "sign" ? blockClass.sign : blockClass.para}`}>
              {b.text}
            </p>
          ),
        )}
        <div className="mt-7 flex flex-col gap-[10px] bg-blush p-7">
          <span className="text-[13px] tracking-[.16em] text-muted">{a.letterTo}</span>
          <p className="m-0 font-serif text-[17px] leading-[2] text-ink">{a.letter}</p>
        </div>
        <nav aria-label="上一篇／下一篇" className="mt-7 flex flex-wrap justify-between gap-5 border-t border-line pt-6">
          {prev ? (
            <Link href={`/whispers/${prev.slug}`} rel="prev" className="hit text-[14px] tracking-[.08em] text-rose-deep">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/whispers/${next.slug}`} rel="next" className="hit text-[14px] tracking-[.08em] text-rose-deep">
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { fallbackSets } from "@duoduo/content";
import { PhotoSlot } from "@/components/PhotoSlot";
import { SetActions } from "@/components/SetActions";
import { getSet } from "@/lib/data";
import { LINE_URL } from "@/lib/env";
import { pageMeta } from "@/lib/seo";
import { Phrase } from "@/components/Phrase";

export const revalidate = 300;

export function generateStaticParams() {
  return fallbackSets.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const found = await getSet(slug);
  if (!found) return {};
  return pageMeta(found.set.name, `${found.set.headline}——${found.set.desc}`, `/farewell/${slug}`);
}

export default async function SetPage({ params }: Props) {
  const { slug } = await params;
  const found = await getSet(slug);
  if (!found) notFound();
  const { set: cur, others } = found;

  return (
    <section
      data-screen-label="商品詳細頁"
      className="px-[clamp(20px,4vw,48px)] pt-[clamp(40px,6vw,72px)] pb-[clamp(72px,9vw,120px)]"
    >
      <div className="mx-auto flex max-w-[1140px] flex-col gap-10">
        <Link href="/farewell" className="hit self-start text-[14px] tracking-[.12em] text-muted">
          ← 好好告別 ／ 所有體驗
        </Link>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(32px,6vw,80px)]">
          {/* 行動版：主圖高度不超過第一屏扣掉底部固定 CTA，避免 CTA 蓋住主圖下緣（桌面不受影響） */}
          <PhotoSlot
            ratio="4/5"
            label={cur.photo}
            src={cur.coverUrl}
            pad={16}
            priority
            sizes="(max-width: 819px) 100vw, 50vw"
            className="max-dt:max-h-[max(300px,calc(100svh_-_260px_-_env(safe-area-inset-bottom)))] dt:sticky dt:top-[110px]"
          />
          <div className="flex flex-col gap-6">
            <span className="font-en text-[14px] tracking-[.26em] text-gold">{cur.no}</span>
            <h1 className="poem m-0 font-serif text-[clamp(28px,3.4vw,42px)] font-medium tracking-[.1em] text-ink">
              <Phrase text={cur.name} />
            </h1>
            <p className="m-0 font-serif text-[clamp(18px,1.8vw,22px)] leading-[1.8] text-rose-deep">{cur.headline}</p>
            <div className="h-px w-10 bg-gold-line" />
            <div className="flex flex-col gap-[14px]">
              {cur.body.map((line, i) => (
                <p key={i} className="m-0 font-serif text-[17px] leading-[2] tracking-[.05em] text-ink-2">
                  {line}
                </p>
              ))}
            </div>
            <SetActions slug={cur.slug} name={cur.name} lineUrl={LINE_URL} />
            <div className="mt-6 flex flex-col gap-4">
              <span className="text-[13px] tracking-[.14em] text-muted">其他體驗</span>
              <div className="grid grid-cols-2 gap-3">
                {others.map((o) => (
                  <Link key={o.slug} href={`/farewell/${o.slug}`} className="group flex flex-col gap-2 text-ink hover:text-rose-deep">
                    <PhotoSlot ratio="4/5" label={o.photo} src={o.coverUrl} sizes="(max-width: 819px) 50vw, 240px" />
                    <span className="poem font-serif text-[15px] leading-[1.6] tracking-[.06em]">
                      <Phrase text={o.name} /> →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

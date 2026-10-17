import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { durationLabel, money } from "@/components/booking/ui";
import { enabledPayTypes } from "@/lib/booking/pchomepay";
import { getViewer } from "@/lib/auth/staff";
import { getBookableSet } from "@/lib/booking/repo";
import { taipeiMonth } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const set = await getBookableSet(slug);
  return {
    title: set ? `線上預約｜${set.name}` : "線上預約",
    robots: { index: false, follow: false },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const set = await getBookableSet(slug);
  if (!set) redirect(`/farewell/${slug}`);
  const viewer = await getViewer();
  const prefill = viewer?.emailConfirmed ? { name: viewer.name, email: viewer.email } : undefined;

  return (
    <section
      data-screen-label="線上預約"
      className="px-[clamp(16px,4vw,48px)] pt-[clamp(28px,5vw,64px)] pb-[clamp(56px,8vw,110px)]"
    >
      <div className="mx-auto flex max-w-[720px] flex-col gap-8">
        <Link href={`/farewell/${set.slug}`} className="hit self-start text-[14px] tracking-[.12em] text-muted">
          ← 回到 {set.name}
        </Link>
        <header className="flex flex-col gap-3 border-b border-line pb-6">
          <span className="font-en text-[14px] tracking-[.26em] text-gold">{set.code} · BOOKING</span>
          <h1 className="m-0 font-serif text-[clamp(26px,3.4vw,38px)] font-medium tracking-[.1em] text-ink">{set.name}</h1>
          <p className="m-0 text-[15px] tracking-[.08em] text-body">
            {durationLabel(set.durationMinutes)}　·　{money(set.price)}（線上全額付款，付款完成即確認）
          </p>
        </header>
        <BookingFlow
          set={{ slug: set.slug, code: set.code, name: set.name, price: set.price, durationMinutes: set.durationMinutes }}
          atmEnabled={enabledPayTypes().includes("ATM")}
          initialMonth={taipeiMonth(new Date())}
          prefill={prefill}
        />
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingStatus } from "@/components/booking/BookingStatus";
import { getPublicBooking } from "@/lib/booking/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "預約狀態",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ orderNo: string }>; searchParams: Promise<{ t?: string }> };

export default async function BookingStatusPage({ params, searchParams }: Props) {
  const { orderNo } = await params;
  const { t = "" } = await searchParams;
  // 從付款頁回來時立刻向閘道回查一次（notify 可能還沒到）
  const booking = await getPublicBooking(orderNo, t, { refresh: true });
  if (!booking) notFound();

  return (
    <section
      data-screen-label="預約狀態"
      className="px-[clamp(16px,4vw,48px)] pt-[clamp(36px,6vw,72px)] pb-[clamp(64px,9vw,120px)]"
    >
      <div className="mx-auto flex max-w-[640px] flex-col gap-8">
        <BookingStatus initial={booking} token={t} />
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/account/BookingCard";
import { Shell } from "@/components/backoffice/Shell";
import { Notice, ghostBtn, money } from "@/components/booking/ui";
import { CUSTOMER_NAV } from "@/app/account/nav";
import { getMyBooking } from "@/lib/account/bookings";
import { CONTACT_EMAIL, LINE_URL } from "@/lib/account/contact";
import { taipeiParts, whenLabel } from "@/lib/account/format";
import { requireViewer } from "@/lib/auth/staff";
import { STATUS_LABEL, paymentLabel } from "@/lib/booking/status-labels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "預約詳情", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function MyBookingDetail({ params }: Props) {
  const { id } = await params;
  const me = await requireViewer(`/account/bookings/${encodeURIComponent(id)}`);
  // RPC 只回本人（auth.uid()）的預約；他人的或不存在 → 404（不透露是否存在）
  const b = await getMyBooking(id);
  if (!b) notFound();

  const row = (k: string, v: React.ReactNode) => (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className="m-0 min-w-0 break-words text-ink">{v}</dd>
    </>
  );
  const active = b.view === "confirmed" || b.view === "pending";
  const hold = b.hold_expires_at ? taipeiParts(b.hold_expires_at) : null;

  return (
    <Shell eyebrow="MEMBER" title="預約詳情" who={me.name ? `${me.name}・${me.email}` : me.email} nav={CUSTOMER_NAV} active="/account">
      <Link href="/account" className="inline-flex min-h-[44px] items-center self-start text-[14px] tracking-[.08em] text-muted hover:text-rose-deep">
        ← 回到我的預約
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 min-w-0 font-serif text-[22px] font-normal tracking-[.06em] text-ink">{b.set_name}</h2>
        <StatusBadge view={b.view} />
      </header>

      {b.view === "pending" && (
        <Notice>
          這筆預約尚未完成付款{hold ? `，時段保留到 ${hold.date} ${hold.time}` : ""}
          。請依付款頁或通知信的指示完成付款；逾時未付款，時段會自動釋出。
        </Notice>
      )}

      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 border border-line bg-white p-5 text-[15px] leading-[1.7]">
        {row("日期時間", whenLabel(b.starts_at, b.ends_at))}
        {row("體驗", b.set_slug ? <Link href={`/farewell/${b.set_slug}`} className="underline underline-offset-4 hover:text-rose-deep">{b.set_name}</Link> : b.set_name)}
        {row("狀態", STATUS_LABEL[b.view])}
        {row("金額", money(b.amount))}
        {row("付款", `${paymentLabel(b.payment_status, b.view)}（${b.pay_method === "atm" ? "ATM 轉帳" : "信用卡"}）`)}
        {row("訂單編號", <span className="tracking-[.06em]">{b.order_no}</span>)}
        {row("預約人", b.customer_name)}
      </dl>

      {b.vendor_name && (
        <section aria-labelledby="vendor-h" className="flex flex-col gap-2 border border-line bg-white p-5 text-[15px] leading-[1.7]">
          <h3 id="vendor-h" className="m-0 text-[14px] tracking-[.1em] text-muted">
            服務供應商
          </h3>
          <span className="text-ink">{b.vendor_name}</span>
          {b.vendor_phone && (
            <a href={`tel:${b.vendor_phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-[44px] items-center self-start text-ink underline underline-offset-4 hover:text-rose-deep">
              {b.vendor_phone}
            </a>
          )}
          {b.vendor_email && (
            <a href={`mailto:${b.vendor_email}`} className="inline-flex min-h-[44px] items-center self-start break-all text-ink underline underline-offset-4 hover:text-rose-deep">
              {b.vendor_email}
            </a>
          )}
          <span className="text-[14px] text-muted">供應商會在體驗前與妳聯繫地點與細節。</span>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {active && (
          <a href={`/account/bookings/${b.id}/ics`} className={ghostBtn} download>
            加入行事曆（.ics）
          </a>
        )}
      </div>

      <section aria-labelledby="help-h" className="flex flex-col gap-2 border-t border-line pt-4 text-[15px] leading-[1.8] text-body">
        <h3 id="help-h" className="m-0 text-[15px] font-normal text-ink">
          如需更改或取消，請聯繫我們
        </h3>
        <div className="flex flex-wrap gap-x-5">
          {LINE_URL && (
            <a href={LINE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-ink underline underline-offset-4 hover:text-rose-deep">
              LINE 私訊
            </a>
          )}
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`預約 ${b.order_no}`)}`} className="inline-flex min-h-[44px] items-center break-all text-ink underline underline-offset-4 hover:text-rose-deep">
              {CONTACT_EMAIL}
            </a>
          )}
        </div>
        {!LINE_URL && !CONTACT_EMAIL && <span>請直接回覆預約確認信，並附上訂單編號 {b.order_no}。</span>}
      </section>
    </Shell>
  );
}

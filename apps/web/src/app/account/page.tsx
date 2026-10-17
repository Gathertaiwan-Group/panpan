import type { Metadata } from "next";
import Link from "next/link";
import { MyBookingCard } from "@/components/account/BookingCard";
import { Shell } from "@/components/backoffice/Shell";
import { Notice, primaryBtn } from "@/components/booking/ui";
import { claimMyBookings, listMyBookings } from "@/lib/account/bookings";
import { splitBookings, type MyBooking } from "@/lib/account/view";
import { requireViewer } from "@/lib/auth/staff";
import { CUSTOMER_NAV } from "./nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "我的預約", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ denied?: string; welcome?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const me = await requireViewer("/account");
  const sp = await searchParams;
  // 登入後才用同一個 Email 下的訪客預約也要出現（冪等；只認領已驗證 Email 的）
  await claimMyBookings();
  let rows: MyBooking[] = [];
  let failed = false;
  try {
    rows = await listMyBookings();
  } catch (err) {
    console.error("[account] 讀取預約失敗:", err);
    failed = true;
  }
  const { upcoming, history } = splitBookings(rows);
  const backoffice = me.role === "admin" ? "/admin" : me.role === "vendor" ? "/vendor" : null;

  return (
    <Shell eyebrow="MEMBER" title="我的預約" who={me.name ? `${me.name}・${me.email}` : me.email} nav={CUSTOMER_NAV} active="/account">
      {sp.denied && (
        <div role="alert">
          <Notice tone="warn">這個帳號沒有後台權限。如需開通，請聯繫朵朵曉語管理員。</Notice>
        </div>
      )}
      {backoffice && (
        <Link href={backoffice} className="self-start text-[15px] text-body underline underline-offset-4 hover:text-rose-deep">
          前往後台 →
        </Link>
      )}
      {failed && (
        <div role="alert">
          <Notice tone="warn">暫時無法讀取預約，請稍後重新整理。</Notice>
        </div>
      )}

      <section aria-labelledby="upcoming-h" className="flex flex-col gap-3">
        <h2 id="upcoming-h" className="m-0 font-serif text-[20px] font-normal tracking-[.08em] text-ink">
          即將到來
        </h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border border-dashed border-line-2 bg-white p-5">
            <p className="m-0 text-[15px] leading-[1.9] text-body">目前沒有即將到來的預約。</p>
            <Link href="/farewell" className={primaryBtn}>
              探索體驗
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 dt:grid-cols-2">
            {upcoming.map((b) => (
              <MyBookingCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="history-h" className="flex flex-col gap-3">
        <h2 id="history-h" className="m-0 font-serif text-[20px] font-normal tracking-[.08em] text-ink">
          消費紀錄
        </h2>
        {history.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">還沒有歷史紀錄。</p>
        ) : (
          <div className="grid gap-3 dt:grid-cols-2">
            {history.map((b) => (
              <MyBookingCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>

      <p className="m-0 text-[14px] leading-[1.8] text-muted">
        找不到之前的預約？會員專區只會顯示「預約時填寫的 Email 與會員 Email 相同」的預約。
      </p>
    </Shell>
  );
}

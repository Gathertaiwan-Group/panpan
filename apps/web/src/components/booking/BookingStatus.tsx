"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicBooking } from "@/lib/booking/status";
import { Notice, ghostBtn, money, primaryBtn } from "./ui";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function fmt(iso: string, withDate = true): string {
  // 一律以台北時間顯示（不依賴瀏覽器時區）
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  if (!withDate) return hm;
  return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）${hm}`;
}

const TITLE: Record<PublicBooking["status"], string> = {
  pending: "等待付款",
  confirmed: "預約已確認",
  expired: "保留時間已過",
  cancelled: "預約已取消",
  refunded: "預約已退款",
};

const POLL_MS = 4000;
const POLL_LIMIT_MS = 3 * 60_000;

export function BookingStatus({ initial, token }: { initial: PublicBooking; token: string }) {
  const [b, setB] = useState(initial);
  const [polling, setPolling] = useState(initial.status === "pending");

  useEffect(() => {
    if (!polling) return;
    const started = Date.now();
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        const res = await fetch(`/api/booking/status?o=${encodeURIComponent(b.orderNo)}&t=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const next = (await res.json()) as PublicBooking;
          setB(next);
          if (next.status !== "pending") {
            setPolling(false);
            return;
          }
        }
      } catch {
        /* 下一輪再試 */
      }
      if (Date.now() - started > POLL_LIMIT_MS) {
        setPolling(false);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [polling, b.orderNo, token]);

  const payHref = `/api/pay/redirect?o=${encodeURIComponent(b.orderNo)}&t=${encodeURIComponent(token)}`;

  return (
    <>
      <header className="flex flex-col gap-3" aria-live="polite">
        <span className="font-en text-[14px] tracking-[.26em] text-gold">BOOKING · {b.orderNo}</span>
        <h1 className="m-0 font-serif text-[clamp(26px,3.4vw,36px)] font-medium tracking-[.1em] text-ink">{TITLE[b.status]}</h1>
        {b.status === "confirmed" && (
          <p className="m-0 font-serif text-[17px] leading-[1.9] text-rose-deep">
            謝謝妳，把這段時間留給自己。確認信已寄到妳的 Email，供應商會在體驗前與妳聯繫地點與細節。
          </p>
        )}
      </header>

      {b.status === "pending" && b.payMethod === "card" && (
        <Notice>
          {polling ? "正在確認付款結果…（付款完成後這個頁面會自動更新）" : "尚未收到付款結果。"}
          {b.holdExpiresAt && <> 時段保留到 {fmt(b.holdExpiresAt, false)}。</>}
        </Notice>
      )}
      {b.status === "pending" && b.payMethod === "atm" && (
        <Notice>
          {b.atm?.account ? (
            <>
              請轉帳 <strong className="text-ink">{money(b.amount)}</strong> 至
              <br />
              銀行代碼 <strong className="text-ink">{b.atm.bankCode ?? "—"}</strong>　帳號{" "}
              <strong className="break-all text-ink">{b.atm.account}</strong>
              <br />
              繳費期限 {b.atm.expireAt ? fmt(b.atm.expireAt) : b.holdExpiresAt ? fmt(b.holdExpiresAt) : "—"}，轉帳完成後會寄確認信給妳。
            </>
          ) : (
            <>
              尚未取得轉帳帳號。請點「前往付款」完成 ATM 取號
              {b.holdExpiresAt && <>，並於 {fmt(b.holdExpiresAt)} 前完成轉帳</>}。
            </>
          )}
        </Notice>
      )}
      {b.status === "expired" && (
        <Notice tone="warn">
          這筆預約的保留時間已過，時段已釋出。如果妳已經完成付款，請不用擔心，我們會盡快與妳聯繫；也可以重新預約。
        </Notice>
      )}
      {(b.status === "cancelled" || b.status === "refunded") && (
        <Notice>如有任何疑問，歡迎私訊與我們聯繫。</Notice>
      )}

      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 border border-line bg-white p-5 text-[15px] leading-[1.7]">
        <dt className="text-muted">體驗</dt>
        <dd className="m-0 text-ink">{b.setName}</dd>
        <dt className="text-muted">日期時間</dt>
        <dd className="m-0 text-ink">
          {fmt(b.startsAt)}–{fmt(b.endsAt, false)}
        </dd>
        <dt className="text-muted">預約人</dt>
        <dd className="m-0 break-all text-ink">{b.customerName}</dd>
        <dt className="text-muted">金額</dt>
        <dd className="m-0 text-ink">
          {money(b.amount)}
          {b.status === "confirmed" && "（已付清）"}
        </dd>
        <dt className="text-muted">付款方式</dt>
        <dd className="m-0 text-ink">{b.payMethod === "atm" ? "ATM 轉帳" : "信用卡"}</dd>
      </dl>

      <div className="flex flex-wrap gap-3">
        {b.status === "pending" && b.canPay && (
          <a href={payHref} className={primaryBtn}>
            前往付款
          </a>
        )}
        {b.status === "pending" && !polling && (
          <button type="button" className={ghostBtn} onClick={() => setPolling(true)}>
            重新確認付款狀態
          </button>
        )}
        {b.status === "expired" && (
          <Link href="/farewell" className={primaryBtn}>
            重新預約
          </Link>
        )}
        <Link href="/" className={ghostBtn}>
          回到首頁
        </Link>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-5 text-[15px] leading-[1.8] text-body">
        <Link
          href={`/account/bookings/${b.id}`}
          className="inline-flex min-h-[44px] items-center self-start text-ink underline underline-offset-4 hover:text-rose-deep"
        >
          查看我的預約 →
        </Link>
        <span className="text-[14px] text-muted">
          還沒有會員帳號？用預約時填寫的同一個 Email <Link href="/register" className="underline underline-offset-4 hover:text-rose-deep">註冊</Link>
          ，就能在會員專區隨時查看這筆預約與消費紀錄。
        </span>
      </div>
    </>
  );
}

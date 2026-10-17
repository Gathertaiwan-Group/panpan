import "server-only";
import { adminDb } from "../server/admin-db";
import { ensureBookingEmails } from "./emails";
import { reconcile } from "./gateway";
import { getBookingByOrderNo, getPaymentForBooking, type BookingRecord } from "./repo";
import { publicStatus, type PublicStatus } from "./public-status";
import { ORDER_NO_RE, safeEqual } from "./tokens";

export { publicStatus, type PublicStatus };


export interface PublicBooking {
  orderNo: string;
  status: PublicStatus;
  setName: string;
  startsAt: string;
  endsAt: string;
  amount: number;
  payMethod: "card" | "atm";
  customerName: string;
  holdExpiresAt: string | null;
  canPay: boolean;
  atm: { bankCode: string | null; account: string | null; expireAt: string | null } | null;
}

/** 驗證 orderNo + token；錯誤一律回 null（不透露訂單是否存在） */
export async function loadBookingWithToken(orderNo: string, token: string): Promise<BookingRecord | null> {
  if (!ORDER_NO_RE.test(orderNo) || !token || token.length > 100) return null;
  const b = await getBookingByOrderNo(orderNo);
  if (!b || !safeEqual(b.access_token, token)) return null;
  return b;
}

/**
 * 給付款結果頁：必要時向閘道回查（notify 尚未到、或本機開發收不到 notify 時仍能確認）。
 * 回查有節流：同一筆付款 8 秒內只查一次。
 */
export async function getPublicBooking(orderNo: string, token: string, opts: { refresh: boolean }): Promise<PublicBooking | null> {
  let b = await loadBookingWithToken(orderNo, token);
  if (!b) return null;
  let pay = await getPaymentForBooking(b.id);

  if (opts.refresh && pay && pay.status === "init" && (b.status === "pending_payment" || b.status === "expired")) {
    const cutoff = new Date(Date.now() - 8000).toISOString();
    const { data: claimed } = await adminDb()
      .from("payments")
      .update({ checked_at: new Date().toISOString() })
      .eq("id", pay.id)
      .or(`checked_at.is.null,checked_at.lt.${cutoff}`)
      .select("id");
    if (claimed && claimed.length === 1) {
      await reconcile(pay.gateway_order_id, null);
      b = (await getBookingByOrderNo(orderNo)) ?? b;
      pay = await getPaymentForBooking(b.id);
    }
  }

  // 已確認但有信還沒寄出（例如當時 Resend 失敗）→ 補寄（冪等）
  if (
    opts.refresh &&
    b.status === "confirmed" &&
    (!b.customer_email_sent_at || !b.vendor_email_sent_at || !b.admin_email_sent_at)
  ) {
    await ensureBookingEmails(b.id).catch((err) => console.error("[booking] 補寄確認信失敗:", err));
  }

  const status = publicStatus(b);
  return {
    orderNo: b.order_no,
    status,
    setName: b.set_name,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    amount: b.amount,
    payMethod: b.pay_method,
    customerName: b.customer_name,
    holdExpiresAt: b.hold_expires_at,
    canPay: status === "pending" && Boolean(pay?.payment_url) && pay?.status === "init",
    atm:
      b.pay_method === "atm" && pay && (pay.atm_virtual_account || pay.atm_expire_at)
        ? { bankCode: pay.atm_bank_code, account: pay.atm_virtual_account, expireAt: pay.atm_expire_at }
        : null,
  };
}

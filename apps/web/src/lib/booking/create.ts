import "server-only";
import { SITE_URL } from "../env";
import { adminDb } from "../server/admin-db";
import { checkSlot, excludeOwnHold, holdExpiry, monthRange } from "./availability";
import { createGatewayCheckout, enabledPayTypes, pchomepayConfigured } from "./pchomepay";
import { POLICY } from "./policy";
import { getBookableSet, getSchedule } from "./repo";
import { fromTaipei } from "./time";
import { genAccessToken, genOrderNo } from "./tokens";
import { normalizeEmail, normalizeMobile, type BookingInput } from "./validation";

export type CreateResult =
  | { ok: true; orderNo: string; token: string }
  | { ok: false; status: number; code: string; message: string };

const MESSAGES: Record<string, [number, string]> = {
  not_bookable: [404, "這個體驗目前沒有開放線上預約。"],
  slot_taken: [409, "這個時段剛剛被預約了，請改選其他時段。"],
  slot_unavailable: [409, "這個時段目前無法預約，請改選其他時段。"],
  out_of_range: [409, "這個時段已超出可預約的時間範圍（需提前 24 小時、60 天內）。"],
  atm_not_allowed: [400, "ATM 轉帳只適用於 72 小時之後的時段，請改用信用卡付款。"],
  pay_method_disabled: [400, "目前不提供這個付款方式。"],
  rate_limited: [429, "送出次數過多，請稍候一小時再試，或透過私訊與我們聯繫。"],
  atm_rate_limited: [429, "今天的 ATM 轉帳預約次數已達上限，請改用信用卡付款，或透過私訊與我們聯繫。"],
  too_many_pending: [429, "妳已有尚未完成付款的預約，請先完成付款或等保留時間結束後再試。"],
  invalid_input: [400, "資料格式不正確，請檢查後再試一次。"],
  payment_unavailable: [503, "線上付款暫時無法使用，請稍後再試，或透過私訊與我們聯繫。"],
  gateway_failed: [502, "建立付款失敗，請稍後再試一次。這個時段已為妳釋出。"],
  server_error: [500, "系統忙碌中，請稍後再試一次。"],
};

function fail(code: string): CreateResult {
  const [status, message] = MESSAGES[code] ?? MESSAGES.server_error;
  return { ok: false, status, code, message };
}

export async function createBooking(
  input: BookingInput,
  opts: { ipHash: string; userId?: string | null },
  now = new Date(),
): Promise<CreateResult> {
  if (!pchomepayConfigured()) return fail("payment_unavailable");
  const set = await getBookableSet(input.slug);
  if (!set) return fail("not_bookable");

  const payType = input.payMethod === "atm" ? "ATM" : "CARD";
  if (!enabledPayTypes().includes(payType)) return fail("pay_method_disabled");

  // 伺服器端重算一次可約性（DB 的 create_booking 還會再擋一次）
  const range = monthRange(input.date.slice(0, 7));
  let schedule;
  try {
    schedule = await getSchedule(set.vendorId, range.from, range.to, now, set.durationMinutes);
  } catch (err) {
    console.error("[booking] 讀取排班失敗:", err);
    return fail("server_error");
  }
  const startsAt = fromTaipei(input.date, input.time);
  // 客人自己同時段的未付款舊保留不算佔用（RPC 會取代它）
  const own = excludeOwnHold(schedule, startsAt, normalizeEmail(input.email), normalizeMobile(input.phone));
  const slot = checkSlot(input.date, input.time, own);
  if (!slot.ok) return fail("slot_unavailable");
  if (input.payMethod === "atm" && !slot.atm) return fail("atm_not_allowed");

  const hold = holdExpiry(input.payMethod, now);
  const db = adminDb();

  // IP 限流（DB 原子檢查＋寫入）：每 IP 每小時 5 次建單、每日 2 次 ATM 保留
  const { data: rate, error: rateErr } = await db.rpc("check_booking_rate", {
    p_ip_hash: opts.ipHash,
    p_pay_method: input.payMethod,
  });
  if (rateErr) {
    console.error("[booking] check_booking_rate 失敗:", rateErr.message);
    return fail("server_error");
  }
  const rateResult = (rate as { result: string }).result;
  if (rateResult !== "ok") return fail(rateResult === "invalid_input" ? "server_error" : rateResult);

  let orderNo = "";
  let token = "";
  let bookingId = "";
  let amount = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    orderNo = genOrderNo(now);
    token = genAccessToken();
    const { data, error } = await db.rpc("create_booking", {
      p_order_no: orderNo,
      p_access_token: token,
      p_set_id: set.id,
      p_starts_at: startsAt.toISOString(),
      p_pay_method: input.payMethod,
      p_hold_expires_at: hold.toISOString(),
      p_customer_name: input.name,
      p_phone: input.phone,
      p_email: input.email,
      p_note: input.note,
      p_max_pending: POLICY.maxPendingPerCustomer,
      p_user_id: opts.userId ?? null,
    });
    if (error) {
      console.error("[booking] create_booking 失敗:", error.message);
      return fail("server_error");
    }
    const r = data as { result: string; id?: string; amount?: number };
    if (r.result === "order_no_taken") continue;
    if (r.result !== "created" || !r.id) return fail(r.result);
    bookingId = r.id;
    amount = Number(r.amount);
    break;
  }
  if (!bookingId) return fail("server_error");

  const releaseHold = async () => {
    await db
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), admin_note: "建立付款失敗，自動釋出" })
      .eq("id", bookingId)
      .eq("status", "pending_payment");
  };

  const { error: payErr } = await db
    .from("payments")
    .insert({ booking_id: bookingId, gateway_order_id: orderNo, amount, pay_type: payType });
  if (payErr) {
    console.error("[booking] 建立付款紀錄失敗:", payErr.message);
    await releaseHold();
    return fail("server_error");
  }

  const statusPath = `/booking/${orderNo}?t=${encodeURIComponent(token)}`;
  const checkout = await createGatewayCheckout({
    orderId: orderNo,
    amount,
    payType,
    itemName: `朵朵曉語｜${set.name}`,
    itemUrl: `${SITE_URL}/farewell/${set.slug}`,
    returnUrl: `${SITE_URL}${statusPath}`,
    notifyUrl: `${SITE_URL}/api/pay/pchomepay/notify`,
    buyerEmail: input.email,
    atmExpireDays: POLICY.atmExpireDays,
  });
  if (!checkout) {
    await db.from("payments").update({ status: "failed" }).eq("gateway_order_id", orderNo).eq("status", "init");
    await releaseHold();
    return fail("gateway_failed");
  }
  await db.from("payments").update({ payment_url: checkout.paymentUrl }).eq("gateway_order_id", orderNo);
  return { ok: true, orderNo, token };
}

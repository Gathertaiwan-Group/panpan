// 付款狀態對帳（notify 與付款結果頁輪詢共用）。純邏輯＋注入依賴，方便單元測試。
// 原則：
//   - notify 無簽章 → 不信 payload，只拿 order_id，一律回查閘道為準
//   - 回查失敗／DB 失敗 → http 500（PChomePay 會重送）
//   - 已付（status === "S" 或 status_code ∈ S/00/1）→ mark_booking_paid（DB 內比對金額、條件式轉換、冪等）
//   - 只有這一次真的轉成 confirmed（transitioned）或之後補寄時，才呼叫 ensureEmails（其本身也冪等）

export const PAID_CODES = new Set(["S", "00", "1"]);

// PChomePay 查單（GET /v1/payment/{order_id}）的權威付款狀態在 `status` 欄位：
// "S" 成功、"F" 失敗、"P" 處理中；成功時 status_code 常為 null（僅特定失敗情境有值）。
// 舊版只認 status_code，真實付款成功仍被當成未付。
// 依據：Realreal/apps/api/src/lib/pchomepay.ts 註解與 Realreal/apps/api/src/routes/webhooks/pchomepay.ts
//（2026-07-12 事件：4 筆真實訂單因只認 status_code 卡在 pending）。
// 已付：status === "S"，或（相容舊行為）status_code ∈ {S,00,1}；失敗：任一為 "F"；其餘視為處理中。
export function classifyGatewayStatus(q: { status?: string; status_code?: string }): "paid" | "failed" | "pending" {
  const status = String(q.status ?? "").trim().toUpperCase();
  const code = String(q.status_code ?? "").trim().toUpperCase();
  if (status === "S" || PAID_CODES.has(code)) return "paid";
  if (status === "F" || code === "F") return "failed";
  return "pending";
}

export interface GatewayResult {
  status?: string;
  status_code?: string;
  pay_type?: string;
  amount?: number;
  payment_info?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

export interface MarkPaidResult {
  result: string;
  transitioned: boolean;
  attention_new: boolean;
  reason?: string;
  booking_id?: string;
  booking_status?: string;
}

export interface ReconcileDeps {
  findPayment(orderId: string): Promise<{ status: string; amount: number; bookingId: string } | null>;
  query(orderId: string): Promise<GatewayResult | null>;
  markPaid(orderId: string, amount: number, payType: string | null, raw: Record<string, unknown>): Promise<MarkPaidResult | null>;
  recordAtm(
    orderId: string,
    info: { bankCode: string; account: string; expireAt: Date | null },
    raw: Record<string, unknown>,
  ): Promise<void>;
  markFailed(orderId: string, raw: Record<string, unknown>): Promise<void>;
  ensureEmails(bookingId: string): Promise<void>;
  alertAttention(bookingId: string, reason: string): Promise<void>;
}

export type ReconcileOutcome =
  | "unknown_order"
  | "query_failed"
  | "amount_missing"
  | "db_failed"
  | "confirmed"
  | "already_paid"
  | "amount_mismatch"
  | "needs_attention"
  | "atm_issued"
  | "failed"
  | "pending";

export interface ReconcileResult {
  http: 200 | 500;
  outcome: ReconcileOutcome;
}

function pickString(obj: Record<string, unknown> | undefined, keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && (typeof v === "string" || typeof v === "number")) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

/** PChomePay 日期（"2026/10/20 23:59:59"、"2026-10-20"、"20261020235959" …；台北時間）→ Date */
export function parseGatewayDate(s: string): Date | null {
  const t = s.trim();
  let m = /^(\d{4})[/-](\d{2})[/-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (!m) m = /^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})?)?$/.exec(t);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const time = h === undefined ? "23:59:59" : `${h}:${mi}:${se ?? "00"}`;
  const out = new Date(`${y}-${mo}-${d}T${time}+08:00`);
  return Number.isNaN(out.getTime()) ? null : out;
}

export async function reconcileOrder(
  orderId: string,
  notifyType: string | null,
  deps: ReconcileDeps,
): Promise<ReconcileResult> {
  const payment = await deps.findPayment(orderId);
  if (!payment) return { http: 200, outcome: "unknown_order" };

  const q = await deps.query(orderId);
  if (!q) return { http: 500, outcome: "query_failed" };
  const raw: Record<string, unknown> = { notify_type: notifyType, query: q.raw ?? q };

  const gatewayState = classifyGatewayStatus(q);
  if (gatewayState === "paid") {
    if (q.amount == null || !Number.isFinite(Number(q.amount))) return { http: 500, outcome: "amount_missing" };
    const r = await deps.markPaid(orderId, Math.round(Number(q.amount)), q.pay_type ?? null, raw);
    if (!r) return { http: 500, outcome: "db_failed" };
    const bookingId = r.booking_id ?? payment.bookingId;
    if (r.attention_new && r.reason) await deps.alertAttention(bookingId, r.reason);
    if (r.result === "not_found") return { http: 200, outcome: "unknown_order" };
    if (r.result === "amount_mismatch") return { http: 200, outcome: "amount_mismatch" };
    // 轉成 confirmed 的這次寄信；重複 notify（already_paid）也呼叫一次補寄（冪等，已寄過就不會再寄）
    if (r.booking_status === "confirmed" && (r.transitioned || r.result === "already_paid")) {
      await deps.ensureEmails(bookingId);
    }
    if (r.result === "confirmed") return { http: 200, outcome: "confirmed" };
    if (r.result === "already_paid") return { http: 200, outcome: "already_paid" };
    return { http: 200, outcome: "needs_attention" };
  }

  if (payment.status === "paid") return { http: 200, outcome: "already_paid" };

  // 失敗只依伺服器回查的狀態判斷（notify_type 未簽章，任何人都能偽造）
  if (gatewayState === "failed") {
    await deps.markFailed(orderId, raw);
    return { http: 200, outcome: "failed" };
  }

  const account = pickString(q.payment_info, ["virtual_account", "virt_account", "v_account", "atm_virt_account", "account"]);
  if (account) {
    const bankCode = pickString(q.payment_info, ["bank_code", "atm_bank_code", "bank_id", "bank"]);
    const expire = pickString(q.payment_info, ["expire_date", "expired_date", "pay_expire_date", "expire_time", "expired_at"]);
    await deps.recordAtm(orderId, { bankCode, account, expireAt: expire ? parseGatewayDate(expire) : null }, raw);
    return { http: 200, outcome: "atm_issued" };
  }

  return { http: 200, outcome: "pending" };
}

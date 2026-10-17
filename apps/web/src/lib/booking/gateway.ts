import "server-only";
import { adminDb } from "../server/admin-db";
import { ensureBookingEmails, sendAttentionAlert } from "./emails";
import { queryGatewayPayment } from "./pchomepay";
import { reconcileOrder, type MarkPaidResult, type ReconcileDeps, type ReconcileResult } from "./reconcile";
import { getPaymentByOrderId } from "./repo";

/** 正式依賴：service role DB ＋ PChomePay 回查 ＋ Resend */
export const liveDeps: ReconcileDeps = {
  async findPayment(orderId) {
    const p = await getPaymentByOrderId(orderId);
    return p ? { status: p.status, amount: p.amount, bookingId: p.booking_id } : null;
  },
  query: queryGatewayPayment,
  async markPaid(orderId, amount, payType, raw) {
    const { data, error } = await adminDb().rpc("mark_booking_paid", {
      p_gateway_order_id: orderId,
      p_amount: amount,
      p_pay_type: payType,
      p_raw: raw,
    });
    if (error) {
      console.error("[pay] mark_booking_paid 失敗:", error.message);
      return null;
    }
    return data as MarkPaidResult;
  },
  async recordAtm(orderId, info, raw) {
    const { error } = await adminDb().rpc("record_atm_info", {
      p_gateway_order_id: orderId,
      p_bank_code: info.bankCode,
      p_virtual_account: info.account,
      p_expire_at: info.expireAt ? info.expireAt.toISOString() : null,
      p_raw: raw,
    });
    if (error) throw new Error(`record_atm_info 失敗：${error.message}`);
  },
  async markFailed(orderId) {
    const { error } = await adminDb()
      .from("payments")
      .update({ status: "failed" })
      .eq("gateway_order_id", orderId)
      .eq("status", "init");
    if (error) throw new Error(`標記付款失敗狀態失敗：${error.message}`);
  },
  async ensureEmails(bookingId) {
    try {
      await ensureBookingEmails(bookingId);
    } catch (err) {
      console.error("[pay] 寄送確認信失敗（下次輪詢／notify 會補寄）:", err);
    }
  },
  async alertAttention(bookingId, reason) {
    try {
      await sendAttentionAlert(bookingId, reason);
    } catch (err) {
      console.error("[pay] 寄送人工處理通知失敗:", err);
    }
  },
};

export async function reconcile(orderId: string, notifyType: string | null): Promise<ReconcileResult> {
  try {
    return await reconcileOrder(orderId, notifyType, liveDeps);
  } catch (err) {
    console.error("[pay] 對帳失敗:", err);
    return { http: 500, outcome: "db_failed" };
  }
}

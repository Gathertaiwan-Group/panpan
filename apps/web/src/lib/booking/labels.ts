/** 需人工處理原因（mark_booking_paid 的 reason）→ 中文說明 */
const ATTENTION_LABEL: Record<string, string> = {
  amount_mismatch: "付款金額與訂單不符",
  paid_after_start: "付款時間晚於體驗開始時間",
  paid_after_expiry_slot_taken: "保留逾時後才付款，且時段已被其他人預約（需退款）",
  paid_after_expiry_past: "保留逾時後才付款，且時間已過（需退款）",
  paid_after_cancel: "已取消的預約收到付款（需退款）",
  paid_after_refund: "已退款的預約又收到付款（需退款）",
  duplicate_payment: "同一預約重複付款（需退款）",
};

export function attentionLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return ATTENTION_LABEL[reason] ?? reason;
}


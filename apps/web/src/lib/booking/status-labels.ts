import type { PublicStatus } from "./public-status";

/** 預約狀態中文對照（會員專區、預約詳情共用；集中在這裡） */
export const STATUS_LABEL: Record<PublicStatus, string> = {
  pending: "待付款",
  confirmed: "已確認",
  cancelled: "已取消",
  refunded: "已退款",
  expired: "已逾時",
};

/** 狀態標籤樣式（只用設計 token class） */
export const STATUS_TONE: Record<PublicStatus, string> = {
  pending: "border-gold-line text-ink",
  confirmed: "border-rose text-rose-deep",
  cancelled: "border-line-2 text-muted",
  refunded: "border-line-2 text-muted",
  expired: "border-line-2 text-muted",
};

/** 付款狀態（payments.status）→ 中文 */
export function paymentLabel(status: string | null | undefined, booking: PublicStatus): string {
  if (status === "paid") return "已付款";
  if (booking === "pending") return "尚未付款";
  if (status === "failed") return "付款未完成";
  return "未付款";
}

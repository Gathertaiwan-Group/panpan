export type PublicStatus = "pending" | "confirmed" | "expired" | "cancelled" | "refunded";

/** 對外狀態：待付款但保留已過 → 已逾時（lazy，不等 pg_cron） */
export function publicStatus(b: { status: string; hold_expires_at: string | null }, now = new Date()): PublicStatus {
  if (b.status === "pending_payment") {
    return b.hold_expires_at && new Date(b.hold_expires_at).getTime() > now.getTime() ? "pending" : "expired";
  }
  if (b.status === "confirmed" || b.status === "cancelled" || b.status === "refunded") return b.status;
  return "expired";
}


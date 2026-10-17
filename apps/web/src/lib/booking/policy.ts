import { DAY_MS, HOUR_MS, MINUTE_MS } from "./time";

/** 預約規則（與 supabase/migrations/20261017000000_booking.sql 的 create_booking 預設值一致） */
export const POLICY = {
  /** 至少提前 24 小時 */
  leadMs: 24 * HOUR_MS,
  /** 只開放未來 60 天（台北日期：今天 ～ 今天+60） */
  horizonDays: 60,
  /** 信用卡保留 15 分鐘 */
  cardHoldMs: 15 * MINUTE_MS,
  /** ATM 只開放 72 小時後的時段 */
  atmLeadMs: 72 * HOUR_MS,
  /** ATM 繳費期限（PChomePay atm_info.expire_days）；保留到期限當天 23:59:59（台北） */
  atmExpireDays: 2,
  /** 同一人（Email 或電話）同時最多幾筆未付款保留 */
  maxPendingPerCustomer: 2,
  /** PChomePay 最低金額 */
  minAmount: 30,
} as const;

export const HORIZON_MS = (POLICY.horizonDays + 1) * DAY_MS;

export type PayMethod = "card" | "atm";

import { publicStatus, type PublicStatus } from "../booking/public-status";

/** my_bookings() 回傳的一列（客人看得到的欄位） */
export interface MyBookingRow {
  id: string;
  order_no: string;
  set_id: string;
  set_name: string;
  set_slug: string | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  hold_expires_at: string | null;
  pay_method: "card" | "atm";
  amount: number;
  customer_name: string;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string;
}

export type MyBooking = MyBookingRow & { view: PublicStatus };

export function withView(rows: MyBookingRow[], now = new Date()): MyBooking[] {
  return rows.map((r) => ({ ...r, view: publicStatus(r, now) }));
}

/** 即將到來＝待付款／已確認且尚未結束（由近到遠）；其餘為歷史紀錄（由新到舊） */
export function splitBookings(rows: MyBooking[], now = new Date()): { upcoming: MyBooking[]; history: MyBooking[] } {
  const t = now.getTime();
  const upcoming: MyBooking[] = [];
  const history: MyBooking[] = [];
  for (const r of rows) {
    if ((r.view === "pending" || r.view === "confirmed") && new Date(r.ends_at).getTime() > t) upcoming.push(r);
    else history.push(r);
  }
  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  history.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, history };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

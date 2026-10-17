import "server-only";
import { adminDb, serviceRoleConfigured } from "../server/admin-db";
import { POLICY } from "./policy";
import type { BusyBooking, DateOverride, ScheduleInput, WeeklySlot } from "./availability";
import { normalizeTime } from "./time";

export interface BookableSet {
  id: string;
  slug: string;
  code: string;
  name: string;
  price: number;
  durationMinutes: number;
  vendorId: string;
}

type SetRow = {
  id: string;
  slug: string;
  code: string;
  name: string;
  status: string;
  price_twd: number | null;
  duration_minutes: number | null;
  booking_enabled: boolean;
  vendor_id: string | null;
  vendors: { active: boolean } | null;
};

export function toBookable(r: SetRow | null): BookableSet | null {
  if (!r) return null;
  if (r.status !== "published" || !r.booking_enabled || !r.vendor_id || !r.vendors?.active) return null;
  if (!r.price_twd || r.price_twd < POLICY.minAmount || !r.duration_minutes || r.duration_minutes <= 0) return null;
  return {
    id: r.id,
    slug: r.slug,
    code: r.code,
    name: r.name,
    price: r.price_twd,
    durationMinutes: r.duration_minutes,
    vendorId: r.vendor_id,
  };
}

const SET_SELECT = "id,slug,code,name,status,price_twd,duration_minutes,booking_enabled,vendor_id,vendors(active)";

/** 可線上預約的 SET（有供應商且啟用、價格 ≥ 30、有時長、已開啟） */
export async function getBookableSet(slug: string): Promise<BookableSet | null> {
  if (!serviceRoleConfigured()) return null; // 未設定 service role → 整個線上預約視為未開放
  const { data, error } = await adminDb().from("experience_sets").select(SET_SELECT).eq("slug", slug).maybeSingle();
  if (error) {
    console.error("[booking] 讀取 SET 失敗:", error.message);
    return null;
  }
  return toBookable(data as unknown as SetRow | null);
}

/** 某供應商在 [from, to) 範圍的排班與占用 */
export async function getSchedule(
  vendorId: string,
  from: Date,
  to: Date,
  now: Date,
  durationMinutes: number,
): Promise<ScheduleInput> {
  const db = adminDb();
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);
  const [weekly, overrides, busy] = await Promise.all([
    db.from("vendor_weekly_slots").select("weekday,start_time").eq("vendor_id", vendorId),
    db
      .from("vendor_date_overrides")
      .select("date,closed,extra_times")
      .eq("vendor_id", vendorId)
      .gte("date", fromDate)
      .lte("date", toDate),
    db
      .from("bookings")
      .select("status,starts_at,ends_at,hold_expires_at,email_norm,phone_norm")
      .eq("vendor_id", vendorId)
      .in("status", ["pending_payment", "confirmed"])
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
  ]);
  const err = weekly.error || overrides.error || busy.error;
  if (err) throw new Error(`讀取排班失敗：${err.message}`);
  return {
    now,
    durationMinutes,
    weekly: (weekly.data ?? []).map(
      (w: { weekday: number; start_time: string }): WeeklySlot => ({ weekday: w.weekday, time: normalizeTime(w.start_time) }),
    ),
    overrides: (overrides.data ?? []).map(
      (o: { date: string; closed: boolean; extra_times: string[] | null }): DateOverride => ({
        date: o.date,
        closed: o.closed,
        extraTimes: (o.extra_times ?? []).map(normalizeTime),
      }),
    ),
    busy: (busy.data ?? []).map(
      (b: {
        status: string;
        starts_at: string;
        ends_at: string;
        hold_expires_at: string | null;
        email_norm: string;
        phone_norm: string;
      }): BusyBooking => ({
        status: b.status,
        startsAt: new Date(b.starts_at),
        endsAt: new Date(b.ends_at),
        holdExpiresAt: b.hold_expires_at ? new Date(b.hold_expires_at) : null,
        emailNorm: b.email_norm,
        phoneNorm: b.phone_norm,
      }),
    ),
  };
}

export interface BookingRecord {
  id: string;
  order_no: string;
  access_token: string;
  set_id: string;
  set_name: string;
  vendor_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  pay_method: "card" | "atm";
  amount: number;
  hold_expires_at: string | null;
  customer_name: string;
  phone: string;
  email: string;
  note: string | null;
  paid_at: string | null;
  needs_attention: boolean;
  attention_reason: string | null;
  customer_email_sent_at: string | null;
  vendor_email_sent_at: string | null;
  admin_email_sent_at: string | null;
  created_at: string;
}

export const BOOKING_SELECT =
  "id,order_no,access_token,set_id,set_name,vendor_id,starts_at,ends_at,status,pay_method,amount,hold_expires_at,customer_name,phone,email,note,paid_at,needs_attention,attention_reason,customer_email_sent_at,vendor_email_sent_at,admin_email_sent_at,created_at";

export async function getBookingByOrderNo(orderNo: string): Promise<BookingRecord | null> {
  const { data, error } = await adminDb().from("bookings").select(BOOKING_SELECT).eq("order_no", orderNo).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BookingRecord | null) ?? null;
}

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  const { data, error } = await adminDb().from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BookingRecord | null) ?? null;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  gateway_order_id: string;
  status: "init" | "paid" | "failed";
  amount: number;
  pay_type: string | null;
  payment_url: string | null;
  atm_bank_code: string | null;
  atm_virtual_account: string | null;
  atm_expire_at: string | null;
  checked_at: string | null;
}

const PAYMENT_SELECT =
  "id,booking_id,gateway_order_id,status,amount,pay_type,payment_url,atm_bank_code,atm_virtual_account,atm_expire_at,checked_at";

export async function getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
  const { data, error } = await adminDb().from("payments").select(PAYMENT_SELECT).eq("gateway_order_id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PaymentRecord | null) ?? null;
}

export async function getPaymentForBooking(bookingId: string): Promise<PaymentRecord | null> {
  const { data, error } = await adminDb()
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PaymentRecord | null) ?? null;
}

export async function getVendorContact(vendorId: string): Promise<{ name: string; contact_email: string | null } | null> {
  const { data } = await adminDb().from("vendors").select("name,contact_email").eq("id", vendorId).maybeSingle();
  return (data as { name: string; contact_email: string | null } | null) ?? null;
}

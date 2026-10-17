import { POLICY } from "./policy";
import {
  MINUTE_MS,
  addDays,
  addMonths,
  daysInMonth,
  fromTaipei,
  monthKey,
  pad2,
  parseMonth,
  taipeiDate,
  taipeiParts,
  weekdayOf,
} from "./time";

// 可預約時段計算（純函式；「現在」一律由呼叫端傳入，以台北時間換算）
//
// 每一天：
//   times  = weekly(該 weekday) ∪ overrides.extraTimes；closed 覆寫為 []
//   past   = 早於今天，或當天所有時段都早於 now + 24h
//   beyond = 晚於 今天+60 天
//   closed = 沒有任何時段（沒排班／請假）
//   full   = 有時段但全部不可約
//   open   = 至少一個可約
// 時段不可約 = 早於 now + 24h，或 [start, start+duration) 與占用中的預約重疊
//   （confirmed，或 pending_payment 且保留未逾時——逾時保留視為已釋出）

export type DayStatus = "open" | "closed" | "full" | "past" | "beyond";
export interface SlotView {
  time: string;
  available: boolean;
  /** 可用 ATM（開始時間在 72 小時後） */
  atm: boolean;
}
export interface DayView {
  status: DayStatus;
  slots: SlotView[];
}

export interface WeeklySlot {
  weekday: number;
  time: string; // HH:MM
}
export interface DateOverride {
  date: string; // YYYY-MM-DD
  closed: boolean;
  extraTimes: string[]; // HH:MM
}
export interface BusyBooking {
  status: string;
  startsAt: Date;
  endsAt: Date;
  holdExpiresAt: Date | null;
}
export interface Interval {
  start: number;
  end: number;
}

export interface ScheduleInput {
  now: Date;
  weekly: WeeklySlot[];
  overrides: DateOverride[];
  busy: BusyBooking[];
  durationMinutes: number;
}

/** 目前真的占住時段的預約（逾時但尚未被清掉的保留視為已釋出） */
export function activeIntervals(busy: BusyBooking[], now: Date): Interval[] {
  const t = now.getTime();
  return busy
    .filter(
      (b) =>
        b.status === "confirmed" ||
        (b.status === "pending_payment" && (b.holdExpiresAt === null || b.holdExpiresAt.getTime() > t)),
    )
    .map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime() }));
}

export function isSlotBusy(start: Date, intervals: Interval[], durationMinutes: number): boolean {
  const s = start.getTime();
  const e = s + durationMinutes * MINUTE_MS;
  return intervals.some((iv) => s < iv.end && iv.start < e);
}

/** 最後一個可預約的台北日期 */
export function lastBookableDate(now: Date): string {
  return addDays(taipeiDate(now), POLICY.horizonDays);
}

/** 可瀏覽的月份（與 今天～今天+60 有交集的月份） */
export function allowedMonths(now: Date): string[] {
  const first = taipeiParts(now);
  const last = lastBookableDate(now);
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const m = addMonths(first.year, first.month, i);
    const key = monthKey(m.year, m.month);
    if (`${key}-01` > last) break;
    out.push(key);
  }
  return out;
}

export function isAllowedMonth(month: string, now: Date): boolean {
  return parseMonth(month) !== null && allowedMonths(now).includes(month);
}

/** 該月查詢範圍（台北）：前後各多一天緩衝給重疊判斷 */
export function monthRange(month: string): { from: Date; to: Date; firstDate: string; lastDate: string } {
  const m = parseMonth(month);
  if (!m) throw new Error(`invalid month ${month}`);
  const next = addMonths(m.year, m.month, 1);
  const firstDate = `${monthKey(m.year, m.month)}-01`;
  const lastDate = `${monthKey(m.year, m.month)}-${pad2(daysInMonth(m.year, m.month))}`;
  return {
    from: new Date(fromTaipei(firstDate, "00:00").getTime() - 24 * 60 * MINUTE_MS),
    to: new Date(fromTaipei(`${monthKey(next.year, next.month)}-01`, "00:00").getTime() + 24 * 60 * MINUTE_MS),
    firstDate,
    lastDate,
  };
}

/** 某一天所有候選時段（HH:MM，已排序去重）；請假回 [] */
export function slotTimesFor(date: string, weekly: WeeklySlot[], overrides: DateOverride[]): string[] {
  const ov = overrides.find((o) => o.date === date);
  if (ov?.closed) return [];
  const wd = weekdayOf(date);
  const set = new Set<string>(weekly.filter((w) => w.weekday === wd).map((w) => w.time));
  for (const t of ov?.extraTimes ?? []) set.add(t);
  return [...set].sort();
}

export function computeDay(date: string, input: ScheduleInput, intervals?: Interval[]): DayView {
  const { now } = input;
  const ivs = intervals ?? activeIntervals(input.busy, now);
  const today = taipeiDate(now);
  if (date < today) return { status: "past", slots: [] };
  if (date > lastBookableDate(now)) return { status: "beyond", slots: [] };

  const times = slotTimesFor(date, input.weekly, input.overrides);
  if (times.length === 0) return { status: "closed", slots: [] };

  const threshold = now.getTime() + POLICY.leadMs;
  const atmThreshold = now.getTime() + POLICY.atmLeadMs;
  const slots: SlotView[] = times.map((time) => {
    const start = fromTaipei(date, time);
    const tooSoon = start.getTime() < threshold;
    return {
      time,
      available: !tooSoon && !isSlotBusy(start, ivs, input.durationMinutes),
      atm: start.getTime() >= atmThreshold,
    };
  });

  if (times.every((t) => fromTaipei(date, t).getTime() < threshold)) return { status: "past", slots: [] };
  if (slots.some((s) => s.available)) return { status: "open", slots };
  return { status: "full", slots };
}

export function computeMonth(month: string, input: ScheduleInput): Record<string, DayView> {
  const m = parseMonth(month);
  if (!m) throw new Error(`invalid month ${month}`);
  const ivs = activeIntervals(input.busy, input.now);
  const days: Record<string, DayView> = {};
  const n = daysInMonth(m.year, m.month);
  for (let d = 1; d <= n; d++) {
    const date = `${monthKey(m.year, m.month)}-${pad2(d)}`;
    days[date] = computeDay(date, input, ivs);
  }
  return days;
}

/** 單一時段是否可約（建單前伺服器端檢查用） */
export function checkSlot(
  date: string,
  time: string,
  input: ScheduleInput,
): { ok: true; atm: boolean } | { ok: false } {
  const day = computeDay(date, input);
  const slot = day.slots.find((s) => s.time === time);
  if (!slot || !slot.available) return { ok: false };
  return { ok: true, atm: slot.atm };
}

/** 付款方式對應的保留期限 */
export function holdExpiry(method: "card" | "atm", now: Date): Date {
  if (method === "card") return new Date(now.getTime() + POLICY.cardHoldMs);
  return new Date(`${addDays(taipeiDate(now), POLICY.atmExpireDays)}T23:59:59+08:00`);
}

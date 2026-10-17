// 台北時間工具。台灣沒有日光節約，固定 UTC+8。
// 全部以 epoch 毫秒 + 固定位移計算，不依賴執行環境的 TZ（Vercel 為 UTC）。

const OFFSET_MS = 8 * 60 * 60 * 1000;
export const TAIPEI_OFFSET = "+08:00";
export const TIMEZONE = "Asia/Taipei";

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export interface TaipeiParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0=日
}

export function taipeiParts(d: Date): TaipeiParts {
  const t = new Date(d.getTime() + OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    second: t.getUTCSeconds(),
    weekday: t.getUTCDay(),
  };
}

/** YYYY-MM-DD（台北日期） */
export function taipeiDate(d: Date): string {
  const p = taipeiParts(d);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** HH:MM（台北時間） */
export function taipeiTime(d: Date): string {
  const p = taipeiParts(d);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** YYYY-MM（台北月份） */
export function taipeiMonth(d: Date): string {
  const p = taipeiParts(d);
  return `${p.year}-${pad2(p.month)}`;
}

/** 台北日期 + 時間 → 絕對時間 */
export function fromTaipei(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${TAIPEI_OFFSET}`);
}

/** 台北某日 23:59:59 */
export function endOfTaipeiDay(date: string): Date {
  return new Date(`${date}T23:59:59${TAIPEI_OFFSET}`);
}

export function isValidDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

export function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

export function parseMonth(s: string): { year: number; month: number } | null {
  const m = MONTH_RE.exec(s);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 日期字串的星期（曆法上的星期，與時區無關） */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 日期字串 + n 天 */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

export function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + n;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];

/** 2026/10/07（三）19:00 */
export function formatTaipeiDisplay(d: Date): string {
  const p = taipeiParts(d);
  return `${p.year}/${pad2(p.month)}/${pad2(p.day)}（${WEEKDAY_ZH[p.weekday]}）${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** 10/07（三） */
export function formatDateShort(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}（${WEEKDAY_ZH[weekdayOf(date)]}）`;
}

/** 資料庫回傳的 time（"19:00:00"）→ "19:00" */
export function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

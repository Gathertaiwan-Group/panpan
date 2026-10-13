"use server";

import { z } from "zod";
import { content } from "@duoduo/content";
import { writeClient } from "@/lib/supabase";

export type FormState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> } | null;

const NOT_READY = "線上表單目前尚未開放，請稍後再試，或透過私訊與我們聯繫。";
const FAILED = "送出時發生問題，請稍後再試一次。";

const fieldOptions = content.partnerFormFields.find((f) => f.name === "field")?.options ?? [];

const str = (max: number, msg: string) => z.string().trim().min(1, msg).max(max, "內容過長");
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "內容過長")
    .optional()
    .transform((v) => (v ? v : null));

const partnerSchema = z.object({
  brand_name: str(120, "請填寫品牌／店家名稱"),
  field: z.enum(fieldOptions as [string, ...string[]], { message: "請選擇專業領域" }),
  contact: str(200, "請填寫聯絡方式"),
  message: optStr(2000),
});

const bookingSchema = z.object({
  set_slug: str(80, "缺少體驗項目"),
  name: str(80, "請填寫稱呼"),
  contact: str(200, "請填寫聯絡方式"),
  preferred_date: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "日期格式不正確"),
  message: optStr(2000),
});

const storySchema = z.object({
  name: optStr(80),
  contact: str(200, "請填寫聯絡方式"),
  story: str(5000, "請寫下想分享的故事"),
  wants_anonymous: z.boolean(),
  consent_given: z.literal(true, { message: "請勾選同意條款" }),
});

function formToObject(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") obj[k] = v;
  });
  return obj;
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** honeypot：機器人常會填所有欄位；有填就假裝成功、不寫入 */
function isBot(fd: FormData) {
  return String(fd.get("website") ?? "").trim() !== "";
}

async function insert(table: string, row: Record<string, unknown>): Promise<FormState> {
  const db = writeClient();
  if (!db) return { ok: false, error: NOT_READY };
  try {
    const { error } = await db.from(table).insert(row);
    if (error) {
      console.error(`[form] insert ${table} failed:`, error.message);
      return { ok: false, error: FAILED };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[form] insert ${table} threw:`, err);
    return { ok: false, error: FAILED };
  }
}

export async function submitPartner(_prev: FormState, fd: FormData): Promise<FormState> {
  if (isBot(fd)) return { ok: true };
  const parsed = partnerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "請確認必填欄位。", fieldErrors: fieldErrorsOf(parsed.error) };
  return insert("partner_applications", parsed.data);
}

export async function submitBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  if (isBot(fd)) return { ok: true };
  const parsed = bookingSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "請確認必填欄位。", fieldErrors: fieldErrorsOf(parsed.error) };
  return insert("booking_inquiries", parsed.data);
}

export async function submitStory(_prev: FormState, fd: FormData): Promise<FormState> {
  if (isBot(fd)) return { ok: true };
  const raw = formToObject(fd);
  const parsed = storySchema.safeParse({
    ...raw,
    wants_anonymous: raw.wants_anonymous === "on",
    consent_given: raw.consent_given === "on",
  });
  if (!parsed.success) return { ok: false, error: "請確認必填欄位。", fieldErrors: fieldErrorsOf(parsed.error) };
  return insert("story_submissions", parsed.data);
}

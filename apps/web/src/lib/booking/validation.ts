import { z } from "zod";
import { isValidDate, isValidTime } from "./time";

/** 手機：接受 09xx-xxx-xxx、+886 9xx… → 正規化成 09xxxxxxxx */
export function normalizeMobile(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.startsWith("886") ? `0${d.slice(3)}` : d;
}

export const bookingInput = z.object({
  slug: z.string().trim().min(1).max(80),
  date: z.string().refine(isValidDate, "日期格式不正確"),
  time: z.string().refine(isValidTime, "時間格式不正確"),
  payMethod: z.enum(["card", "atm"], { message: "請選擇付款方式" }),
  name: z.string().trim().min(1, "請填寫稱呼").max(40, "稱呼過長"),
  phone: z
    .string()
    .trim()
    .max(30, "手機號碼格式不正確")
    .refine((v) => /^09\d{8}$/.test(normalizeMobile(v)), "請填寫台灣手機號碼（09 開頭共 10 碼）"),
  email: z.string().trim().max(254, "Email 過長").email("Email 格式不正確"),
  note: z
    .string()
    .trim()
    .max(500, "備註請在 500 字以內")
    .optional()
    .transform((v) => (v ? v : null)),
  consent: z.literal(true, { message: "請閱讀並勾選同意預約須知" }),
  website: z.string().max(0).optional(), // honeypot
});

export type BookingInput = z.infer<typeof bookingInput>;

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

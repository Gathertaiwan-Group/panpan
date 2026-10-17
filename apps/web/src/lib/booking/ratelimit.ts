import { createHash } from "node:crypto";

/** 取客戶端 IP：Vercel 的 x-forwarded-for 第一段，其次 x-real-ip；都沒有回 "unknown" */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  const real = headers.get("x-real-ip")?.trim();
  return real || "unknown";
}

/** 只存 sha256 雜湊（64 碼 hex），不存原始 IP */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`panpan-booking:${ip}`).digest("hex");
}

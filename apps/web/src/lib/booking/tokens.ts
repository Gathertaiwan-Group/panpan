import { randomBytes, timingSafeEqual } from "node:crypto";
import { taipeiParts, pad2 } from "./time";

const ALPHANUM = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 去除易混淆字元

/** 訂單編號（同時當 PChomePay order_id）：DD + 台北 yyMMdd + 6 碼隨機 → 14 字元，英數 */
export function genOrderNo(now = new Date()): string {
  const p = taipeiParts(now);
  const buf = randomBytes(6);
  let rand = "";
  for (let i = 0; i < buf.length; i++) rand += ALPHANUM[buf[i] % ALPHANUM.length];
  return `DD${String(p.year).slice(2)}${pad2(p.month)}${pad2(p.day)}${rand}`;
}

/** 付款結果頁存取 token（192 bits，base64url） */
export function genAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const ORDER_NO_RE = /^DD\d{6}[A-Z0-9]{6}$/;

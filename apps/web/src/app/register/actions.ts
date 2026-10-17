"use server";

import { z } from "zod";
import { authPasswordErrorMessage, displayNameError, newPasswordError } from "@/lib/auth/password";
import { SITE_URL } from "@/lib/env";
import { userDb } from "@/lib/server/user-db";

export type RegisterState = { sent?: boolean; error?: string; field?: "email" | "name" | "password" } | null;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * 客人自行註冊：signUp 後必須點驗證信（token_hash → /auth/confirm）才能使用。
 * 回覆一律「請到信箱收信」：已註冊過的 Email 不會有任何不同訊息（不洩漏帳號存在與否）。
 */
export async function registerCustomer(_prev: RegisterState, fd: FormData): Promise<RegisterState> {
  const email = emailSchema.safeParse(fd.get("email"));
  if (!email.success) return { error: "請輸入正確的 Email。", field: "email" };
  const nameErr = displayNameError(fd.get("name"));
  if (nameErr) return { error: nameErr, field: "name" };
  const password = fd.get("password");
  const pwErr = newPasswordError(password, fd.get("confirm"));
  if (pwErr) return { error: pwErr, field: "password" };

  const db = await userDb();
  const { error } = await db.auth.signUp({
    email: email.data,
    password: password as string,
    options: {
      data: { display_name: String(fd.get("name")).trim().slice(0, 40) },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });
  if (error) {
    if (error.status === 429) return { error: "操作太頻繁，請稍候再試。" };
    if (error.code === "weak_password") return { error: authPasswordErrorMessage("weak_password"), field: "password" };
    if (error.code === "signup_disabled") return { error: "目前暫停開放註冊，請稍後再試，或私訊與我們聯繫。" };
    // user_already_exists 等：一律當作已寄出（不洩漏）
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      console.warn("[register] signUp:", error.status, error.code);
      return { error: "註冊失敗，請稍後再試。" };
    }
  }
  return { sent: true };
}

"use server";

import { z } from "zod";
import { SITE_URL } from "@/lib/env";
import { userDb } from "@/lib/server/user-db";

export type LoginState = { sent?: boolean; error?: string } | null;

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/** 寄 magic link（不開放註冊：shouldCreateUser=false）。結果一律模糊回覆，不透露帳號是否存在。 */
export async function sendLoginLink(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return { error: "請輸入正確的 Email。" };
  const db = await userDb();
  const { error } = await db.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/auth/confirm` },
  });
  if (error) {
    // 429（寄太頻繁）要讓使用者知道；其他（含帳號不存在）一律視為已寄出
    if (error.status === 429) return { error: "寄送太頻繁，請稍候一分鐘再試。" };
    console.warn("[login] signInWithOtp:", error.status, error.code);
  }
  return { sent: true };
}

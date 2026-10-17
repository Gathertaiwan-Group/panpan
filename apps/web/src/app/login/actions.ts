"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { postLoginTarget } from "@/lib/auth/password";
import { getStaff } from "@/lib/auth/staff";
import { SITE_URL } from "@/lib/env";
import { userDb } from "@/lib/server/user-db";

export type LoginState = { sent?: boolean; error?: string } | null;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** 登入失敗一律同一句：不透露帳號是否存在、密碼是否正確、或有無後台權限 */
const LOGIN_FAILED = "Email 或密碼不正確，或此帳號沒有後台權限。";

/** Email＋密碼登入；成功後依角色導向（next 只接受站內、該角色可進的路徑） */
export async function signInWithPassword(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(fd.get("email"));
  const password = fd.get("password");
  if (!email.success || typeof password !== "string" || !password || password.length > 256) {
    return { error: LOGIN_FAILED };
  }
  const db = await userDb();
  const { error } = await db.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (error.status === 429) return { error: "嘗試次數太多，請稍候幾分鐘再試。" };
    // 只記狀態碼，不記 Email／密碼
    if (error.code !== "invalid_credentials") console.warn("[login] signInWithPassword:", error.status, error.code);
    return { error: LOGIN_FAILED };
  }
  const target = postLoginTarget(await getStaff(), fd.get("next"));
  if (!target) {
    // 沒有 staff 紀錄或已停用 → 立即登出
    await db.auth.signOut();
    return { error: LOGIN_FAILED };
  }
  redirect(target);
}

/** 備援：寄 magic link（不開放註冊：shouldCreateUser=false）。結果一律模糊回覆，不透露帳號是否存在。 */
export async function sendLoginLink(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { error: "請輸入正確的 Email。" };
  const db = await userDb();
  const { error } = await db.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/auth/confirm` },
  });
  if (error) {
    // 429（寄太頻繁）要讓使用者知道；其他（含帳號不存在）一律視為已寄出
    if (error.status === 429) return { error: "寄送太頻繁，請稍候一分鐘再試。" };
    console.warn("[login] signInWithOtp:", error.status, error.code);
  }
  return { sent: true };
}

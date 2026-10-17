"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { claimMyBookings } from "@/lib/account/bookings";
import { isBackofficePath, postLoginTarget } from "@/lib/auth/password";
import { getViewer } from "@/lib/auth/staff";
import { SITE_URL } from "@/lib/env";
import { userDb } from "@/lib/server/user-db";

export type LoginState = { sent?: boolean; error?: string } | null;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** 登入失敗一律同一句：不透露帳號是否存在、密碼是否正確 */
const LOGIN_FAILED = "Email 或密碼不正確。";

/** Email＋密碼登入；成功後歸戶，再依角色導向（admin→/admin、vendor→/vendor、客人→/account；next 只接受站內、該角色可進的路徑） */
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
    // Supabase 先驗密碼才回 email_not_confirmed → 只有密碼正確的人才會看到這句，不洩漏帳號存在與否
    if (error.code === "email_not_confirmed") {
      return { error: "這個帳號的 Email 尚未驗證。請到信箱點驗證信；找不到信可改用下方的 Email 登入連結。" };
    }
    // 只記狀態碼，不記 Email／密碼
    if (error.code !== "invalid_credentials") console.warn("[login] signInWithPassword:", error.status, error.code);
    return { error: LOGIN_FAILED };
  }
  await claimMyBookings(db);
  const viewer = await getViewer();
  if (!viewer || !viewer.emailConfirmed) {
    await db.auth.signOut();
    return { error: LOGIN_FAILED };
  }
  redirect(postLoginTarget(viewer, fd.get("next")) ?? "/account");
}

/**
 * 寄 Email 登入連結（忘記密碼／不想用密碼）。結果一律模糊回覆，不透露帳號是否存在。
 * 客人入口可自動建立帳號（shouldCreateUser=true，等同註冊，仍須點信驗證）；
 * 後台入口（next 指向 /admin、/vendor）維持 shouldCreateUser=false。
 */
export async function sendLoginLink(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { error: "請輸入正確的 Email。" };
  const db = await userDb();
  const { error } = await db.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: !isBackofficePath(fd.get("next")), emailRedirectTo: `${SITE_URL}/auth/confirm` },
  });
  if (error) {
    // 429（寄太頻繁）要讓使用者知道；其他（含帳號不存在）一律視為已寄出
    if (error.status === 429) return { error: "寄送太頻繁，請稍候一分鐘再試。" };
    console.warn("[login] signInWithOtp:", error.status, error.code);
  }
  return { sent: true };
}

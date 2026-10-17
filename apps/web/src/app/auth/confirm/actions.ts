"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { claimMyBookings } from "@/lib/account/bookings";
import { postLoginTarget } from "@/lib/auth/password";
import { getViewer } from "@/lib/auth/staff";
import { userDb } from "@/lib/server/user-db";
import { CONFIRM_TYPES } from "./types";

/**
 * 驗證信／登入連結：只有使用者在確認頁按下按鈕（POST）才消耗一次性 token。
 * （Outlook／Hotmail Safe Links 等郵件掃描器會先 GET 一次連結；若 GET 就 verifyOtp，真人點時連結已失效）
 */
export async function confirmEmailLink(fd: FormData) {
  const tokenHash = String(fd.get("token_hash") ?? "");
  const type = String(fd.get("type") ?? "") as EmailOtpType;
  if (!tokenHash || tokenHash.length > 512 || !CONFIRM_TYPES.includes(type)) redirect("/login?error=invalid_link");

  const db = await userDb();
  const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect("/login?error=invalid_link");

  await claimMyBookings(db);
  const viewer = await getViewer();
  if (!viewer) redirect("/login?error=invalid_link");

  // 註冊驗證 → 依角色回首頁（客人 /account）；登入連結／重設密碼 → 變更密碼頁（尚未設密碼或忘記密碼的人在此設定，可略過）
  if (type === "signup") redirect(postLoginTarget(viewer, fd.get("next")) ?? "/account");
  redirect("/account/password?from=link");
}

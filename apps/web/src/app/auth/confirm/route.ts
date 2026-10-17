import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/staff";
import { userDb } from "@/lib/server/user-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: EmailOtpType[] = ["magiclink", "email"];

/** magic link 落地：verifyOtp → 依角色導向 /admin 或 /vendor；沒有 staff 紀錄 → 登出並拒絕 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash") ?? "";
  const type = (url.searchParams.get("type") ?? "") as EmailOtpType;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);

  if (!tokenHash || !ALLOWED.includes(type)) return to("/login?error=invalid_link");

  const db = await userDb();
  const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return to("/login?error=invalid_link");

  const staff = await getStaff();
  if (!staff) {
    await db.auth.signOut();
    return to("/login?error=no_access");
  }
  return to(staff.role === "admin" ? "/admin" : "/vendor");
}

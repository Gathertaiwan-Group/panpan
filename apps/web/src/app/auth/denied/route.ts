import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/staff";
import { userDb } from "@/lib/server/user-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 已登入但沒有（或已停用）後台身分 → 登出並回登入頁 */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (staff) return NextResponse.redirect(new URL(staff.role === "admin" ? "/admin" : "/vendor", req.url), 303);
  const db = await userDb();
  await db.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=no_access", req.url), 303);
}

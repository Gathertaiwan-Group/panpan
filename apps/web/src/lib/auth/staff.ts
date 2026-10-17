import "server-only";
import { redirect } from "next/navigation";
import { userDb } from "../server/user-db";
import { accessRedirect, accountRedirect } from "./access";

export interface Staff {
  userId: string;
  email: string;
  role: "admin" | "vendor";
  vendorId: string | null;
  vendorName: string | null;
}

/** 目前登入者的後台身分（以 RLS 讀自己的 staff 列）；沒有 staff 紀錄或已停用 → null */
export async function getStaff(): Promise<Staff | null> {
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: row } = await db
    .from("staff")
    .select("role,vendor_id,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row || !row.active) return null;
  if (row.role === "admin") {
    return { userId: user.id, email: user.email ?? "", role: "admin", vendorId: null, vendorName: null };
  }
  // 供應商：vendors 的 RLS 只讓「啟用中的自己」讀得到 → 讀不到即視為停用
  const { data: vendor } = await db.from("vendors").select("id,name").eq("id", row.vendor_id).maybeSingle();
  if (!vendor) return null;
  return { userId: user.id, email: user.email ?? "", role: "vendor", vendorId: vendor.id, vendorName: vendor.name };
}

export async function isLoggedIn(): Promise<boolean> {
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  return Boolean(user);
}

/** 頁面／Server Action 用：不是管理員一律擋下 */
export async function requireAdmin(): Promise<Staff> {
  const staff = await getStaff();
  const to = accessRedirect("admin", staff, staff ? true : await isLoggedIn());
  if (to || !staff) redirect(to ?? "/login");
  return staff;
}

/** 頁面／Server Action 用：只允許供應商（管理員改去 /admin） */
export async function requireVendor(): Promise<Staff & { vendorId: string }> {
  const staff = await getStaff();
  const to = accessRedirect("vendor", staff, staff ? true : await isLoggedIn());
  if (to || !staff) redirect(to ?? "/login");
  return staff as Staff & { vendorId: string };
}

/** 管理員與供應商都可用的頁面／Server Action（例如變更密碼） */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  const to = accountRedirect(staff, staff ? true : await isLoggedIn());
  if (to || !staff) redirect(to ?? "/login");
  return staff;
}

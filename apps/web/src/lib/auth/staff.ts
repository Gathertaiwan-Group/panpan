import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { userDb } from "../server/user-db";
import { accessRedirect, accountRedirect } from "./access";
import type { Role } from "./password";

export interface Staff {
  userId: string;
  email: string;
  role: "admin" | "vendor";
  vendorId: string | null;
  vendorName: string | null;
}

/** 目前登入者（任何角色）。role：staff 照舊，其餘已登入者一律是「客人」 */
export interface Viewer {
  userId: string;
  email: string;
  name: string;
  emailConfirmed: boolean;
  role: Role;
  staff: Staff | null;
}

type Db = Awaited<ReturnType<typeof userDb>>;

/** 以 RLS 讀自己的 staff 列；沒有紀錄或已停用 → null */
async function staffFor(db: Db, user: User): Promise<Staff | null> {
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

/** 目前登入者的後台身分；沒有 staff 紀錄或已停用 → null */
export async function getStaff(): Promise<Staff | null> {
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return staffFor(db, user);
}

export async function getViewer(): Promise<Viewer | null> {
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const staff = await staffFor(db, user);
  const rawName = (user.user_metadata as { display_name?: unknown } | null)?.display_name;
  return {
    userId: user.id,
    email: user.email ?? "",
    name: typeof rawName === "string" ? rawName.trim().slice(0, 40) : "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    role: staff?.role ?? "customer",
    staff,
  };
}

export async function isLoggedIn(): Promise<boolean> {
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  return Boolean(user);
}

/** 頁面／Server Action 用：不是管理員一律擋下（白名單） */
export async function requireAdmin(): Promise<Staff> {
  const staff = await getStaff();
  const to = accessRedirect("admin", staff, staff ? true : await isLoggedIn());
  if (to || !staff) redirect(to ?? "/login");
  return staff;
}

/** 頁面／Server Action 用：只允許供應商（管理員改去 /admin；客人回 /account） */
export async function requireVendor(): Promise<Staff & { vendorId: string }> {
  const staff = await getStaff();
  const to = accessRedirect("vendor", staff, staff ? true : await isLoggedIn());
  if (to || !staff) redirect(to ?? "/login");
  return staff as Staff & { vendorId: string };
}

/** 會員專區（客人、供應商、管理員皆可）：需登入且 Email 已驗證 */
export async function requireViewer(path = "/account"): Promise<Viewer> {
  const viewer = await getViewer();
  const to = accountRedirect(viewer, path);
  if (to || !viewer) redirect(to ?? "/login");
  return viewer;
}

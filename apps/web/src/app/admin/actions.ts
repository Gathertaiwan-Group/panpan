"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/staff";
import { adminAuth, adminDb } from "@/lib/server/admin-db";

// 管理後台寫入：每個 action 先在伺服器端確認是管理員，再用 service role 寫入。

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

// ===== 供應商 =====
const vendorSchema = z.object({
  name: z.string().trim().min(1, "請填寫名稱").max(120),
  contact_email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, "Email 格式不正確"),
  phone: optText(30),
});

export async function createVendor(fd: FormData) {
  await requireAdmin();
  const p = vendorSchema.safeParse({
    name: fd.get("name"),
    contact_email: fd.get("contact_email") || undefined,
    phone: fd.get("phone") || undefined,
  });
  if (!p.success) back("/admin/vendors", { err: p.error.issues[0]?.message ?? "資料不正確" });
  const { error } = await adminDb().from("vendors").insert(p.data);
  if (error) back("/admin/vendors", { err: `新增失敗：${error.message}` });
  revalidatePath("/admin/vendors");
  back("/admin/vendors", { msg: `已新增供應商「${p.data.name}」。` });
}

export async function updateVendor(fd: FormData) {
  await requireAdmin();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const p = vendorSchema.safeParse({
    name: fd.get("name"),
    contact_email: fd.get("contact_email") || undefined,
    phone: fd.get("phone") || undefined,
  });
  if (!id.success || !p.success) back("/admin/vendors", { err: p.error?.issues[0]?.message ?? "資料不正確" });
  const { error } = await adminDb().from("vendors").update(p.data).eq("id", id.data);
  if (error) back("/admin/vendors", { err: `更新失敗：${error.message}` });
  revalidatePath("/admin/vendors");
  back("/admin/vendors", { msg: "已更新供應商資料。" });
}

export async function setVendorActive(fd: FormData) {
  await requireAdmin();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const active = fd.get("active") === "true";
  if (!id.success) back("/admin/vendors", { err: "資料不正確" });
  const { error } = await adminDb().from("vendors").update({ active }).eq("id", id.data);
  if (error) back("/admin/vendors", { err: `更新失敗：${error.message}` });
  revalidateTag("experiences");
  revalidatePath("/admin/vendors");
  back("/admin/vendors", {
    msg: active ? "已啟用供應商。" : "已停用供應商：該供應商的帳號無法登入後台，綁定的體驗也會暫停線上預約。",
  });
}

/** 為供應商建立登入帳號（Supabase Auth，email 已驗證、不設密碼；之後用 magic link 登入） */
export async function createVendorLogin(fd: FormData) {
  await requireAdmin();
  const vendorId = z.string().uuid().safeParse(fd.get("vendor_id"));
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(fd.get("email"));
  if (!vendorId.success || !email.success) back("/admin/vendors", { err: "請填寫正確的 Email。" });
  const db = adminDb();
  const { data: vendor } = await db.from("vendors").select("id,active").eq("id", vendorId.data).maybeSingle();
  if (!vendor) back("/admin/vendors", { err: "找不到供應商。" });

  let userId: string | null = null;
  const created = await adminAuth().createUser({ email: email.data, email_confirm: true });
  if (created.data.user) {
    userId = created.data.user.id;
  } else if (created.error && (created.error.code === "email_exists" || /already/i.test(created.error.message))) {
    // 已有 Auth 帳號（例如之前建過）→ 找出來綁定
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data, error } = await adminAuth().listUsers({ page, perPage: 200 });
      if (error || !data.users.length) break;
      userId = data.users.find((u) => u.email?.toLowerCase() === email.data)?.id ?? null;
    }
  } else if (created.error) {
    back("/admin/vendors", { err: `建立帳號失敗：${created.error.message}` });
  }
  if (!userId) back("/admin/vendors", { err: "建立帳號失敗，請再試一次。" });

  const { data: existing } = await db.from("staff").select("role,vendor_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    back("/admin/vendors", {
      err: existing.role === "admin" ? "這個 Email 是管理員帳號，不能綁成供應商。" : "這個 Email 已經綁定其他供應商。",
    });
  }
  const { error } = await db
    .from("staff")
    .insert({ user_id: userId, email: email.data, role: "vendor", vendor_id: vendorId.data, active: true });
  if (error) back("/admin/vendors", { err: `綁定失敗：${error.message}` });
  revalidatePath("/admin/vendors");
  back("/admin/vendors", { msg: `已建立登入帳號 ${email.data}。請供應商到 /login 輸入 Email 取得登入連結。` });
}

export async function setStaffActive(fd: FormData) {
  const me = await requireAdmin();
  const userId = z.string().uuid().safeParse(fd.get("user_id"));
  const active = fd.get("active") === "true";
  if (!userId.success) back("/admin/vendors", { err: "資料不正確" });
  if (userId.data === me.userId) back("/admin/vendors", { err: "不能停用自己。" });
  const { error } = await adminDb().from("staff").update({ active }).eq("user_id", userId.data).eq("role", "vendor");
  if (error) back("/admin/vendors", { err: `更新失敗：${error.message}` });
  revalidatePath("/admin/vendors");
  back("/admin/vendors", { msg: active ? "已啟用帳號。" : "已停用帳號（無法再看到任何預約）。" });
}

// ===== 體驗 SET =====
const setSchema = z
  .object({
    id: z.string().uuid(),
    vendor_id: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || z.string().uuid().safeParse(v).success),
    price_twd: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 30 && v <= 1_000_000), "價格需為 30 以上的整數"),
    duration_minutes: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 15 && v <= 720), "時長需為 15–720 分鐘"),
    booking_enabled: z.boolean(),
  })
  .refine((s) => !s.booking_enabled || (s.vendor_id && s.price_twd && s.duration_minutes), {
    message: "開啟線上預約前，請先設定供應商、價格（≥ NT$30）與時長。",
  });

export async function updateSet(fd: FormData) {
  await requireAdmin();
  const p = setSchema.safeParse({
    id: fd.get("id"),
    vendor_id: fd.get("vendor_id") || undefined,
    price_twd: fd.get("price_twd") || undefined,
    duration_minutes: fd.get("duration_minutes") || undefined,
    booking_enabled: fd.get("booking_enabled") === "on",
  });
  if (!p.success) back("/admin/sets", { err: p.error.issues[0]?.message ?? "資料不正確" });
  const { id, ...row } = p.data;
  const { data, error } = await adminDb().from("experience_sets").update(row).eq("id", id).select("slug").maybeSingle();
  if (error || !data) back("/admin/sets", { err: `儲存失敗：${error?.message ?? "找不到體驗"}` });
  revalidateTag("experiences");
  revalidatePath(`/farewell/${data.slug}`);
  revalidatePath("/admin/sets");
  back("/admin/sets", { msg: "已儲存體驗設定。" });
}

// ===== 預約 =====
export async function bookingAction(fd: FormData) {
  await requireAdmin();
  const id = z.string().uuid().safeParse(fd.get("id"));
  const action = z.enum(["cancel", "refund", "resolve"]).safeParse(fd.get("action"));
  const note = String(fd.get("note") ?? "").trim().slice(0, 500);
  const ret = String(fd.get("return") ?? "/admin");
  const path = ret.startsWith("/admin") ? ret.split("?")[0] : "/admin";
  if (!id.success || !action.success) back(path, { err: "資料不正確" });
  const db = adminDb();
  const now = new Date().toISOString();
  const { data: b } = await db.from("bookings").select("id,status,admin_note").eq("id", id.data).maybeSingle();
  if (!b) back(path, { err: "找不到預約。" });
  const stamp = (s: string) => [b.admin_note, `${now.slice(0, 16)} ${s}${note ? `：${note}` : ""}`].filter(Boolean).join("\n");

  let q;
  if (action.data === "cancel") {
    q = db
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: now, hold_expires_at: null, admin_note: stamp("標記取消") })
      .eq("id", id.data)
      .in("status", ["pending_payment", "confirmed"]);
  } else if (action.data === "refund") {
    q = db
      .from("bookings")
      .update({ status: "refunded", refunded_at: now, needs_attention: false, admin_note: stamp("標記已退款") })
      .eq("id", id.data)
      .in("status", ["confirmed", "cancelled", "expired"]);
  } else {
    q = db
      .from("bookings")
      .update({ needs_attention: false, admin_note: stamp("人工處理完成") })
      .eq("id", id.data)
      .eq("needs_attention", true);
  }
  const { data, error } = await q.select("id");
  if (error) back(path, { err: `更新失敗：${error.message}` });
  if (!data?.length) back(path, { err: "狀態已變更，請重新整理後再試。" });
  revalidatePath("/admin");
  back(path, { msg: action.data === "cancel" ? "已標記取消。" : action.data === "refund" ? "已標記退款。" : "已標記處理完成。" });
}

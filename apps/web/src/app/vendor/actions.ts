"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireVendor } from "@/lib/auth/staff";
import { addDays, isValidDate, isValidTime, taipeiDate } from "@/lib/booking/time";
import { userDb } from "@/lib/server/user-db";

// 供應商的寫入一律用「登入者自己的 session」（RLS：只能動自己 vendor 的時段），
// vendor_id 取自伺服器端 staff 身分，不信任表單。

function back(path: string, params: Record<string, string>): never {
  const sp = new URLSearchParams(params);
  redirect(`${path}?${sp.toString()}`);
}

const weeklySchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  time: z.string().refine(isValidTime),
});

export async function addWeeklySlot(fd: FormData) {
  const me = await requireVendor();
  const p = weeklySchema.safeParse({ weekday: fd.get("weekday"), time: fd.get("time") });
  if (!p.success) back("/vendor/slots", { err: "請選擇星期與時間。" });
  const db = await userDb();
  const { error } = await db
    .from("vendor_weekly_slots")
    .insert({ vendor_id: me.vendorId, weekday: p.data.weekday, start_time: p.data.time });
  if (error) back("/vendor/slots", { err: error.code === "23505" ? "這個時段已經存在。" : "新增失敗，請再試一次。" });
  revalidatePath("/vendor/slots");
  back("/vendor/slots", { msg: "已新增每週時段。" });
}

export async function removeWeeklySlot(fd: FormData) {
  await requireVendor();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) back("/vendor/slots", { err: "資料不正確。" });
  const db = await userDb();
  const { error } = await db.from("vendor_weekly_slots").delete().eq("id", id.data);
  if (error) back("/vendor/slots", { err: "刪除失敗，請再試一次。" });
  revalidatePath("/vendor/slots");
  back("/vendor/slots", { msg: "已移除。" });
}

const overrideSchema = z.object({
  date: z.string().refine(isValidDate),
  mode: z.enum(["closed", "extra"]),
  time: z.string().optional(),
  note: z.string().trim().max(200).optional(),
});

export async function saveOverride(fd: FormData) {
  const me = await requireVendor();
  const p = overrideSchema.safeParse({
    date: fd.get("date"),
    mode: fd.get("mode"),
    time: fd.get("time") || undefined,
    note: fd.get("note") || undefined,
  });
  if (!p.success) back("/vendor/slots", { err: "請選擇日期與類型。" });
  const today = taipeiDate(new Date());
  if (p.data.date < today || p.data.date > addDays(today, 90)) back("/vendor/slots", { err: "日期需在今天到 90 天內。" });
  if (p.data.mode === "extra" && !(p.data.time && isValidTime(p.data.time))) {
    back("/vendor/slots", { err: "加開請選擇時間。" });
  }
  const db = await userDb();
  const { data: existing } = await db
    .from("vendor_date_overrides")
    .select("id,extra_times")
    .eq("vendor_id", me.vendorId)
    .eq("date", p.data.date)
    .maybeSingle();
  const extra =
    p.data.mode === "extra"
      ? [...new Set([...((existing?.extra_times as string[] | null) ?? []).map((t) => t.slice(0, 5)), p.data.time as string])].sort()
      : [];
  const row = {
    vendor_id: me.vendorId,
    date: p.data.date,
    closed: p.data.mode === "closed",
    extra_times: extra,
    note: p.data.note ?? null,
  };
  const { error } = await db.from("vendor_date_overrides").upsert(row, { onConflict: "vendor_id,date" });
  if (error) back("/vendor/slots", { err: "儲存失敗，請再試一次。" });
  revalidatePath("/vendor/slots");
  back("/vendor/slots", { msg: p.data.mode === "closed" ? "已設定請假。" : "已加開時段。" });
}

export async function removeOverride(fd: FormData) {
  await requireVendor();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) back("/vendor/slots", { err: "資料不正確。" });
  const db = await userDb();
  const { error } = await db.from("vendor_date_overrides").delete().eq("id", id.data);
  if (error) back("/vendor/slots", { err: "刪除失敗，請再試一次。" });
  revalidatePath("/vendor/slots");
  back("/vendor/slots", { msg: "已移除。" });
}

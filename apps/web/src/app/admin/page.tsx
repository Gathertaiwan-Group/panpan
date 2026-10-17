import { AdminBookingsView, type AdminBookingRow, type AdminSearch } from "@/components/backoffice/views/AdminBookingsView";
import { requireAdmin } from "@/lib/auth/staff";
import { isValidDate } from "@/lib/booking/time";
import { adminDb } from "@/lib/server/admin-db";

const PER = 50;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = adminDb();

  const [{ data: vendors }, { count: attentionCount }] = await Promise.all([
    db.from("vendors").select("id,name").order("name"),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("needs_attention", true),
  ]);

  let q = db
    .from("bookings")
    .select(
      "id,order_no,set_name,vendor_id,starts_at,ends_at,status,pay_method,amount,hold_expires_at,customer_name,phone,email,note,needs_attention,attention_reason,admin_note,created_at,payments(status,gateway_order_id,pay_type)",
      { count: "exact" },
    );
  const nowIso = new Date().toISOString();
  if (sp.status === "pending") q = q.eq("status", "pending_payment").gt("hold_expires_at", nowIso);
  else if (sp.status === "expired") q = q.or(`status.eq.expired,and(status.eq.pending_payment,hold_expires_at.lte.${nowIso})`);
  else if (sp.status && ["confirmed", "cancelled", "refunded"].includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.vendor && /^[0-9a-f-]{36}$/.test(sp.vendor)) q = q.eq("vendor_id", sp.vendor);
  if (sp.from && isValidDate(sp.from)) q = q.gte("starts_at", `${sp.from}T00:00:00+08:00`);
  if (sp.to && isValidDate(sp.to)) q = q.lte("starts_at", `${sp.to}T23:59:59+08:00`);
  if (sp.attention === "1") q = q.eq("needs_attention", true);
  const { data, count, error } = await q.order("starts_at", { ascending: false }).range((page - 1) * PER, page * PER - 1);

  return (
    <AdminBookingsView
      who={me.email}
      sp={sp}
      vendors={(vendors ?? []) as Array<{ id: string; name: string }>}
      rows={(data ?? []) as AdminBookingRow[]}
      count={count ?? 0}
      page={page}
      pages={Math.max(1, Math.ceil((count ?? 0) / PER))}
      attentionCount={attentionCount ?? 0}
      loadError={error ? `讀取失敗：${error.message}` : undefined}
    />
  );
}

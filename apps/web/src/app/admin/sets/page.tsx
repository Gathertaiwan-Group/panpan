import { AdminSetsView, type AdminSetRow } from "@/components/backoffice/views/AdminSetsView";
import { requireAdmin } from "@/lib/auth/staff";
import { adminDb } from "@/lib/server/admin-db";

export default async function AdminSets({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const db = adminDb();
  const [{ data: sets }, { data: vendors }] = await Promise.all([
    db
      .from("experience_sets")
      .select("id,slug,code,name,status,price_twd,duration_minutes,vendor_id,booking_enabled")
      .order("sort_order"),
    db.from("vendors").select("id,name,active").order("name"),
  ]);
  return (
    <AdminSetsView
      who={me.email}
      sets={(sets ?? []) as AdminSetRow[]}
      vendors={(vendors ?? []) as Array<{ id: string; name: string; active: boolean }>}
      sp={sp}
    />
  );
}

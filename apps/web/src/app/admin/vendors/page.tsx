import {
  AdminVendorsView,
  type VendorRow,
  type VendorStaffRow,
} from "@/components/backoffice/views/AdminVendorsView";
import { requireAdmin } from "@/lib/auth/staff";
import { adminDb } from "@/lib/server/admin-db";

export default async function AdminVendors({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const db = adminDb();
  const [{ data: vendors }, { data: staff }, { data: sets }] = await Promise.all([
    db.from("vendors").select("id,name,contact_email,phone,active").order("created_at"),
    db.from("staff").select("user_id,email,vendor_id,active").eq("role", "vendor"),
    db.from("experience_sets").select("name,vendor_id"),
  ]);
  return (
    <AdminVendorsView
      who={me.email}
      vendors={(vendors ?? []) as VendorRow[]}
      staff={(staff ?? []) as VendorStaffRow[]}
      sets={(sets ?? []) as Array<{ name: string; vendor_id: string | null }>}
      sp={sp}
    />
  );
}

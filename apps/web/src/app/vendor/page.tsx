import type { VendorBookingRow } from "@/components/backoffice/BookingCard";
import { VendorHomeView } from "@/components/backoffice/views/VendorHomeView";
import { requireVendor } from "@/lib/auth/staff";
import { userDb } from "@/lib/server/user-db";

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function VendorHome({ searchParams }: Props) {
  const me = await requireVendor();
  const sp = await searchParams;
  const db = await userDb();
  // RLS：只會讀到自己 vendor、已確認／已退款的預約（view 只含必要欄位）
  const { data, error } = await db
    .from("vendor_bookings")
    .select("id,set_name,starts_at,ends_at,status,customer_name,phone,note")
    .eq("status", "confirmed")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);
  return (
    <VendorHomeView
      who={`${me.vendorName}・${me.email}`}
      rows={(data ?? []) as VendorBookingRow[]}
      denied={Boolean(sp.denied)}
      error={Boolean(error)}
    />
  );
}

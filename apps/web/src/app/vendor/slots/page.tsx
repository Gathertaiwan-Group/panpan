import { VendorSlotsView, type OverrideRow, type WeeklyRow } from "@/components/backoffice/views/VendorSlotsView";
import { requireVendor } from "@/lib/auth/staff";
import { taipeiDate } from "@/lib/booking/time";
import { userDb } from "@/lib/server/user-db";

type Props = { searchParams: Promise<{ msg?: string; err?: string }> };

export default async function VendorSlots({ searchParams }: Props) {
  const me = await requireVendor();
  const sp = await searchParams;
  const db = await userDb();
  const today = taipeiDate(new Date());
  // RLS：只讀得到自己 vendor 的時段
  const [weekly, overrides] = await Promise.all([
    db.from("vendor_weekly_slots").select("id,weekday,start_time").order("start_time"),
    db.from("vendor_date_overrides").select("id,date,closed,extra_times,note").gte("date", today).order("date"),
  ]);
  return (
    <VendorSlotsView
      who={`${me.vendorName}・${me.email}`}
      today={today}
      weekly={(weekly.data ?? []) as WeeklyRow[]}
      overrides={(overrides.data ?? []) as OverrideRow[]}
      msg={sp.msg}
      err={sp.err}
    />
  );
}

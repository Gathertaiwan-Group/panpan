import Link from "next/link";
import { BookingCard, groupByTaipeiDate, type VendorBookingRow } from "@/components/backoffice/BookingCard";
import { Shell } from "@/components/backoffice/Shell";
import { smallBtn } from "@/components/booking/ui";
import { requireVendor } from "@/lib/auth/staff";
import { formatDateShort } from "@/lib/booking/time";
import { userDb } from "@/lib/server/user-db";
import { VENDOR_NAV } from "../nav";

const PER = 20;
type Props = { searchParams: Promise<{ page?: string }> };

export default async function VendorHistory({ searchParams }: Props) {
  const me = await requireVendor();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const db = await userDb();
  const { data, count } = await db
    .from("vendor_bookings")
    .select("id,set_name,starts_at,ends_at,status,customer_name,phone,note", { count: "exact" })
    .lt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  const groups = groupByTaipeiDate((data ?? []) as VendorBookingRow[]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));

  return (
    <Shell eyebrow="VENDOR" title="歷史預約" who={`${me.vendorName}・${me.email}`} nav={VENDOR_NAV} active="/vendor/history">
      {groups.length === 0 ? (
        <p className="m-0 border border-dashed border-line-2 p-6 text-center text-[15px] text-muted">還沒有歷史預約。</p>
      ) : (
        groups.map(([date, rows]) => (
          <section key={date} className="flex flex-col gap-3">
            <h2 className="m-0 font-serif text-[18px] font-normal tracking-[.1em] text-rose-deep">{formatDateShort(date)}</h2>
            {rows.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </section>
        ))
      )}
      <nav aria-label="分頁" className="flex items-center justify-between gap-3">
        {page > 1 ? <Link href={`/vendor/history?page=${page - 1}`} className={smallBtn}>← 較新</Link> : <span />}
        <span className="text-[14px] text-muted">
          {page} / {pages}
        </span>
        {page < pages ? <Link href={`/vendor/history?page=${page + 1}`} className={smallBtn}>較舊 →</Link> : <span />}
      </nav>
    </Shell>
  );
}

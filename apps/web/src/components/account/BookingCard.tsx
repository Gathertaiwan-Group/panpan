import Link from "next/link";
import { money } from "@/components/booking/ui";
import type { MyBooking } from "@/lib/account/view";
import { taipeiParts } from "@/lib/account/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/booking/status-labels";

export function StatusBadge({ view }: { view: MyBooking["view"] }) {
  return (
    <span className={`inline-flex shrink-0 items-center border px-2 py-[2px] text-[13px] tracking-[.08em] ${STATUS_TONE[view]}`}>
      {STATUS_LABEL[view]}
    </span>
  );
}

export function MyBookingCard({ b }: { b: MyBooking }) {
  const s = taipeiParts(b.starts_at);
  const e = taipeiParts(b.ends_at);
  return (
    <Link
      href={`/account/bookings/${b.id}`}
      className="flex flex-col gap-2 border border-line bg-white p-4 text-ink no-underline hover:border-rose"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-serif text-[18px] leading-[1.5]">{b.set_name}</span>
        <StatusBadge view={b.view} />
      </div>
      <span className="text-[15px] text-body">
        {s.date} {s.time}–{e.time}
      </span>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-muted">
        <span className="min-w-0 break-all">{b.vendor_name ?? ""}</span>
        <span className="text-ink">{money(b.amount)}</span>
      </div>
    </Link>
  );
}

import { taipeiTime } from "@/lib/booking/time";

export interface VendorBookingRow {
  id: string;
  set_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer_name: string;
  phone: string;
  note: string | null;
}

const STATUS: Record<string, string> = { confirmed: "已確認", refunded: "已退款" };

export function BookingCard({ b }: { b: VendorBookingRow }) {
  return (
    <article className="flex flex-col gap-2 border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-serif text-[18px] tracking-[.06em] text-ink">
          {taipeiTime(new Date(b.starts_at))}–{taipeiTime(new Date(b.ends_at))}
        </span>
        <span
          className={`border px-2 py-[2px] text-[12px] tracking-[.1em] ${
            b.status === "confirmed" ? "border-rose text-rose-deep" : "border-line-2 text-muted"
          }`}
        >
          {STATUS[b.status] ?? b.status}
        </span>
      </div>
      <span className="text-[15px] text-body">{b.set_name}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-ink">
        <span className="break-all">{b.customer_name}</span>
        <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-[44px] items-center text-rose-deep">
          {b.phone}
        </a>
      </div>
      {b.note && (
        <p className="m-0 border-t border-line pt-2 text-[14px] leading-[1.8] [overflow-wrap:anywhere] whitespace-pre-wrap text-body">
          {b.note}
        </p>
      )}
    </article>
  );
}

export function groupByTaipeiDate<T extends { starts_at: string }>(rows: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const d = new Date(new Date(r.starts_at).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    map.set(d, [...(map.get(d) ?? []), r]);
  }
  return [...map.entries()];
}

import { BookingCard, groupByTaipeiDate, type VendorBookingRow } from "@/components/backoffice/BookingCard";
import { Flash, Shell } from "@/components/backoffice/Shell";
import { formatDateShort } from "@/lib/booking/time";
import { VENDOR_NAV } from "@/app/vendor/nav";

export function VendorHomeView({
  who,
  rows,
  denied,
  error,
}: {
  who: string;
  rows: VendorBookingRow[];
  denied?: boolean;
  error?: boolean;
}) {
  const groups = groupByTaipeiDate(rows);
  return (
    <Shell eyebrow="VENDOR" title="即將到來的預約" who={who} nav={VENDOR_NAV} active="/vendor">
      <Flash err={denied ? "供應商帳號無法進入管理後台。" : error ? "讀取預約失敗，請重新整理。" : undefined} />
      <p className="m-0 text-[14px] leading-[1.8] text-muted">
        這裡只會出現客人已完成付款的預約。請在體驗前主動聯繫客人，確認地點與細節。
      </p>
      {groups.length === 0 ? (
        <p className="m-0 border border-dashed border-line-2 p-6 text-center text-[15px] text-muted">目前沒有即將到來的預約。</p>
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
    </Shell>
  );
}

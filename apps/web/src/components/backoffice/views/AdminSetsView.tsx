import { Flash, Shell } from "@/components/backoffice/Shell";
import { inputCls, money, primaryBtn } from "@/components/booking/ui";
import { updateSet } from "@/app/admin/actions";
import { ADMIN_NAV } from "@/app/admin/nav";

export type AdminSetRow = {
  id: string;
  slug: string;
  code: string;
  name: string;
  status: string;
  price_twd: number | null;
  duration_minutes: number | null;
  vendor_id: string | null;
  booking_enabled: boolean;
};

export function AdminSetsView({
  who,
  sets,
  vendors,
  sp,
}: {
  who: string;
  sets: AdminSetRow[];
  vendors: Array<{ id: string; name: string; active: boolean }>;
  sp: { msg?: string; err?: string };
}) {
  return (
    <Shell eyebrow="ADMIN" title="體驗設定" who={who} nav={ADMIN_NAV} active="/admin/sets">
      <Flash msg={sp.msg} err={sp.err} />
      <p className="m-0 text-[14px] leading-[1.8] text-muted">
        設定好供應商、價格（≥ NT$30）與時長並勾選「開放線上預約」，體驗頁才會出現「立即預約」；否則維持原本的預約詢問表單。
      </p>
      {sets.map((s) => {
        const vendor = vendors.find((v) => v.id === s.vendor_id);
        const live = s.booking_enabled && s.status === "published" && vendor?.active;
        return (
          <form key={s.id} action={updateSet} className="flex flex-col gap-4 border border-line bg-white p-4">
            <input type="hidden" name="id" value={s.id} />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-serif text-[19px] font-normal text-ink">
                <span className="mr-2 font-en text-[14px] tracking-[.2em] text-gold">{s.code}</span>
                {s.name}
              </h2>
              <span className={`text-[13px] ${live ? "text-rose-deep" : "text-muted"}`}>
                {live ? `線上預約中・${money(s.price_twd ?? 0)}` : "未開放線上預約"}
              </span>
            </div>
            <div className="grid gap-3 dt:grid-cols-3">
              <label className="flex flex-col gap-1 text-[13px] text-body">
                主供應商
                <select name="vendor_id" defaultValue={s.vendor_id ?? ""} className={inputCls}>
                  <option value="">（未設定）</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.active ? "" : "（已停用）"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-body">
                價格（NT$，含稅全額）
                <input name="price_twd" type="number" inputMode="numeric" min={30} step={1} defaultValue={s.price_twd ?? ""} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-body">
                時長（分鐘）
                <input name="duration_minutes" type="number" inputMode="numeric" min={15} max={720} step={5} defaultValue={s.duration_minutes ?? ""} className={inputCls} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-ink">
                <input type="checkbox" name="booking_enabled" defaultChecked={s.booking_enabled} className="h-5 w-5 accent-[#a35b55]" />
                開放線上預約
              </label>
              <button type="submit" className={primaryBtn}>
                儲存
              </button>
            </div>
          </form>
        );
      })}
    </Shell>
  );
}

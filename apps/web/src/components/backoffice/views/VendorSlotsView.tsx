import { Flash, Shell } from "@/components/backoffice/Shell";
import { inputCls, primaryBtn, smallBtn } from "@/components/booking/ui";
import { WEEKDAY_ZH, addDays, formatDateShort, normalizeTime } from "@/lib/booking/time";
import { addWeeklySlot, removeOverride, removeWeeklySlot, saveOverride } from "@/app/vendor/actions";
import { VENDOR_NAV } from "@/app/vendor/nav";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // 一 → 日

export type WeeklyRow = { id: string; weekday: number; start_time: string };
export type OverrideRow = { id: string; date: string; closed: boolean; extra_times: string[]; note: string | null };

export function VendorSlotsView({
  who,
  today,
  weekly,
  overrides,
  msg,
  err,
}: {
  who: string;
  today: string;
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
  msg?: string;
  err?: string;
}) {
  const byDay = new Map<number, Array<{ id: string; time: string }>>();
  for (const w of weekly) {
    byDay.set(w.weekday, [...(byDay.get(w.weekday) ?? []), { id: w.id, time: normalizeTime(w.start_time) }]);
  }
  const sp = { msg, err };
  return (
    <Shell eyebrow="VENDOR" title="我的時段" who={who} nav={VENDOR_NAV} active="/vendor/slots">
      <Flash msg={sp.msg} err={sp.err} />

      <section className="flex flex-col gap-4">
        <h2 className="m-0 font-serif text-[20px] font-normal tracking-[.1em] text-ink">每週可接時段</h2>
        <p className="m-0 text-[14px] leading-[1.8] text-muted">
          客人可以選擇的「開始時間」。體驗時長由管理員設定，系統會自動避開彼此重疊的預約。
        </p>
        <div className="flex flex-col border-t border-line">
          {ORDER.map((d) => (
            <div key={d} className="flex flex-wrap items-center gap-2 border-b border-line py-3">
              <span className="w-12 shrink-0 font-serif text-[16px] text-ink">週{WEEKDAY_ZH[d]}</span>
              {(byDay.get(d) ?? []).length === 0 && <span className="text-[14px] text-muted">不接</span>}
              {(byDay.get(d) ?? []).map((s) => (
                <form key={s.id} action={removeWeeklySlot} className="inline-flex">
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className={smallBtn} aria-label={`移除週${WEEKDAY_ZH[d]} ${s.time}`}>
                    {s.time} <span aria-hidden="true" className="ml-2 text-muted">×</span>
                  </button>
                </form>
              ))}
            </div>
          ))}
        </div>
        <form action={addWeeklySlot} className="flex flex-wrap items-end gap-3 border border-line bg-white p-4">
          <label className="flex min-w-[110px] flex-1 flex-col gap-1 text-[14px] text-body">
            星期
            <select name="weekday" className={inputCls} defaultValue="1">
              {ORDER.map((d) => (
                <option key={d} value={d}>
                  週{WEEKDAY_ZH[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[130px] flex-1 flex-col gap-1 text-[14px] text-body">
            開始時間
            <input name="time" type="time" step={900} required className={inputCls} defaultValue="10:00" />
          </label>
          <button type="submit" className={`${primaryBtn} flex-1`}>
            新增
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="m-0 font-serif text-[20px] font-normal tracking-[.1em] text-ink">單日請假／加開</h2>
        {overrides.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">目前沒有設定。</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {overrides.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] text-ink">
                    {formatDateShort(o.date)}　
                    <span className={o.closed ? "text-rose-deep" : "text-gold"}>
                      {o.closed ? "請假（全天不開放）" : `加開 ${o.extra_times.map(normalizeTime).join("、")}`}
                    </span>
                  </span>
                  {o.note && <span className="text-[13px] [overflow-wrap:anywhere] text-muted">{o.note}</span>}
                </div>
                <form action={removeOverride}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" className={smallBtn}>
                    刪除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={saveOverride} className="flex flex-col gap-3 border border-line bg-white p-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-[14px] text-body">
              日期
              <input name="date" type="date" required min={today} max={addDays(today, 90)} className={inputCls} />
            </label>
            <label className="flex min-w-[130px] flex-1 flex-col gap-1 text-[14px] text-body">
              加開時間（請假免填）
              <input name="time" type="time" step={900} className={inputCls} />
            </label>
          </div>
          <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
            <legend className="mb-1 text-[14px] text-body">類型</legend>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[15px]">
              <input type="radio" name="mode" value="closed" defaultChecked className="h-5 w-5 accent-rose" /> 請假
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[15px]">
              <input type="radio" name="mode" value="extra" className="h-5 w-5 accent-rose" /> 加開一個時段
            </label>
          </fieldset>
          <label className="flex flex-col gap-1 text-[14px] text-body">
            備註（選填，僅後台可見）
            <input name="note" maxLength={200} className={inputCls} />
          </label>
          <button type="submit" className={primaryBtn}>
            儲存
          </button>
          <p className="m-0 text-[13px] leading-[1.7] text-muted">
            請假不會取消已確認的預約；若當天已有預約，請與管理員聯繫處理。
          </p>
        </form>
      </section>
    </Shell>
  );
}

import { ConfirmSubmit } from "@/components/backoffice/ConfirmSubmit";
import { Flash, Shell } from "@/components/backoffice/Shell";
import { inputCls, primaryBtn, smallBtn } from "@/components/booking/ui";
import { createVendor, createVendorLogin, setStaffActive, setVendorActive, updateVendor } from "@/app/admin/actions";
import { ADMIN_NAV } from "@/app/admin/nav";

export type VendorRow = { id: string; name: string; contact_email: string | null; phone: string | null; active: boolean };
export type VendorStaffRow = { user_id: string; email: string | null; vendor_id: string | null; active: boolean };

export function AdminVendorsView({
  who,
  vendors,
  staff,
  sets,
  sp,
}: {
  who: string;
  vendors: VendorRow[];
  staff: VendorStaffRow[];
  sets: Array<{ name: string; vendor_id: string | null }>;
  sp: { msg?: string; err?: string };
}) {
  return (
    <Shell eyebrow="ADMIN" title="供應商管理" who={who} nav={ADMIN_NAV} active="/admin/vendors">
      <Flash msg={sp.msg} err={sp.err} />

      <details className="border border-line bg-white p-4" open={vendors.length === 0}>
        <summary className="flex min-h-[44px] cursor-pointer items-center font-serif text-[18px] text-ink">＋ 新增供應商</summary>
        <form action={createVendor} className="mt-3 grid gap-3 dt:grid-cols-3">
          <label className="flex flex-col gap-1 text-[13px] text-body">
            名稱
            <input name="name" required maxLength={120} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-body">
            聯絡 Email（接收新預約通知）
            <input name="contact_email" type="email" maxLength={254} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-body">
            電話
            <input name="phone" type="tel" maxLength={30} className={inputCls} />
          </label>
          <button type="submit" className={`${primaryBtn} dt:col-span-3`}>
            新增供應商
          </button>
        </form>
      </details>

      {vendors.map((v) => {
        const accounts = staff.filter((s) => s.vendor_id === v.id);
        const vSets = sets.filter((s) => s.vendor_id === v.id);
        return (
          <article key={v.id} className={`flex flex-col gap-4 border bg-white p-4 ${v.active ? "border-line" : "border-dashed border-line-2 opacity-80"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 font-serif text-[20px] font-normal text-ink">
                {v.name}
                {!v.active && <span className="ml-2 text-[13px] text-rose-deep">（已停用）</span>}
              </h2>
              <form action={setVendorActive}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="active" value={v.active ? "false" : "true"} />
                <ConfirmSubmit
                  className={smallBtn}
                  message={v.active ? `確定停用「${v.name}」？帳號將無法看到預約，綁定的體驗會暫停線上預約。` : `確定重新啟用「${v.name}」？`}
                >
                  {v.active ? "停用" : "啟用"}
                </ConfirmSubmit>
              </form>
            </div>
            <p className="m-0 text-[14px] text-muted">負責體驗：{vSets.length ? vSets.map((s) => s.name).join("、") : "尚未綁定"}</p>

            <form action={updateVendor} className="grid gap-3 dt:grid-cols-[1fr_1fr_1fr_auto]">
              <input type="hidden" name="id" value={v.id} />
              <label className="flex flex-col gap-1 text-[13px] text-body">
                名稱
                <input name="name" required defaultValue={v.name} maxLength={120} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-body">
                聯絡 Email
                <input name="contact_email" type="email" defaultValue={v.contact_email ?? ""} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-body">
                電話
                <input name="phone" type="tel" defaultValue={v.phone ?? ""} className={inputCls} />
              </label>
              <button type="submit" className={`${smallBtn} self-end`}>
                儲存
              </button>
            </form>

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <span className="text-[14px] text-body">登入帳號</span>
              {accounts.length === 0 && <span className="text-[14px] text-muted">尚未建立</span>}
              {accounts.map((a) => (
                <div key={a.user_id} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                  <span className={`break-all ${a.active ? "text-ink" : "text-muted line-through"}`}>{a.email}</span>
                  <form action={setStaffActive}>
                    <input type="hidden" name="user_id" value={a.user_id} />
                    <input type="hidden" name="active" value={a.active ? "false" : "true"} />
                    <ConfirmSubmit className={smallBtn} message={a.active ? `停用 ${a.email} 的後台存取？` : `重新啟用 ${a.email}？`}>
                      {a.active ? "停用帳號" : "啟用帳號"}
                    </ConfirmSubmit>
                  </form>
                </div>
              ))}
              <form action={createVendorLogin} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="vendor_id" value={v.id} />
                <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[13px] text-body">
                  新增登入 Email
                  <input name="email" type="email" required className={inputCls} />
                </label>
                <button type="submit" className={smallBtn}>
                  建立帳號
                </button>
              </form>
            </div>
          </article>
        );
      })}
    </Shell>
  );
}

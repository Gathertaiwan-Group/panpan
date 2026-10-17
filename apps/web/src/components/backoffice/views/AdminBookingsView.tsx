import Link from "next/link";
import { ConfirmSubmit } from "@/components/backoffice/ConfirmSubmit";
import { Flash, Shell } from "@/components/backoffice/Shell";
import { inputCls, money, primaryBtn, smallBtn } from "@/components/booking/ui";
import { bookingAction } from "@/app/admin/actions";
import { ADMIN_NAV } from "@/app/admin/nav";
import { attentionLabel } from "@/lib/booking/labels";
import { publicStatus } from "@/lib/booking/public-status";
import { formatTaipeiDisplay, taipeiTime } from "@/lib/booking/time";

const STATUS_LABEL: Record<string, string> = {
  pending: "待付款",
  confirmed: "已確認",
  expired: "已逾時",
  cancelled: "已取消",
  refunded: "已退款",
};

export type AdminSearch = { status?: string; vendor?: string; from?: string; to?: string; attention?: string; page?: string; msg?: string; err?: string };
export type AdminBookingRow = {
  id: string;
  order_no: string;
  set_name: string;
  vendor_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  pay_method: string;
  amount: number;
  hold_expires_at: string | null;
  customer_name: string;
  phone: string;
  email: string;
  note: string | null;
  needs_attention: boolean;
  attention_reason: string | null;
  admin_note: string | null;
  created_at: string;
  payments: Array<{ status: string; gateway_order_id: string; pay_type: string | null }>;
};

export function AdminBookingsView({
  who,
  sp,
  vendors,
  rows,
  count,
  page,
  pages,
  attentionCount,
  loadError,
}: {
  who: string;
  sp: AdminSearch;
  vendors: Array<{ id: string; name: string }>;
  rows: AdminBookingRow[];
  count: number;
  page: number;
  pages: number;
  attentionCount: number;
  loadError?: string;
}) {
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    for (const k of ["status", "vendor", "from", "to", "attention"] as const) if (sp[k]) s.set(k, sp[k] as string);
    s.set("page", String(p));
    return `/admin?${s.toString()}`;
  };
  return (
    <Shell eyebrow="ADMIN" title="全部預約" who={who} nav={ADMIN_NAV} active="/admin">
      <Flash msg={sp.msg} err={sp.err || loadError} />
      {attentionCount > 0 && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-rose bg-[#fbeeea] px-4 py-3 text-[15px] text-rose-deep">
          <span>有 {attentionCount} 筆預約需要人工處理（多半需要退款）。</span>
          <Link href="/admin?attention=1" className={smallBtn}>
            只看這些
          </Link>
        </div>
      )}

      <form method="get" className="grid grid-cols-2 gap-3 border border-line bg-white p-4 dt:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-[13px] text-body">
          狀態
          <select name="status" defaultValue={sp.status ?? ""} className={inputCls}>
            <option value="">全部</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-body">
          供應商
          <select name="vendor" defaultValue={sp.vendor ?? ""} className={inputCls}>
            <option value="">全部</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-body">
          從（體驗日）
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-body">
          到
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputCls} />
        </label>
        <div className="col-span-2 flex items-end gap-3 dt:col-span-1">
          {sp.attention === "1" && <input type="hidden" name="attention" value="1" />}
          <button type="submit" className={`${primaryBtn} flex-1 px-5`}>
            篩選
          </button>
          <Link href="/admin" className={smallBtn}>
            清除
          </Link>
        </div>
      </form>

      <p className="m-0 text-[14px] text-muted">共 {count} 筆{sp.attention === "1" ? "（需人工處理）" : ""}</p>

      <div className="flex flex-col gap-3">
        {rows.map((b) => {
          const st = publicStatus(b);
          const pay = b.payments?.[0];
          const paid = b.payments?.some((p) => p.status === "paid");
          return (
            <article
              key={b.id}
              className={`flex flex-col gap-3 border bg-white p-4 ${b.needs_attention ? "border-rose" : "border-line"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif text-[17px] text-ink">
                  {formatTaipeiDisplay(new Date(b.starts_at))}–{taipeiTime(new Date(b.ends_at))}
                </span>
                <span className="flex flex-wrap gap-2 text-[12px] tracking-[.08em]">
                  <span className={`border px-2 py-[2px] ${st === "confirmed" ? "border-rose text-rose-deep" : "border-line-2 text-muted"}`}>
                    {STATUS_LABEL[st]}
                  </span>
                  {paid && <span className="border border-gold-line px-2 py-[2px] text-gold">已收款</span>}
                </span>
              </div>
              {b.needs_attention && (
                <p className="m-0 bg-[#fbeeea] px-3 py-2 text-[14px] text-rose-deep">⚠️ {attentionLabel(b.attention_reason)}</p>
              )}
              <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[14px] leading-[1.7]">
                <dt className="text-muted">體驗</dt>
                <dd className="m-0 text-ink">
                  {b.set_name}（{vendorName.get(b.vendor_id) ?? "—"}）
                </dd>
                <dt className="text-muted">客人</dt>
                <dd className="m-0 break-all text-ink">
                  {b.customer_name}・{b.phone}・{b.email}
                </dd>
                <dt className="text-muted">金額</dt>
                <dd className="m-0 text-ink">
                  {money(b.amount)}・{b.pay_method === "atm" ? "ATM" : "信用卡"}・付款 {pay?.status ?? "—"}
                </dd>
                <dt className="text-muted">訂單</dt>
                <dd className="m-0 break-all text-ink">{b.order_no}</dd>
                {b.note && (
                  <>
                    <dt className="text-muted">備註</dt>
                    <dd className="m-0 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">{b.note}</dd>
                  </>
                )}
                {b.admin_note && (
                  <>
                    <dt className="text-muted">處理紀錄</dt>
                    <dd className="m-0 [overflow-wrap:anywhere] whitespace-pre-wrap text-muted">{b.admin_note}</dd>
                  </>
                )}
              </dl>
              <form action={bookingAction} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="return" value="/admin" />
                <input name="note" placeholder="處理備註（選填）" maxLength={500} className={`${inputCls} min-w-[180px] flex-1`} />
                {(b.status === "pending_payment" || b.status === "confirmed") && (
                  <ConfirmSubmit
                    className={smallBtn}
                    name="action"
                    value="cancel"
                    message={b.status === "confirmed" ? "確定要取消這筆已付款的預約？（退款需另外到 PChomePay 後台辦理）" : "確定要取消這筆預約？"}
                  >
                    標記已取消
                  </ConfirmSubmit>
                )}
                {paid && ["confirmed", "cancelled", "expired"].includes(b.status) && (
                  <ConfirmSubmit className={smallBtn} name="action" value="refund" message="確定已在 PChomePay 後台完成退款？">
                    標記已退款
                  </ConfirmSubmit>
                )}
                {b.needs_attention && (
                  <ConfirmSubmit className={smallBtn} name="action" value="resolve" message="確定這筆已處理完成？">
                    標記已處理
                  </ConfirmSubmit>
                )}
              </form>
            </article>
          );
        })}
        {rows.length === 0 && <p className="m-0 border border-dashed border-line-2 p-6 text-center text-muted">沒有符合條件的預約。</p>}
      </div>

      <nav aria-label="分頁" className="flex items-center justify-between gap-3">
        {page > 1 ? <Link href={qs(page - 1)} className={smallBtn}>← 上一頁</Link> : <span />}
        <span className="text-[14px] text-muted">
          {page} / {pages}
        </span>
        {page < pages ? <Link href={qs(page + 1)} className={smallBtn}>下一頁 →</Link> : <span />}
      </nav>
    </Shell>
  );
}

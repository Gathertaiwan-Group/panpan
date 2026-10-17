import "server-only";
import { SITE_URL } from "../env";
import { adminDb } from "../server/admin-db";
import { buildIcs } from "./ics";
import { attentionLabel, shouldSendConfirmation } from "./labels";
import { sendMail, type MailResult } from "./mail";
import { getBookingById, getVendorContact, type BookingRecord } from "./repo";
import { formatTaipeiDisplay, taipeiTime } from "./time";

// 付款確認後的通知信（客人／供應商／管理員）。
// 「只寄一次」：先以條件式 update 搶下 *_sent_at（where … is null），搶到的才寄；寄失敗或 dry-run 就放回 null。
// 因此 notify 重送、付款結果頁輪詢、併發呼叫都不會重複寄信（Resend 另有 Idempotency-Key 兜底）。

type Kind = "customer" | "vendor" | "admin";
const COLUMN: Record<Kind, "customer_email_sent_at" | "vendor_email_sent_at" | "admin_email_sent_at"> = {
  customer: "customer_email_sent_at",
  vendor: "vendor_email_sent_at",
  admin: "admin_email_sent_at",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

const money = (n: number) => `NT$${n.toLocaleString("en-US")}`;

function frame(title: string, inner: string): string {
  return `<div style="font-family:'Noto Sans TC',-apple-system,sans-serif;color:#4A3532;max-width:520px;margin:0 auto;padding:32px 24px;background:#FFF9F5">
<p style="font-size:20px;letter-spacing:.2em;color:#A8463F;margin:0 0 4px">朵朵曉語</p>
<p style="font-size:11px;letter-spacing:.3em;color:#775A55;margin:0 0 28px">DUODUO WHISPERS</p>
<h1 style="font-size:18px;font-weight:500;letter-spacing:.1em;margin:0 0 18px">${esc(title)}</h1>
${inner}
</div>`;
}

function rows(list: Array<[string, string]>): string {
  return `<table style="border-collapse:collapse;font-size:15px;line-height:1.8;margin:0 0 18px">${list
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 18px 4px 0;color:#775A55;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;color:#4A3532">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

function when(b: BookingRecord): string {
  return `${formatTaipeiDisplay(new Date(b.starts_at))}–${taipeiTime(new Date(b.ends_at))}`;
}

function statusUrl(b: BookingRecord): string {
  return `${SITE_URL}/booking/${encodeURIComponent(b.order_no)}?t=${encodeURIComponent(b.access_token)}`;
}

/** 會員專區的預約詳情（未登入 → /login?next=… 登入後回跳） */
function accountUrl(b: BookingRecord): string {
  return `${SITE_URL}/account/bookings/${encodeURIComponent(b.id)}`;
}

function customerMail(b: BookingRecord) {
  const html = frame(
    "預約已確認",
    `<p style="font-size:15px;line-height:1.9;margin:0 0 18px">${esc(b.customer_name)} 您好，謝謝妳把這段時間留給自己。我們已收到款項，這次的預約已經確認：</p>
${rows([
  ["體驗", b.set_name],
  ["日期時間", when(b)],
  ["地點", "供應商將於體驗前與妳聯繫，確認地點與細節"],
  ["金額", `${money(b.amount)}（已付清）`],
  ["訂單編號", b.order_no],
])}
<p style="margin:24px 0"><a href="${statusUrl(b)}" style="background:#B9524C;color:#FFFFFF;padding:14px 28px;text-decoration:none;letter-spacing:.16em;font-size:14px">查看預約</a></p>
<p style="font-size:13px;color:#775A55;line-height:1.8;margin:0 0 12px">附件為行事曆檔（.ics），可直接加入手機行事曆。若需要改期或取消，請直接回覆這封信與我們聯繫。</p>
<p style="font-size:13px;color:#775A55;line-height:1.8;margin:0">會員專區：<a href="${accountUrl(b)}" style="color:#A8463F">查看我的預約</a>（還沒有帳號？用這個 Email <a href="${SITE_URL}/register" style="color:#A8463F">註冊</a>，預約會自動出現在會員專區）</p>`,
  );
  const text = `${b.customer_name} 您好，預約已確認。\n體驗：${b.set_name}\n日期時間：${when(b)}\n地點：供應商將於體驗前與妳聯繫\n金額：${money(b.amount)}（已付清）\n訂單編號：${b.order_no}\n查看預約：${statusUrl(b)}\n會員專區：${accountUrl(b)}`;
  const ics = buildIcs({
    uid: `${b.order_no}@duoduo-whispers`,
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    summary: `朵朵曉語｜${b.set_name}`,
    description: `訂單編號 ${b.order_no}\n地點：供應商將於體驗前與妳聯繫\n${statusUrl(b)}`,
  });
  return {
    subject: `預約已確認｜${b.set_name} ${formatTaipeiDisplay(new Date(b.starts_at))}`,
    html,
    text,
    attachments: [
      { filename: "duoduo-booking.ics", content: Buffer.from(ics, "utf8").toString("base64"), contentType: "text/calendar" },
    ],
  };
}

function vendorMail(b: BookingRecord, vendorName: string) {
  const html = frame(
    "新預約通知",
    `<p style="font-size:15px;line-height:1.9;margin:0 0 18px">${esc(vendorName)} 您好，有一筆新的預約已完成付款，請於體驗前主動與客人聯繫確認地點與細節：</p>
${rows([
  ["體驗", b.set_name],
  ["日期時間", when(b)],
  ["客人", b.customer_name],
  ["電話", b.phone],
  ["備註", b.note || "—"],
])}
<p style="margin:24px 0"><a href="${SITE_URL}/vendor" style="background:#B9524C;color:#FFFFFF;padding:14px 28px;text-decoration:none;letter-spacing:.16em;font-size:14px">打開供應商後台</a></p>`,
  );
  return { subject: `新預約｜${b.set_name} ${formatTaipeiDisplay(new Date(b.starts_at))}`, html };
}

function adminMail(b: BookingRecord) {
  const html = frame(
    "新預約（已付款）",
    `${rows([
      ["訂單編號", b.order_no],
      ["體驗", b.set_name],
      ["日期時間", when(b)],
      ["客人", `${b.customer_name}／${b.phone}／${b.email}`],
      ["金額", money(b.amount)],
      ["付款方式", b.pay_method === "atm" ? "ATM 轉帳" : "信用卡"],
      ["備註", b.note || "—"],
    ])}
<p style="margin:24px 0"><a href="${SITE_URL}/admin" style="color:#A8463F">到管理後台查看</a></p>`,
  );
  return { subject: `新預約已付款｜${b.order_no} ${b.set_name}`, html };
}

async function claim(bookingId: string, kind: Kind): Promise<boolean> {
  const col = COLUMN[kind];
  const { data, error } = await adminDb()
    .from("bookings")
    .update({ [col]: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "confirmed")
    // 防線：開始後才付款／時段被佔等需人工處理者不搶（與 shouldSendConfirmation 一致）
    .or("needs_attention.eq.false,attention_reason.is.null,attention_reason.not.in.(paid_after_start,paid_after_expiry_slot_taken,paid_after_expiry_past)")
    .is(col, null)
    .select("id");
  if (error) {
    console.error(`[emails] claim ${kind} 失敗:`, error.message);
    return false;
  }
  return (data ?? []).length === 1;
}

async function release(bookingId: string, kind: Kind) {
  await adminDb().from("bookings").update({ [COLUMN[kind]]: null }).eq("id", bookingId);
}

async function deliver(bookingId: string, kind: Kind, send: () => Promise<MailResult>): Promise<MailResult | "skipped"> {
  if (!(await claim(bookingId, kind))) return "skipped";
  const r = await send();
  if (r !== "sent") await release(bookingId, kind);
  return r;
}

/** 確認後的三封信（冪等；可重複呼叫） */
export async function ensureBookingEmails(bookingId: string): Promise<Record<Kind, MailResult | "skipped">> {
  const b = await getBookingById(bookingId);
  const out: Record<Kind, MailResult | "skipped"> = { customer: "skipped", vendor: "skipped", admin: "skipped" };
  // 未確認、或屬「開始後才付款／時段已被佔」等需人工處理者 → 不寄確認信（管理員另有人工處理通知）
  if (!b || !shouldSendConfirmation(b)) return out;

  if (!b.customer_email_sent_at) {
    const m = customerMail(b);
    out.customer = await deliver(b.id, "customer", () =>
      sendMail({ to: b.email, ...m, idempotencyKey: `dd-booking-${b.id}-customer` }),
    );
  }
  if (!b.vendor_email_sent_at) {
    const v = await getVendorContact(b.vendor_id);
    if (v?.contact_email) {
      const m = vendorMail(b, v.name);
      out.vendor = await deliver(b.id, "vendor", () =>
        sendMail({ to: v.contact_email as string, ...m, idempotencyKey: `dd-booking-${b.id}-vendor` }),
      );
    }
  }
  const adminTo = process.env.ADMIN_NOTIFY_EMAIL;
  if (!b.admin_email_sent_at && adminTo) {
    const m = adminMail(b);
    out.admin = await deliver(b.id, "admin", () =>
      sendMail({ to: adminTo, ...m, replyTo: b.email, idempotencyKey: `dd-booking-${b.id}-admin` }),
    );
  }
  return out;
}

/** 需人工處理（多半是要退款）→ 通知管理員；同一預約同一原因只寄一次（Idempotency-Key） */
export async function sendAttentionAlert(bookingId: string, reason: string): Promise<MailResult | "skipped"> {
  const adminTo = process.env.ADMIN_NOTIFY_EMAIL;
  const b = await getBookingById(bookingId);
  if (!b) return "skipped";
  console.error(`[booking] ⚠️ 需人工處理：order=${b.order_no} reason=${reason}`);
  if (!adminTo) return "skipped";
  const html = frame(
    "⚠️ 預約需要人工處理",
    `<p style="font-size:15px;line-height:1.9;margin:0 0 18px;color:#A8463F">${esc(attentionLabel(reason))}</p>
${rows([
  ["訂單編號", b.order_no],
  ["體驗", b.set_name],
  ["日期時間", when(b)],
  ["客人", `${b.customer_name}／${b.phone}／${b.email}`],
  ["金額", money(b.amount)],
  ["目前狀態", b.status],
])}
<p style="font-size:14px;line-height:1.8">如需退款，請至 PChomePay 支付連後台辦理，完成後在管理後台將此筆標記為「已退款」。</p>
<p style="margin:24px 0"><a href="${SITE_URL}/admin?attention=1" style="color:#A8463F">到管理後台查看</a></p>`,
  );
  const r = await sendMail({
    to: adminTo,
    subject: `⚠️ 需人工處理｜${b.order_no}｜${attentionLabel(reason)}`,
    html,
    idempotencyKey: `dd-attention-${b.id}-${reason}`,
  });
  if (r === "sent") {
    await adminDb().from("bookings").update({ attention_email_sent_at: new Date().toISOString() }).eq("id", b.id);
  }
  return r;
}

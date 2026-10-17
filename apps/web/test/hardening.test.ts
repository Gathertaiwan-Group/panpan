import { describe, expect, it } from "vitest";
import { checkSlot, excludeOwnHold, type ScheduleInput } from "@/lib/booking/availability";
import { shouldSendConfirmation } from "@/lib/booking/labels";
import { clientIp, hashIp } from "@/lib/booking/ratelimit";
import { reconcileOrder, type ReconcileDeps } from "@/lib/booking/reconcile";
import { fromTaipei } from "@/lib/booking/time";
import { normalizeEmail, normalizeMobile } from "@/lib/booking/validation";

const NOW = new Date("2026-10-17T13:30:00Z");

describe("#1 IP 限流：取 IP 與雜湊", () => {
  it("x-forwarded-for 取第一段，其次 x-real-ip，都沒有 → unknown", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "x-real-ip": "198.51.100.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
    expect(clientIp(new Headers())).toBe("unknown");
  });
  it("只存 sha256（64 碼 hex），不含原始 IP；同 IP 同雜湊、不同 IP 不同", () => {
    const h = hashIp("203.0.113.7");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("203");
    expect(hashIp("203.0.113.7")).toBe(h);
    expect(hashIp("203.0.113.8")).not.toBe(h);
  });
});

describe("#2 預檢查排除客人自己同時段的未付款保留", () => {
  const start = fromTaipei("2026-10-25", "14:00");
  const mine = {
    status: "pending_payment",
    startsAt: start,
    endsAt: new Date(start.getTime() + 2 * 3600_000),
    holdExpiresAt: new Date(NOW.getTime() + 10 * 60_000),
    emailNorm: "me@example.com",
    phoneNorm: "0912345678",
  };
  const input: ScheduleInput = {
    now: NOW,
    durationMinutes: 120,
    weekly: [{ weekday: 0, time: "14:00" }], // 10/25 是週日
    overrides: [],
    busy: [mine],
  };
  it("沒排除時自己的保留會擋住自己（原本的 bug）", () => {
    expect(checkSlot("2026-10-25", "14:00", input)).toEqual({ ok: false });
  });
  it("Email 與電話都相同（正規化後）→ 排除，可重新下單", () => {
    const own = excludeOwnHold(input, start, normalizeEmail(" ME@example.com "), normalizeMobile("+886 912-345-678"));
    expect(checkSlot("2026-10-25", "14:00", own).ok).toBe(true);
  });
  it("只有 Email 或只有電話相同 → 不排除（別人的保留仍擋）", () => {
    expect(checkSlot("2026-10-25", "14:00", excludeOwnHold(input, start, "me@example.com", "0999999999")).ok).toBe(false);
    expect(checkSlot("2026-10-25", "14:00", excludeOwnHold(input, start, "x@example.com", "0912345678")).ok).toBe(false);
  });
  it("已確認的預約不排除；不同開始時間不排除", () => {
    const confirmed = { ...input, busy: [{ ...mine, status: "confirmed", holdExpiresAt: null }] };
    expect(checkSlot("2026-10-25", "14:00", excludeOwnHold(confirmed, start, "me@example.com", "0912345678")).ok).toBe(false);
    const other = excludeOwnHold(input, fromTaipei("2026-10-25", "13:00"), "me@example.com", "0912345678");
    expect(checkSlot("2026-10-25", "14:00", other).ok).toBe(false);
  });
});

function deps(statusCode: string, bookingStatus = "pending_payment") {
  const st = { payment: "init", failedCalls: 0 };
  const d: ReconcileDeps = {
    findPayment: async () => ({ status: st.payment, amount: 3600, bookingId: "b1" }),
    query: async () => ({ status_code: statusCode, amount: 3600, raw: {} }),
    markPaid: async () => ({ result: "already_paid", transitioned: false, attention_new: false, booking_status: bookingStatus }),
    recordAtm: async () => {},
    markFailed: async () => {
      st.failedCalls++;
      st.payment = "failed";
    },
    ensureEmails: async () => {},
    alertAttention: async () => {},
  };
  return { st, d };
}

describe("#3 失敗狀態只依伺服器回查", () => {
  it("偽造 notify_type=order_expired、回查仍是待付款 → 不標 failed", async () => {
    const { st, d } = deps("W");
    expect(await reconcileOrder("DD261017ABCDEF", "order_expired", d)).toEqual({ http: 200, outcome: "pending" });
    expect(st.failedCalls).toBe(0);
    expect(st.payment).toBe("init");
  });
  it("回查 status_code=F → 才標 failed", async () => {
    const { st, d } = deps("F");
    expect((await reconcileOrder("DD261017ABCDEF", null, d)).outcome).toBe("failed");
    expect(st.failedCalls).toBe(1);
  });
});

describe("#5 開始後才付款／時段被佔者不寄確認信", () => {
  it("一般已確認 → 寄；已確認但只是重複付款等其他原因 → 仍寄（確認本身有效）", () => {
    expect(shouldSendConfirmation({ status: "confirmed", needs_attention: false, attention_reason: null })).toBe(true);
    expect(shouldSendConfirmation({ status: "confirmed", needs_attention: true, attention_reason: "duplicate_payment" })).toBe(true);
  });
  it("paid_after_start／時段被佔／逾時已過 → 不寄", () => {
    for (const r of ["paid_after_start", "paid_after_expiry_slot_taken", "paid_after_expiry_past"]) {
      expect(shouldSendConfirmation({ status: "confirmed", needs_attention: true, attention_reason: r })).toBe(false);
    }
  });
  it("管理員處理完（needs_attention=false）才會補寄；未確認一律不寄", () => {
    expect(shouldSendConfirmation({ status: "confirmed", needs_attention: false, attention_reason: "paid_after_start" })).toBe(true);
    expect(shouldSendConfirmation({ status: "expired", needs_attention: true, attention_reason: "paid_after_expiry_slot_taken" })).toBe(false);
    expect(shouldSendConfirmation({ status: "pending_payment", needs_attention: false, attention_reason: null })).toBe(false);
  });
  it("notify 重送（already_paid）時，對 paid_after_start 的預約 ensureEmails 不寄任何信", async () => {
    const sent: string[] = [];
    const booking = { status: "confirmed", needs_attention: true, attention_reason: "paid_after_start" };
    const { d } = deps("S", "confirmed");
    d.ensureEmails = async () => {
      if (shouldSendConfirmation(booking)) sent.push("customer", "vendor", "admin");
    };
    await reconcileOrder("DD261017ABCDEF", "order_confirm", d);
    await reconcileOrder("DD261017ABCDEF", "order_confirm", d);
    expect(sent).toEqual([]);
  });
});

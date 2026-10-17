import { describe, expect, it, vi } from "vitest";
import {
  parseGatewayDate,
  reconcileOrder,
  type GatewayResult,
  type MarkPaidResult,
  type ReconcileDeps,
} from "@/lib/booking/reconcile";

/**
 * 假的 DB：行為比照 panpan.mark_booking_paid（for update、冪等、金額不符不轉換）
 * ＋ emails 的「條件式搶 *_sent_at 才寄」。
 */
function fakeStore(opts: { amount?: number; gateway: () => GatewayResult | null }) {
  const amount = opts.amount ?? 3600;
  const state = {
    payment: { status: "init" as "init" | "paid" | "failed", amount },
    booking: { status: "pending_payment", needsAttention: false, reason: null as string | null },
    sentAt: { customer: null as number | null, vendor: null as number | null, admin: null as number | null },
    mails: [] as string[],
    alerts: [] as string[],
    markCalls: 0,
  };
  const deps: ReconcileDeps = {
    findPayment: async (orderId) =>
      orderId === "DD261017ABCDEF" ? { status: state.payment.status, amount: state.payment.amount, bookingId: "b1" } : null,
    query: async () => opts.gateway(),
    markPaid: async (_o, amt): Promise<MarkPaidResult> => {
      state.markCalls++;
      if (state.payment.status === "paid") {
        return { result: "already_paid", transitioned: false, attention_new: false, booking_id: "b1", booking_status: state.booking.status };
      }
      if (amt !== state.payment.amount) {
        const isNew = state.booking.reason !== "amount_mismatch";
        state.booking.needsAttention = true;
        state.booking.reason = "amount_mismatch";
        return { result: "amount_mismatch", reason: "amount_mismatch", transitioned: false, attention_new: isNew, booking_id: "b1", booking_status: state.booking.status };
      }
      state.payment.status = "paid";
      state.booking.status = "confirmed";
      return { result: "confirmed", transitioned: true, attention_new: false, booking_id: "b1", booking_status: "confirmed" };
    },
    recordAtm: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {
      if (state.payment.status === "init") state.payment.status = "failed";
    }),
    ensureEmails: async () => {
      if (state.booking.status !== "confirmed") return;
      for (const k of ["customer", "vendor", "admin"] as const) {
        if (state.sentAt[k] === null) {
          state.sentAt[k] = Date.now();
          state.mails.push(k);
        }
      }
    },
    alertAttention: async (_b, reason) => {
      state.alerts.push(reason);
    },
  };
  return { state, deps };
}

const ORDER = "DD261017ABCDEF";
const paid = (amount = 3600): GatewayResult => ({ status_code: "S", pay_type: "CARD", amount, raw: {} });

describe("PChomePay notify 對帳", () => {
  it("已付 → confirmed，三封信各寄一次", async () => {
    const { state, deps } = fakeStore({ gateway: () => paid() });
    const r = await reconcileOrder(ORDER, "order_confirm", deps);
    expect(r).toEqual({ http: 200, outcome: "confirmed" });
    expect(state.booking.status).toBe("confirmed");
    expect(state.mails).toEqual(["customer", "vendor", "admin"]);
  });

  it("重複 notify 冪等：不再轉換、不重寄信", async () => {
    const { state, deps } = fakeStore({ gateway: () => paid() });
    await reconcileOrder(ORDER, "order_confirm", deps);
    const r2 = await reconcileOrder(ORDER, "order_confirm", deps);
    const r3 = await reconcileOrder(ORDER, null, deps);
    expect(r2).toEqual({ http: 200, outcome: "already_paid" });
    expect(r3).toEqual({ http: 200, outcome: "already_paid" });
    expect(state.mails).toEqual(["customer", "vendor", "admin"]);
  });

  it("status_code 00 與 1 也視為已付", async () => {
    for (const code of ["00", "1"]) {
      const { state, deps } = fakeStore({ gateway: () => ({ ...paid(), status_code: code }) });
      expect((await reconcileOrder(ORDER, "order_confirm", deps)).outcome).toBe("confirmed");
      expect(state.booking.status).toBe("confirmed");
    }
  });

  it("金額不符 → 不轉換、不寄確認信、通知管理員一次", async () => {
    const { state, deps } = fakeStore({ gateway: () => paid(30) });
    const r = await reconcileOrder(ORDER, "order_confirm", deps);
    expect(r).toEqual({ http: 200, outcome: "amount_mismatch" });
    expect(state.booking.status).toBe("pending_payment");
    expect(state.payment.status).toBe("init");
    expect(state.mails).toEqual([]);
    await reconcileOrder(ORDER, "order_confirm", deps);
    expect(state.alerts).toEqual(["amount_mismatch"]);
  });

  it("回查失敗 → 500（讓 PChomePay 重送），不動 DB", async () => {
    const { state, deps } = fakeStore({ gateway: () => null });
    const r = await reconcileOrder(ORDER, "order_confirm", deps);
    expect(r).toEqual({ http: 500, outcome: "query_failed" });
    expect(state.markCalls).toBe(0);
    expect(state.booking.status).toBe("pending_payment");
  });

  it("回查已付但缺金額 → 500", async () => {
    const { state, deps } = fakeStore({ gateway: () => ({ status_code: "S", raw: {} }) });
    expect(await reconcileOrder(ORDER, "order_confirm", deps)).toEqual({ http: 500, outcome: "amount_missing" });
    expect(state.markCalls).toBe(0);
  });

  it("DB 標記失敗 → 500", async () => {
    const { deps } = fakeStore({ gateway: () => paid() });
    deps.markPaid = async () => null;
    expect(await reconcileOrder(ORDER, "order_confirm", deps)).toEqual({ http: 500, outcome: "db_failed" });
  });

  it("notify payload 不可信：notify 說已付但回查未付 → 不標記", async () => {
    const { state, deps } = fakeStore({ gateway: () => ({ status_code: "W", amount: 3600, raw: {} }) });
    const r = await reconcileOrder(ORDER, "order_confirm", deps);
    expect(r).toEqual({ http: 200, outcome: "pending" });
    expect(state.markCalls).toBe(0);
    expect(state.booking.status).toBe("pending_payment");
  });

  it("不認得的訂單 → 200 略過", async () => {
    const { deps } = fakeStore({ gateway: () => paid() });
    expect(await reconcileOrder("DD000000XXXXXX", "order_confirm", deps)).toEqual({ http: 200, outcome: "unknown_order" });
  });

  it("ATM 取號 → 記錄帳號與繳費期限", async () => {
    const { deps } = fakeStore({
      gateway: () => ({
        status_code: "W",
        amount: 3600,
        payment_info: { bank_code: "822", virtual_account: "1234567890123456", expire_date: "2026/10/19 23:59:59" },
        raw: {},
      }),
    });
    expect((await reconcileOrder(ORDER, "order_confirm", deps)).outcome).toBe("atm_issued");
    expect(deps.recordAtm).toHaveBeenCalledWith(
      ORDER,
      { bankCode: "822", account: "1234567890123456", expireAt: new Date("2026-10-19T15:59:59Z") },
      expect.any(Object),
    );
  });

  it("失效 → 只把 init 標成 failed", async () => {
    const { state, deps } = fakeStore({ gateway: () => ({ status_code: "F", raw: {} }) });
    expect((await reconcileOrder(ORDER, "order_expired", deps)).outcome).toBe("failed");
    expect(state.payment.status).toBe("failed");
  });
});

describe("parseGatewayDate", () => {
  it("各種格式皆以台北時間解析", () => {
    expect(parseGatewayDate("2026/10/19 23:59:59")?.toISOString()).toBe("2026-10-19T15:59:59.000Z");
    expect(parseGatewayDate("2026-10-19")?.toISOString()).toBe("2026-10-19T15:59:59.000Z");
    expect(parseGatewayDate("20261019120000")?.toISOString()).toBe("2026-10-19T04:00:00.000Z");
    expect(parseGatewayDate("not a date")).toBeNull();
  });
});

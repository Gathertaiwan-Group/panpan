import { describe, expect, it } from "vitest";
import { splitBookings, withView, type MyBookingRow } from "@/lib/account/view";
import { STATUS_LABEL, paymentLabel } from "@/lib/booking/status-labels";

const now = new Date("2026-10-18T04:00:00Z");
const row = (o: Partial<MyBookingRow>): MyBookingRow => ({
  id: o.id ?? "x",
  order_no: "DD1",
  set_id: "s",
  set_name: "體驗",
  set_slug: "set",
  vendor_name: "V",
  vendor_phone: null,
  vendor_email: null,
  starts_at: "2026-10-20T02:00:00Z",
  ends_at: "2026-10-20T04:00:00Z",
  status: "confirmed",
  hold_expires_at: null,
  pay_method: "card",
  amount: 6800,
  customer_name: "客人",
  payment_status: "paid",
  paid_at: null,
  created_at: "2026-10-01T00:00:00Z",
  ...o,
});

describe("預約狀態中文（集中對照）", () => {
  it("五種狀態", () => {
    expect(STATUS_LABEL).toEqual({ pending: "待付款", confirmed: "已確認", cancelled: "已取消", refunded: "已退款", expired: "已逾時" });
  });
  it("待付款但保留已過 → 已逾時", () => {
    const [b] = withView([row({ status: "pending_payment", hold_expires_at: "2026-10-18T03:00:00Z" })], now);
    expect(b!.view).toBe("expired");
    const [c] = withView([row({ status: "pending_payment", hold_expires_at: "2026-10-18T05:00:00Z" })], now);
    expect(c!.view).toBe("pending");
  });
  it("付款狀態", () => {
    expect(paymentLabel("paid", "confirmed")).toBe("已付款");
    expect(paymentLabel("init", "pending")).toBe("尚未付款");
    expect(paymentLabel("init", "expired")).toBe("未付款");
  });
});

describe("即將到來／歷史紀錄", () => {
  it("分組與排序", () => {
    const rows = withView(
      [
        row({ id: "future2", starts_at: "2026-10-25T02:00:00Z", ends_at: "2026-10-25T04:00:00Z" }),
        row({ id: "future1" }),
        row({ id: "past", starts_at: "2026-10-01T02:00:00Z", ends_at: "2026-10-01T04:00:00Z" }),
        row({ id: "cancelled", status: "cancelled", starts_at: "2026-10-30T02:00:00Z", ends_at: "2026-10-30T04:00:00Z" }),
        row({ id: "ongoing", starts_at: "2026-10-18T03:00:00Z", ends_at: "2026-10-18T05:00:00Z" }),
      ],
      now,
    );
    const { upcoming, history } = splitBookings(rows, now);
    expect(upcoming.map((b) => b.id)).toEqual(["ongoing", "future1", "future2"]);
    expect(history.map((b) => b.id)).toEqual(["cancelled", "past"]);
  });
});

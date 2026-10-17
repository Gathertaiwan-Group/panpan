import { describe, expect, it } from "vitest";
import {
  activeIntervals,
  allowedMonths,
  checkSlot,
  computeDay,
  computeMonth,
  holdExpiry,
  lastBookableDate,
  type ScheduleInput,
} from "@/lib/booking/availability";
import { fromTaipei, taipeiDate } from "@/lib/booking/time";

// 「現在」= 2026-10-17 21:30（台北）＝ 13:30Z
const NOW = new Date("2026-10-17T13:30:00Z");

function input(over: Partial<ScheduleInput> = {}): ScheduleInput {
  return {
    now: NOW,
    durationMinutes: 120,
    // 每天 10:00、14:00、20:00；週一（1）沒有
    weekly: [0, 2, 3, 4, 5, 6].flatMap((weekday) =>
      ["10:00", "14:00", "20:00"].map((time) => ({ weekday, time })),
    ),
    overrides: [],
    busy: [],
    ...over,
  };
}

describe("時區", () => {
  it("UTC 13:30 是台北 21:30、同一天；UTC 16:30 已是台北隔天", () => {
    expect(taipeiDate(NOW)).toBe("2026-10-17");
    expect(taipeiDate(new Date("2026-10-17T16:30:00Z"))).toBe("2026-10-18");
    expect(fromTaipei("2026-10-18", "10:00").toISOString()).toBe("2026-10-18T02:00:00.000Z");
  });
});

describe("24 小時前", () => {
  it("明天 20:00（22.5h 後）不可約、21:30 之後的時段可約", () => {
    // 10/18（週日）10:00／14:00／20:00 都在 24 小時內 → 整天視為已過
    const day = computeDay("2026-10-18", input());
    expect(day.status).toBe("past");
    expect(day.slots).toEqual([]);
    const day2 = computeDay("2026-10-18", input({ weekly: [{ weekday: 0, time: "21:00" }, { weekday: 0, time: "22:00" }] }));
    expect(day2.slots.map((s) => [s.time, s.available])).toEqual([
      ["21:00", false], // 23.5h 後
      ["22:00", true], // 24.5h 後
    ]);
    expect(day2.status).toBe("open");
  });
  it("今天與過去的日期為 past", () => {
    expect(computeDay("2026-10-17", input()).status).toBe("past");
    expect(computeDay("2026-10-01", input()).status).toBe("past");
  });
});

describe("60 天", () => {
  it("今天 + 60 天可約、+61 天為 beyond", () => {
    expect(lastBookableDate(NOW)).toBe("2026-12-16");
    expect(computeDay("2026-12-16", input()).status).toBe("open");
    expect(computeDay("2026-12-17", input()).status).toBe("beyond");
  });
  it("可瀏覽月份為 10、11、12 月", () => {
    expect(allowedMonths(NOW)).toEqual(["2026-10", "2026-11", "2026-12"]);
  });
  it("整月計算每天都有狀態", () => {
    const m = computeMonth("2026-12", input());
    expect(Object.keys(m)).toHaveLength(31);
    expect(m["2026-12-16"].status).toBe("open");
    expect(m["2026-12-31"].status).toBe("beyond");
  });
});

describe("請假／加開", () => {
  it("沒排班的週一為 closed、請假日 closed", () => {
    expect(computeDay("2026-10-26", input()).status).toBe("closed"); // 週一
    const d = computeDay("2026-10-27", input({ overrides: [{ date: "2026-10-27", closed: true, extraTimes: ["18:00"] }] }));
    expect(d.status).toBe("closed");
    expect(d.slots).toEqual([]);
  });
  it("加開時段併入並排序（含週一）", () => {
    const d = computeDay("2026-10-26", input({ overrides: [{ date: "2026-10-26", closed: false, extraTimes: ["18:30", "09:00"] }] }));
    expect(d.slots.map((s) => s.time)).toEqual(["09:00", "18:30"]);
    const d2 = computeDay("2026-10-27", input({ overrides: [{ date: "2026-10-27", closed: false, extraTimes: ["12:00", "14:00"] }] }));
    expect(d2.slots.map((s) => s.time)).toEqual(["10:00", "12:00", "14:00", "20:00"]);
  });
});

describe("已占用", () => {
  const busy = [
    // 10/28 10:00–12:00 已確認
    { status: "confirmed", startsAt: fromTaipei("2026-10-28", "10:00"), endsAt: fromTaipei("2026-10-28", "12:00"), holdExpiresAt: null },
    // 10/28 13:00–14:30 待付款、保留未逾時（另一個 SET）
    {
      status: "pending_payment",
      startsAt: fromTaipei("2026-10-28", "13:00"),
      endsAt: fromTaipei("2026-10-28", "14:30"),
      holdExpiresAt: new Date(NOW.getTime() + 10 * 60_000),
    },
    // 10/28 20:00 待付款但保留已逾時 → 視為已釋出
    {
      status: "pending_payment",
      startsAt: fromTaipei("2026-10-28", "20:00"),
      endsAt: fromTaipei("2026-10-28", "22:00"),
      holdExpiresAt: new Date(NOW.getTime() - 60_000),
    },
    // 已取消不占用
    { status: "cancelled", startsAt: fromTaipei("2026-10-29", "10:00"), endsAt: fromTaipei("2026-10-29", "12:00"), holdExpiresAt: null },
  ];
  it("重疊判斷依時長；逾時保留與取消不占用", () => {
    const d = computeDay("2026-10-28", input({ busy }));
    expect(d.slots.map((s) => [s.time, s.available])).toEqual([
      ["10:00", false],
      ["14:00", false], // 14:00–16:00 與 13:00–14:30 重疊
      ["20:00", true],
    ]);
    expect(computeDay("2026-10-29", input({ busy })).slots[0].available).toBe(true);
    expect(activeIntervals(busy, NOW)).toHaveLength(2);
  });
  it("時長較短時，緊接著前一筆結束的時段可約", () => {
    const d = computeDay("2026-10-28", input({ busy, weekly: [{ weekday: 3, time: "12:00" }, { weekday: 3, time: "11:00" }], durationMinutes: 60 }));
    expect(d.slots.map((s) => [s.time, s.available])).toEqual([
      ["11:00", false],
      ["12:00", true], // 12:00–13:00 剛好在兩筆之間
    ]);
  });
  it("全部被占用為 full", () => {
    const full = [{ status: "confirmed", startsAt: fromTaipei("2026-10-28", "09:00"), endsAt: fromTaipei("2026-10-28", "23:00"), holdExpiresAt: null }];
    expect(computeDay("2026-10-28", input({ busy: full })).status).toBe("full");
  });
});

describe("ATM 與保留", () => {
  it("72 小時內的時段不能用 ATM", () => {
    const d = computeDay("2026-10-20", input()); // 週二；10:00 是 60.5h 後、20:00 是 70.5h 後
    expect(d.slots.map((s) => [s.time, s.atm])).toEqual([
      ["10:00", false],
      ["14:00", false],
      ["20:00", false],
    ]);
    expect(computeDay("2026-10-21", input()).slots.map((s) => s.atm)).toEqual([true, true, true]);
    expect(checkSlot("2026-10-21", "10:00", input())).toEqual({ ok: true, atm: true });
    expect(checkSlot("2026-10-21", "11:00", input())).toEqual({ ok: false });
  });
  it("信用卡保留 15 分鐘；ATM 保留到 2 天後 23:59:59（台北），一定早於 72 小時後", () => {
    expect(holdExpiry("card", NOW).toISOString()).toBe("2026-10-17T13:45:00.000Z");
    const atm = holdExpiry("atm", NOW);
    expect(atm.toISOString()).toBe("2026-10-19T15:59:59.000Z");
    expect(atm.getTime()).toBeLessThan(NOW.getTime() + 72 * 3600_000);
    const early = new Date("2026-10-16T16:00:00Z"); // 台北 10/17 00:00
    expect(holdExpiry("atm", early).getTime()).toBeLessThan(early.getTime() + 72 * 3600_000);
  });
});

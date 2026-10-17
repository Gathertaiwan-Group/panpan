import { describe, expect, it } from "vitest";
import { accountRedirect } from "@/lib/auth/access";
import { newPasswordError, passwordError, postLoginTarget, safeNext } from "@/lib/auth/password";

describe("密碼規則（與 Supabase 設定一致：≥10 碼、英文字母＋數字）", () => {
  it("合格", () => {
    expect(passwordError("abcdefghi1")).toBeNull();
    expect(passwordError("ABCDEFGHI1")).toBeNull();
    expect(passwordError("Duoduo2026!xyz")).toBeNull();
  });
  it("空值／非字串", () => {
    expect(passwordError("")).toBe("請輸入新密碼。");
    expect(passwordError(null)).toBe("請輸入新密碼。");
  });
  it("太短（9 碼）", () => {
    expect(passwordError("abcdefgh1")).toMatch(/至少需要 10 碼/);
  });
  it("缺數字或缺英文字母", () => {
    expect(passwordError("abcdefghijk")).toMatch(/英文字母與數字/);
    expect(passwordError("12345678901")).toMatch(/英文字母與數字/);
    expect(passwordError("密碼密碼密碼密碼密碼1")).toMatch(/英文字母與數字/);
  });
  it("超過 72 bytes", () => {
    expect(passwordError("a1".repeat(37))).toMatch(/太長/);
  });
  it("確認密碼不一致", () => {
    expect(newPasswordError("abcdefghi1", "abcdefghi2")).toBe("兩次輸入的密碼不一致。");
    expect(newPasswordError("abcdefghi1", "abcdefghi1")).toBeNull();
    expect(newPasswordError("short1", "short1")).toMatch(/至少/);
  });
});

describe("next 參數只接受站內相對路徑", () => {
  it("站內路徑保留（含 query）", () => {
    expect(safeNext("/vendor/slots")).toBe("/vendor/slots");
    expect(safeNext("/admin?x=1")).toBe("/admin?x=1");
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "evil.com/admin",
    "/admin\n//evil.com",
    "",
    undefined,
    123,
  ])("拒絕 %s", (v) => {
    expect(safeNext(v)).toBeNull();
  });
});

describe("登入後角色導向／拒絕", () => {
  const admin = { role: "admin" as const };
  const vendor = { role: "vendor" as const };
  it("沒有 staff（或已停用）→ null（呼叫端登出拒絕）", () => {
    expect(postLoginTarget(null, "/admin")).toBeNull();
    expect(postLoginTarget(null, undefined)).toBeNull();
  });
  it("依角色回首頁", () => {
    expect(postLoginTarget(admin, undefined)).toBe("/admin");
    expect(postLoginTarget(vendor, undefined)).toBe("/vendor");
  });
  it("next 在該角色區域內才採用", () => {
    expect(postLoginTarget(vendor, "/vendor/slots")).toBe("/vendor/slots");
    expect(postLoginTarget(admin, "/admin/vendors")).toBe("/admin/vendors");
    expect(postLoginTarget(vendor, "/account/password")).toBe("/account/password");
    expect(postLoginTarget(admin, "/account/password")).toBe("/account/password");
  });
  it("跨角色或站外 next → 角色首頁", () => {
    expect(postLoginTarget(vendor, "/admin")).toBe("/vendor");
    expect(postLoginTarget(admin, "/vendor")).toBe("/admin");
    expect(postLoginTarget(vendor, "/vendorx")).toBe("/vendor");
    expect(postLoginTarget(vendor, "//evil.com/vendor")).toBe("/vendor");
    expect(postLoginTarget(admin, "https://evil.com/admin")).toBe("/admin");
  });
});

describe("變更密碼頁存取", () => {
  it("未登入 → /login?next=/account/password", () => {
    expect(accountRedirect(null, false)).toBe("/login?next=%2Faccount%2Fpassword");
  });
  it("已登入但無後台身分 → 登出拒絕", () => {
    expect(accountRedirect(null, true)).toBe("/auth/denied");
  });
  it("管理員與供應商皆可進", () => {
    expect(accountRedirect({ role: "admin" }, true)).toBeNull();
    expect(accountRedirect({ role: "vendor" }, true)).toBeNull();
  });
});

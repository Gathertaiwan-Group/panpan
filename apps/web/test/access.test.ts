import { describe, expect, it } from "vitest";
import { accessRedirect } from "@/lib/auth/access";

const vendor = { role: "vendor" as const, vendorId: "v1" };
const admin = { role: "admin" as const, vendorId: null };

describe("後台存取", () => {
  it("未登入 → /login", () => {
    expect(accessRedirect("admin", null, false)).toBe("/login?next=/admin");
    expect(accessRedirect("vendor", null, false)).toBe("/login?next=/vendor");
  });
  it("已登入但沒有 staff 紀錄（或停用）→ 登出並拒絕", () => {
    expect(accessRedirect("admin", null, true)).toBe("/auth/denied");
    expect(accessRedirect("vendor", null, true)).toBe("/auth/denied");
  });
  it("供應商進 /admin 被拒", () => {
    expect(accessRedirect("admin", vendor, true)).toBe("/vendor?denied=admin");
    expect(accessRedirect("vendor", vendor, true)).toBeNull();
  });
  it("管理員進 /admin；進 /vendor 導回 /admin", () => {
    expect(accessRedirect("admin", admin, true)).toBeNull();
    expect(accessRedirect("vendor", admin, true)).toBe("/admin");
  });
});

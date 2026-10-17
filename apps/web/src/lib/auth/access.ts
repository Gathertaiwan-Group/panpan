/** 後台存取判斷（純函式）：回傳要導去的路徑；可進入則回 null */
export function accessRedirect(
  area: "admin" | "vendor",
  staff: { role: "admin" | "vendor"; vendorId: string | null } | null,
  loggedIn: boolean,
): string | null {
  if (!staff) return loggedIn ? "/auth/denied" : `/login?next=/${area}`; // 沒有（或已停用）staff → 登出拒絕
  if (area === "admin") return staff.role === "admin" ? null : "/vendor?denied=admin"; // 供應商進 /admin 被拒
  return staff.role === "vendor" && staff.vendorId ? null : "/admin";
}

/** 帳號頁（變更密碼）：管理員與供應商都能進；未登入 → /login，已登入但無後台身分 → 登出拒絕 */
export function accountRedirect(staff: { role: "admin" | "vendor" } | null, loggedIn: boolean, path = "/account/password"): string | null {
  if (staff) return null;
  return loggedIn ? "/auth/denied" : `/login?next=${encodeURIComponent(path)}`;
}

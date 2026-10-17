/** 後台存取判斷（純函式）：回傳要導去的路徑；可進入則回 null */
export function accessRedirect(
  area: "admin" | "vendor",
  staff: { role: "admin" | "vendor"; vendorId: string | null } | null,
  loggedIn: boolean,
): string | null {
  if (!staff) return loggedIn ? "/account?denied=staff" : `/login?next=/${area}`; // 客人（或已停用的 staff）→ 拒絕，回會員專區
  if (area === "admin") return staff.role === "admin" ? null : "/vendor?denied=admin"; // 供應商進 /admin 被拒
  return staff.role === "vendor" && staff.vendorId ? null : "/admin";
}

/** 會員專區（/account/**，含變更密碼）：任何已登入且 Email 已驗證的使用者（客人、供應商、管理員）都能進 */
export function accountRedirect(
  viewer: { emailConfirmed: boolean } | null,
  path = "/account",
): string | null {
  if (!viewer) return `/login?next=${encodeURIComponent(path)}`;
  if (!viewer.emailConfirmed) return "/login?error=unverified";
  return null;
}

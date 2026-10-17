/**
 * 密碼規則與登入導向（純函式，前後端共用、可單元測試）。
 * 規則需與 Supabase Auth 設定一致：password_min_length=10、required characters = 英文字母 + 數字。
 */
export const PASSWORD_MIN = 10;
/** bcrypt 只看前 72 bytes；超過一律拒絕避免「後面打的字其實沒用」 */
export const PASSWORD_MAX = 72;
export const PASSWORD_RULE_TEXT = `至少 ${PASSWORD_MIN} 碼，需同時包含英文字母與數字。`;

/** 回傳中文錯誤訊息；合格回 null */
export function passwordError(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length === 0) return "請輸入新密碼。";
  if (pw.length < PASSWORD_MIN) return `密碼至少需要 ${PASSWORD_MIN} 碼。`;
  if (new TextEncoder().encode(pw).length > PASSWORD_MAX) return `密碼太長（最多 ${PASSWORD_MAX} 個英數字元）。`;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "密碼需同時包含英文字母與數字。";
  return null;
}

/** 新密碼＋確認密碼 */
export function newPasswordError(pw: unknown, confirm: unknown): string | null {
  const e = passwordError(pw);
  if (e) return e;
  if (pw !== confirm) return "兩次輸入的密碼不一致。";
  return null;
}

/** Supabase Auth 回的錯誤碼 → 中文（不含任何細節或密碼內容） */
export function authPasswordErrorMessage(code: string | undefined): string {
  switch (code) {
    case "weak_password":
      return `密碼強度不足：${PASSWORD_RULE_TEXT}`;
    case "same_password":
      return "新密碼不能與目前的密碼相同。";
    case "reauthentication_needed":
      return "為了安全，請重新登入後再變更密碼。";
    case "over_request_rate_limit":
      return "操作太頻繁，請稍候再試。";
    default:
      return "密碼更新失敗，請稍候再試。";
  }
}

/** 只接受站內相對路徑（防 open redirect）；不合格回 null */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string") return null;
  const n = next.trim();
  if (!n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\")) return null;
  if (n.length > 512 || n.includes("\\") || [...n].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return null;
  try {
    const base = "https://panpan.invalid";
    const u = new URL(n, base);
    if (u.origin !== base) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

export type Role = "admin" | "vendor" | "customer";

export const roleHome = (role: Role) => (role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/account");

/** next 是否指向後台（供應商／管理員入口）：這種情況寄登入連結時不可自動建立帳號 */
export function isBackofficePath(next: unknown): boolean {
  const n = safeNext(next);
  if (!n) return false;
  const path = n.split(/[?#]/)[0];
  return ["/admin", "/vendor"].some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * 登入成功後要去哪：未登入 → null；
 * 角色白名單：管理員 /admin、供應商 /vendor、其他已驗證使用者（客人）/account；三者都可進 /account（變更密碼、自己的預約）。
 * next 只在「站內、且是該角色可進的區域」時採用，否則回角色首頁。
 */
export function postLoginTarget(who: { role: Role } | null, next: unknown): string | null {
  if (!who) return null;
  const n = safeNext(next);
  const home = roleHome(who.role);
  if (!n) return home;
  const path = n.split(/[?#]/)[0];
  const allowed = who.role === "customer" ? ["/account"] : [home, "/account"];
  return allowed.some((p) => path === p || path.startsWith(`${p}/`)) ? n : home;
}

/** 註冊時的稱呼 */
export function displayNameError(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return "請填寫稱呼。";
  if (name.trim().length > 40) return "稱呼最多 40 個字。";
  return null;
}

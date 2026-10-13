/** 所有 env 皆為選填；未設定時整站以 content.json 顯示。 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://panpan.vercel.app").replace(/\/+$/, "");

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** LINE 官方帳號；未設定時「私訊詢問」改開預約詢問表單 */
export const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || "";

export function storagePublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${path.replace(/^\/+/, "")}`;
}

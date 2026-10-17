import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../env";
import { DB_SCHEMA } from "../supabase";

/**
 * service role client（繞過 RLS）——只能在伺服器端使用（server-only 保證不會被打包進前端）。
 * 用於：建立預約、付款回查／標記、管理後台（已先在伺服器端確認是管理員）。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, typeof DB_SCHEMA>;
let cached: Db | null = null;

export function serviceRoleConfigured(): boolean {
  return Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function adminDb(): Db {
  if (cached) return cached;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY 未設定");
  const client: Db = createClient(SUPABASE_URL, key, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  cached = client;
  return client;
}

/** auth admin API（建立登入帳號）用：schema 無關 */
export function adminAuth() {
  return adminDb().auth.admin;
}

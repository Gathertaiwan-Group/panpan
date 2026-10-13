import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./env";

/**
 * 本站資料放在共用 Supabase 專案的獨立 schema `panpan`（不可碰 public）。
 * 所有 client 都必須帶 db.schema，否則會靜默讀寫到 public。
 * 註：Supabase Dashboard → API → Exposed schemas 需加入 panpan。
 */
export const DB_SCHEMA = "panpan" as const;

/** 內容讀取用：fetch 走 Next Data Cache（ISR 5 分鐘 + tag 可手動 revalidate） */
export function contentClient(tags: string[]) {
  if (!hasSupabase) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300, tags } }),
    },
  });
}

/** 表單寫入用：不快取；anon key + RLS 只允許 insert */
export function writeClient() {
  if (!hasSupabase) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

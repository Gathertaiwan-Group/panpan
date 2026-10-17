import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";
import { DB_SCHEMA } from "../supabase";

/**
 * 使用者 session client（anon key + 登入者 JWT）：所有查詢都受 RLS 約束。
 * 供應商後台讀寫自己的資料一律用這個（RLS 是最後防線）。
 */
export async function userDb() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Component 內無法寫 cookie；middleware 會負責刷新 session
        }
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

import "server-only";
import { userDb } from "../server/user-db";
import { UUID_RE, withView, type MyBooking, type MyBookingRow } from "./view";

type Db = Awaited<ReturnType<typeof userDb>>;

/**
 * 歸戶：把「同一個已驗證 Email、尚未歸戶」的預約綁到目前登入者。
 * 由 DB 的 security definer RPC 處理（Email 取自 auth.users 且必須已驗證；不信任任何前端輸入）。失敗不影響登入。
 */
export async function claimMyBookings(db?: Db): Promise<number> {
  try {
    const client = db ?? (await userDb());
    const { data, error } = await client.rpc("claim_my_bookings");
    if (error) {
      console.warn("[account] claim_my_bookings:", error.code);
      return 0;
    }
    return Number(data) || 0;
  } catch {
    return 0;
  }
}

/** 本人的預約（RPC 內以 auth.uid() 過濾，只回客人可見欄位） */
export async function listMyBookings(): Promise<MyBooking[]> {
  const db = await userDb();
  const { data, error } = await db.rpc("my_bookings");
  if (error) throw new Error(`my_bookings: ${error.code}`);
  return withView((data ?? []) as MyBookingRow[]);
}

export async function getMyBooking(id: string): Promise<MyBooking | null> {
  if (!UUID_RE.test(id)) return null;
  const db = await userDb();
  const { data, error } = await db.rpc("my_bookings").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return withView([data as MyBookingRow])[0] ?? null;
}

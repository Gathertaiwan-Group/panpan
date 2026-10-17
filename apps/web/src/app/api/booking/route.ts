import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking/create";
import { clientIp, hashIp } from "@/lib/booking/ratelimit";
import { bookingInput, fieldErrors } from "@/lib/booking/validation";
import { userDb } from "@/lib/server/user-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 建立預約（保留時段）＋ 建立 PChomePay 訂單 → 回付款導向網址 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input", message: "資料格式不正確。" }, { status: 400 });
  }
  const parsed = bookingInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "invalid_input", message: "請檢查欄位內容。", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  // 已登入且 Email 已驗證 → 預約直接歸戶（user_id 一律從 session 取，不信任前端；DB 端會再檢查一次）
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await (await userDb()).auth.getUser();
    if (user?.email_confirmed_at) userId = user.id;
  } catch {
    /* 未登入或 session 無效 → 訪客預約 */
  }
  const r = await createBooking(parsed.data, { ipHash: hashIp(clientIp(req.headers)), userId });
  if (!r.ok) return NextResponse.json(r, { status: r.status });
  const q = `o=${encodeURIComponent(r.orderNo)}&t=${encodeURIComponent(r.token)}`;
  return NextResponse.json({
    ok: true,
    orderNo: r.orderNo,
    statusUrl: `/booking/${r.orderNo}?t=${encodeURIComponent(r.token)}`,
    payUrl: `/api/pay/redirect?${q}`,
  });
}

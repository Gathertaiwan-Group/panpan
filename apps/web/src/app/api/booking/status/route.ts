import { NextResponse } from "next/server";
import { getPublicBooking } from "@/lib/booking/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 付款結果頁輪詢：需 orderNo + 不可猜的 token */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const o = url.searchParams.get("o") ?? "";
  const t = url.searchParams.get("t") ?? "";
  try {
    const b = await getPublicBooking(o, t, { refresh: true });
    if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(b, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[booking/status]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

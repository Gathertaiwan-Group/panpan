import { NextResponse } from "next/server";
import { publicStatus, loadBookingWithToken } from "@/lib/booking/status";
import { getPaymentForBooking } from "@/lib/booking/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 前往付款：保留中且有付款網址 → 303 到 PChomePay；否則回付款結果頁 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const o = url.searchParams.get("o") ?? "";
  const t = url.searchParams.get("t") ?? "";
  const b = await loadBookingWithToken(o, t);
  if (!b) return NextResponse.redirect(new URL("/farewell", req.url), 303);
  const back = new URL(`/booking/${b.order_no}?t=${encodeURIComponent(t)}`, req.url);
  if (publicStatus(b) !== "pending") return NextResponse.redirect(back, 303);
  const pay = await getPaymentForBooking(b.id);
  if (!pay?.payment_url || pay.status !== "init") return NextResponse.redirect(back, 303);
  const target = new URL(pay.payment_url);
  if (!/(^|\.)pchomepay\.com\.tw$/.test(target.hostname)) return NextResponse.redirect(back, 303);
  return NextResponse.redirect(target, 303);
}

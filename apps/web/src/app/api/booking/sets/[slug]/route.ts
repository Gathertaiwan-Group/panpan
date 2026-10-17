import { NextResponse } from "next/server";
import { getBookableSet } from "@/lib/booking/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 體驗詳細頁的「立即預約」按鈕用：是否開放線上預約＋價格／時長 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let set = null;
  try {
    set = await getBookableSet(slug);
  } catch {
    set = null;
  }
  const body = set
    ? { bookable: true, price: set.price, durationMinutes: set.durationMinutes }
    : { bookable: false };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

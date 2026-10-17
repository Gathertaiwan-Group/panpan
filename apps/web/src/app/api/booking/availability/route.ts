import { NextResponse } from "next/server";
import { allowedMonths, computeMonth, isAllowedMonth, monthRange } from "@/lib/booking/availability";
import { getBookableSet, getSchedule } from "@/lib/booking/repo";
import { taipeiMonth } from "@/lib/booking/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const now = new Date();
  const month = url.searchParams.get("month") || taipeiMonth(now);
  if (!isAllowedMonth(month, now)) {
    return NextResponse.json({ error: "month_out_of_range" }, { status: 400 });
  }
  const set = await getBookableSet(slug);
  if (!set) return NextResponse.json({ error: "not_bookable" }, { status: 404 });
  try {
    const r = monthRange(month);
    const schedule = await getSchedule(set.vendorId, r.from, r.to, now, set.durationMinutes);
    return NextResponse.json(
      { month, months: allowedMonths(now), days: computeMonth(month, schedule) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

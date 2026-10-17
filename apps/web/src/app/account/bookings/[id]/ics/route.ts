import { NextResponse } from "next/server";
import { getMyBooking } from "@/lib/account/bookings";
import { getViewer } from "@/lib/auth/staff";
import { buildIcs } from "@/lib/booking/ics";
import { SITE_URL } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 本人預約的 .ics（他人／不存在 → 404） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.emailConfirmed) return new NextResponse("Not found", { status: 404 });
  const b = await getMyBooking(id);
  if (!b || (b.view !== "confirmed" && b.view !== "pending")) return new NextResponse("Not found", { status: 404 });
  const ics = buildIcs({
    uid: `${b.order_no}@duoduo-whispers`, // 與確認信附件同一個 UID：重複匯入會更新同一事件
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    summary: `朵朵曉語｜${b.set_name}`,
    description: `訂單編號 ${b.order_no}\n供應商：${b.vendor_name ?? ""}${b.vendor_phone ? ` ${b.vendor_phone}` : ""}\n${SITE_URL}/account/bookings/${b.id}`,
  });
  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="duoduo-${b.order_no}.ics"`,
      "cache-control": "private, no-store",
    },
  });
}

import { reconcile } from "@/lib/booking/gateway";

// PChomePay notify（公開 webhook）。
// ⚠️ 沒有簽章 → 只取 order_id，其餘一律以 GET /v1/payment/{order_id} 回查為準。
// 處理完成回純文字 success（停止重送）；回查／DB 失敗回 500（讓 PChomePay 重送）。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  let notifyType = "";
  let orderId = "";
  try {
    const sp = new URLSearchParams(await req.text());
    notifyType = (sp.get("notify_type") ?? "").trim();
    const msg = JSON.parse(sp.get("notify_message") ?? "{}") as Record<string, unknown>;
    orderId = String(msg?.order_id ?? "").trim();
  } catch {
    return text("success", 200); // 格式錯誤，重送也不會變好
  }
  // 只處理本站訂單（DD 開頭）；給樂官網的訂單不會打到這裡，保險起見仍略過
  if (!/^DD[A-Z0-9]{6,18}$/.test(orderId)) return text("success", 200);

  const r = await reconcile(orderId, notifyType || null);
  console.log(`[pay/notify] order=${orderId} type=${notifyType} → ${r.outcome}`);
  return r.http === 200 ? text("success", 200) : text("retry", 500);
}

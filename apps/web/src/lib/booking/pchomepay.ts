import "server-only";

// PChomePay 支付連（沿用 gather-landing/lib/pchomepay.ts 的規則；零新套件，一律 fetch）
// env：PCHOMEPAY_APP_ID / PCHOMEPAY_SECRET / PCHOMEPAY_SANDBOX（"true"=測試環境）/ PCHOMEPAY_PAY_TYPES（預設 CARD,ATM）
// ⚠️ notify 沒有簽章：絕不信 payload，一律 GET /v1/payment/{order_id} 回查為準。
// 收款主體與給樂官網同一組商店金鑰 → 我方 order_id 一律 DD 開頭，避免與給樂訂單（GT…）撞號。

function baseUrl(): string {
  return process.env.PCHOMEPAY_SANDBOX === "true"
    ? "https://sandbox-api.pchomepay.com.tw"
    : "https://api.pchomepay.com.tw";
}

export function pchomepayConfigured(): boolean {
  return Boolean(process.env.PCHOMEPAY_APP_ID && process.env.PCHOMEPAY_SECRET);
}

/** 後台設定允許的付款方式（CARD / ATM） */
export function enabledPayTypes(): Array<"CARD" | "ATM"> {
  const list = (process.env.PCHOMEPAY_PAY_TYPES || "CARD,ATM")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is "CARD" | "ATM" => s === "CARD" || s === "ATM");
  return list.length ? list : ["CARD"];
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!pchomepayConfigured()) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;
  const basic = Buffer.from(`${process.env.PCHOMEPAY_APP_ID}:${process.env.PCHOMEPAY_SECRET}`).toString("base64");
  try {
    const res = await fetch(`${baseUrl()}/v1/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[pchomepay] token 換發失敗:", res.status, text.slice(0, 200));
      return null;
    }
    const data = JSON.parse(text) as { token?: string; expired_timestamp?: number };
    if (!data.token) {
      console.error("[pchomepay] token 回應缺 token");
      return null;
    }
    const expiresAt = Number(data.expired_timestamp) > 0 ? Number(data.expired_timestamp) * 1000 : now + 25 * 60_000;
    cachedToken = { token: data.token, expiresAt };
    return data.token;
  } catch (err) {
    console.error("[pchomepay] token 換發連線失敗:", err);
    return null;
  }
}

async function pcpayFetch(path: string, init: { method: "GET" | "POST"; body?: string }): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${baseUrl()}${path}`, {
        method: init.method,
        headers: { "pcpay-token": token, "Content-Type": "application/json" },
        body: init.body,
        cache: "no-store",
      });
      if (res.status === 401 && attempt === 0) {
        cachedToken = null;
        continue;
      }
      return res;
    } catch (err) {
      console.error("[pchomepay] API 連線失敗:", err);
      return null;
    }
  }
  return null;
}

export interface CheckoutInput {
  orderId: string;
  amount: number;
  payType: "CARD" | "ATM";
  itemName: string;
  itemUrl: string;
  returnUrl: string;
  notifyUrl: string;
  buyerEmail: string;
  atmExpireDays: number;
}

/** 建單（POST /v1/payment）→ payment_url。失敗回 null。 */
export async function createGatewayCheckout(input: CheckoutInput): Promise<{ paymentUrl: string } | null> {
  if (!pchomepayConfigured()) {
    console.error("[pchomepay] 未設定 PCHOMEPAY_APP_ID/PCHOMEPAY_SECRET");
    return null;
  }
  if (!input.orderId.startsWith("DD") || input.amount < 30) {
    console.error("[pchomepay] 建單參數不合法（order_id 須 DD 開頭、金額 ≥ 30）");
    return null;
  }
  const body: Record<string, unknown> = {
    order_id: input.orderId,
    pay_type: [input.payType],
    amount: Math.round(input.amount),
    return_url: input.returnUrl,
    notify_url: input.notifyUrl,
    items: [{ name: input.itemName.slice(0, 100), url: input.itemUrl }],
    buyer_email: input.buyerEmail,
  };
  if (input.payType === "ATM") body.atm_info = { expire_days: input.atmExpireDays };
  try {
    const res = await pcpayFetch("/v1/payment", { method: "POST", body: JSON.stringify(body) });
    if (!res) return null;
    const text = await res.text();
    if (!res.ok) {
      console.error("[pchomepay] 建單失敗:", res.status, text.slice(0, 300));
      return null;
    }
    const data = JSON.parse(text) as { payment_url?: string };
    if (!data.payment_url) {
      console.error("[pchomepay] 建單回應缺 payment_url");
      return null;
    }
    return { paymentUrl: data.payment_url };
  } catch (err) {
    console.error("[pchomepay] createGatewayCheckout failed:", err);
    return null;
  }
}

export interface GatewayPayment {
  /** 權威付款狀態："S" 成功／"F" 失敗／"P" 處理中（見 reconcile.ts classifyGatewayStatus 註解與 Realreal 2026-07-12 事件）。 */
  status?: string;
  status_code?: string;
  pay_type?: string;
  amount?: number;
  payment_info?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

/** 查單（GET /v1/payment/{order_id}）——付款狀態唯一權威。失敗回 null（notify 應回 500 讓閘道重試）。 */
export async function queryGatewayPayment(orderId: string): Promise<GatewayPayment | null> {
  if (!pchomepayConfigured() || !orderId) return null;
  try {
    const res = await pcpayFetch(`/v1/payment/${encodeURIComponent(orderId)}`, { method: "GET" });
    if (!res) return null;
    const text = await res.text();
    if (!res.ok) {
      console.error("[pchomepay] 查單失敗:", res.status, text.slice(0, 200));
      return null;
    }
    const data = JSON.parse(text) as Record<string, unknown>;
    const payType = Array.isArray(data.pay_type)
      ? data.pay_type.map(String).join(",")
      : data.pay_type != null
        ? String(data.pay_type)
        : undefined;
    return {
      status: data.status != null ? String(data.status).trim().toUpperCase() : undefined,
      status_code: data.status_code != null ? String(data.status_code) : undefined,
      pay_type: payType,
      amount: data.amount != null && Number.isFinite(Number(data.amount)) ? Number(data.amount) : undefined,
      payment_info:
        data.payment_info && typeof data.payment_info === "object" && !Array.isArray(data.payment_info)
          ? (data.payment_info as Record<string, unknown>)
          : undefined,
      raw: data,
    };
  } catch (err) {
    console.error("[pchomepay] queryGatewayPayment failed:", err);
    return null;
  }
}

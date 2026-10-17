import "server-only";

// Resend 寄信（直接 fetch REST，帶 Idempotency-Key）。
// 未設 RESEND_API_KEY → dry-run：只記 log，回 "dry_run"（呼叫端不寫 *_sent_at）。

export type MailResult = "sent" | "dry_run" | "failed";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  idempotencyKey: string;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>; // content = base64
}

export const DEFAULT_FROM = "朵朵曉語 <noreply@gathertaiwan.com>";

export async function sendMail(input: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || DEFAULT_FROM;
  if (!key) {
    console.log(`[mail] dry-run（未設 RESEND_API_KEY）subject="${input.subject}" key=${input.idempotencyKey}`);
    return "dry_run";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo || undefined,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
        })),
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[mail] Resend 失敗:", res.status, (await res.text()).slice(0, 200));
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[mail] Resend 連線失敗:", err);
    return "failed";
  }
}

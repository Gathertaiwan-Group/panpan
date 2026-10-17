import { LINE_URL } from "../env";

/** 客服聯絡方式（會員專區「如需更改或取消」用）。都未設定時，請客人回覆預約確認信。 */
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || "").trim();
export { LINE_URL };

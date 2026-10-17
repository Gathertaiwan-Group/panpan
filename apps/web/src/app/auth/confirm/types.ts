import type { EmailOtpType } from "@supabase/supabase-js";

/** 接受的連結類型（Email 模板 type 參數）：signup＝註冊驗證、magiclink／email＝登入連結、recovery＝重設密碼 */
export const CONFIRM_TYPES: EmailOtpType[] = ["signup", "email", "magiclink", "recovery"];

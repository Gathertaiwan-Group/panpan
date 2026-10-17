import type { EmailOtpType } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { HideBrandClosing } from "@/components/backoffice/Shell";
import { Notice, primaryBtn } from "@/components/booking/ui";
import { safeNext } from "@/lib/auth/password";
import { confirmEmailLink } from "./actions";
import { CONFIRM_TYPES } from "./types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "確認 Email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ token_hash?: string; type?: string; next?: string }> };

/** GET 只顯示確認按鈕，不消耗 token（防郵件掃描器先點掉一次性連結） */
export default async function ConfirmPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tokenHash = sp.token_hash ?? "";
  const type = (sp.type ?? "") as EmailOtpType;
  const valid = Boolean(tokenHash) && tokenHash.length <= 512 && CONFIRM_TYPES.includes(type);
  const next = safeNext(sp.next);
  const isSignup = type === "signup";

  return (
    <section className="px-4 py-[clamp(48px,8vw,96px)]">
      <HideBrandClosing />
      <div className="mx-auto flex max-w-[420px] flex-col gap-6">
        <span className="font-en text-[14px] tracking-[.26em] text-gold">{isSignup ? "VERIFY EMAIL" : "SIGN IN"}</span>
        <h1 className="m-0 font-serif text-[28px] font-medium tracking-[.1em] text-ink">
          {isSignup ? "完成 Email 驗證" : "用連結登入"}
        </h1>
        {valid ? (
          <form action={confirmEmailLink} className="flex flex-col gap-5">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            {next && <input type="hidden" name="next" value={next} />}
            <p className="m-0 text-[15px] leading-[1.9] text-body">
              {isSignup
                ? "點下方按鈕完成 Email 驗證，就能登入查看妳的預約與消費紀錄。"
                : "點下方按鈕完成登入。登入後可以設定新密碼。"}
            </p>
            <button type="submit" className={primaryBtn}>
              {isSignup ? "完成驗證" : "登入"}
            </button>
          </form>
        ) : (
          <>
            <div role="alert">
              <Notice tone="warn">連結格式不正確或已不完整，請重新寄送登入連結。</Notice>
            </div>
            <Link href="/login" className={primaryBtn}>
              回到登入頁
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

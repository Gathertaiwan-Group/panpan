import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/backoffice/LoginForm";
import { HideBrandClosing } from "@/components/backoffice/Shell";
import { Notice } from "@/components/booking/ui";
import { postLoginTarget, safeNext } from "@/lib/auth/password";
import { getViewer } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "會員登入", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  no_access: "這個帳號沒有後台權限，已為妳登出。如需開通，請聯繫朵朵曉語管理員。",
  invalid_link: "連結無效或已過期，請重新寄送登入連結。",
  unverified: "這個帳號的 Email 尚未驗證，請到信箱點驗證信，或改用 Email 登入連結。",
};

type Props = { searchParams: Promise<{ error?: string; signed_out?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.next) ?? undefined;
  if (!sp.error) {
    const viewer = await getViewer();
    const target = viewer?.emailConfirmed ? postLoginTarget(viewer, next) : null;
    if (target) redirect(target);
  }
  return (
    <section className="px-4 py-[clamp(48px,8vw,96px)]">
      <HideBrandClosing />
      <div className="mx-auto flex max-w-[420px] flex-col gap-6">
        <span className="font-en text-[14px] tracking-[.26em] text-gold">MEMBER LOGIN</span>
        <h1 className="m-0 font-serif text-[28px] font-medium tracking-[.1em] text-ink">會員登入</h1>
        <p className="m-0 text-[15px] leading-[1.9] text-body">
          登入後可以查看妳的預約與消費紀錄。還沒設定密碼或忘記密碼，請用下方的 Email 登入連結。供應商與管理員也從這裡登入後台。
        </p>
        {sp.error && ERRORS[sp.error] && (
          <div role="alert">
            <Notice tone="warn">{ERRORS[sp.error]}</Notice>
          </div>
        )}
        {sp.signed_out && <Notice>已登出。</Notice>}
        <LoginForm next={next} />
      </div>
    </section>
  );
}

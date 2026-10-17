import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/backoffice/LoginForm";
import { HideBrandClosing } from "@/components/backoffice/Shell";
import { Notice } from "@/components/booking/ui";
import { getStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "後台登入", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  no_access: "這個帳號沒有後台權限，已為妳登出。如需開通，請聯繫朵朵曉語管理員。",
  invalid_link: "登入連結無效或已過期，請重新寄送。",
};

type Props = { searchParams: Promise<{ error?: string; signed_out?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (!sp.error) {
    const staff = await getStaff();
    if (staff) redirect(staff.role === "admin" ? "/admin" : "/vendor");
  }
  return (
    <section className="px-4 py-[clamp(48px,8vw,96px)]">
      <HideBrandClosing />
      <div className="mx-auto flex max-w-[420px] flex-col gap-6">
        <span className="font-en text-[14px] tracking-[.26em] text-gold">PARTNER LOGIN</span>
        <h1 className="m-0 font-serif text-[28px] font-medium tracking-[.1em] text-ink">後台登入</h1>
        <p className="m-0 text-[15px] leading-[1.9] text-body">
          供應商與管理員請輸入 Email，我們會寄一封一次性登入連結給妳。帳號由朵朵曉語管理員建立，不開放自行註冊。
        </p>
        {sp.error && ERRORS[sp.error] && (
          <div role="alert">
            <Notice tone="warn">{ERRORS[sp.error]}</Notice>
          </div>
        )}
        {sp.signed_out && <Notice>已登出。</Notice>}
        <LoginForm />
      </div>
    </section>
  );
}

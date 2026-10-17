import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/backoffice/RegisterForm";
import { HideBrandClosing } from "@/components/backoffice/Shell";
import { postLoginTarget, safeNext } from "@/lib/auth/password";
import { getViewer } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "註冊會員", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.next) ?? undefined;
  const viewer = await getViewer();
  if (viewer?.emailConfirmed) redirect(postLoginTarget(viewer, next) ?? "/account");
  return (
    <section className="px-4 py-[clamp(48px,8vw,96px)]">
      <HideBrandClosing />
      <div className="mx-auto flex max-w-[420px] flex-col gap-6">
        <span className="font-en text-[14px] tracking-[.26em] text-gold">JOIN</span>
        <h1 className="m-0 font-serif text-[28px] font-medium tracking-[.1em] text-ink">註冊會員</h1>
        <p className="m-0 text-[15px] leading-[1.9] text-body">
          註冊後可以隨時查看預約時間、付款狀態與消費紀錄。用預約時填寫的 Email 註冊，之前的預約會自動出現在會員專區。
        </p>
        <RegisterForm next={next} />
      </div>
    </section>
  );
}

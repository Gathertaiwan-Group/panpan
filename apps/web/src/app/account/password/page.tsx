import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/backoffice/ChangePasswordForm";
import { Shell } from "@/components/backoffice/Shell";
import { Notice } from "@/components/booking/ui";
import { ADMIN_NAV } from "@/app/admin/nav";
import { VENDOR_NAV } from "@/app/vendor/nav";
import { roleHome } from "@/lib/auth/password";
import { requireStaff } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "變更密碼", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ from?: string }> };

export default async function ChangePasswordPage({ searchParams }: Props) {
  const me = await requireStaff();
  const sp = await searchParams;
  const isAdmin = me.role === "admin";
  const home = roleHome(me.role);
  return (
    <Shell
      eyebrow={isAdmin ? "ADMIN" : "VENDOR"}
      title="變更密碼"
      who={isAdmin ? me.email : `${me.vendorName}・${me.email}`}
      nav={isAdmin ? ADMIN_NAV : VENDOR_NAV}
      active="/account/password"
    >
      <div className="flex w-full max-w-[420px] flex-col gap-5">
        {sp.from === "link" && (
          <Notice>
            已透過登入連結登入。若還沒設定密碼或忘記密碼，請在這裡設定新密碼，之後就能用 Email＋密碼登入。
          </Notice>
        )}
        <ChangePasswordForm home={home} email={me.email} />
        {sp.from === "link" && (
          <Link
            href={home}
            className="inline-flex min-h-[44px] items-center self-start text-[15px] tracking-[.06em] text-body underline underline-offset-4 hover:text-rose-deep"
          >
            先略過，直接進後台
          </Link>
        )}
      </div>
    </Shell>
  );
}

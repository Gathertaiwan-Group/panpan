"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerCustomer, type RegisterState } from "@/app/register/actions";
import { Field, Notice, inputCls, primaryBtn } from "@/components/booking/ui";
import { PASSWORD_RULE_TEXT, displayNameError, newPasswordError } from "@/lib/auth/password";

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(async (prev: RegisterState, fd: FormData) => {
    // 前端先驗一次（伺服器端會再驗）
    const nameErr = displayNameError(fd.get("name"));
    if (nameErr) return { error: nameErr, field: "name" };
    const pwErr = newPasswordError(fd.get("password"), fd.get("confirm"));
    if (pwErr) return { error: pwErr, field: "password" };
    return registerCustomer(prev, fd);
  }, null);

  if (state?.sent) {
    return (
      <div className="flex flex-col gap-5">
        <div role="status">
          <Notice tone="ok">
            我們已寄出一封驗證信。請到信箱點「完成驗證」，驗證後就能登入。之前用同一個 Email 預約的紀錄，登入後會自動出現在會員專區。
          </Notice>
        </div>
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={primaryBtn}>
          前往登入
        </Link>
      </div>
    );
  }
  const err = (f: NonNullable<RegisterState>["field"]) => (state?.field === f ? state?.error : undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="怎麼稱呼妳" htmlFor="reg-name" error={err("name")}>
        <input id="reg-name" name="name" autoComplete="name" required maxLength={40} className={inputCls} />
      </Field>
      <Field label="Email" htmlFor="reg-email" error={err("email")} hint="請使用預約時填寫的 Email，之前的預約會自動出現">
        <input id="reg-email" name="email" type="email" inputMode="email" autoComplete="email" required className={inputCls} />
      </Field>
      <Field label="密碼" htmlFor="reg-password" error={err("password")} hint={PASSWORD_RULE_TEXT}>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={72}
          className={inputCls}
        />
      </Field>
      <Field label="確認密碼" htmlFor="reg-confirm">
        <input id="reg-confirm" name="confirm" type="password" autoComplete="new-password" required maxLength={72} className={inputCls} />
      </Field>
      {state?.error && !state.field && (
        <div role="alert">
          <Notice tone="warn">{state.error}</Notice>
        </div>
      )}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "送出中…" : "註冊"}
      </button>
      <p className="m-0 text-[15px] text-body">
        已經有帳號？
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="ml-1 inline-flex min-h-[44px] items-center text-body underline underline-offset-4 hover:text-rose-deep"
        >
          登入
        </Link>
      </p>
    </form>
  );
}

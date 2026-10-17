"use client";

import { useActionState } from "react";
import { sendLoginLink, type LoginState } from "@/app/login/actions";
import { Field, Notice, inputCls, primaryBtn } from "@/components/booking/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, null);
  if (state?.sent) {
    return (
      <div role="status">
        <Notice tone="ok">
          如果這個 Email 有後台權限，登入連結已寄出。請到信箱點「登入後台」，連結 60 分鐘內有效、只能使用一次。
        </Notice>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Email" htmlFor="login-email" error={state?.error}>
        <input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" required className={inputCls} />
      </Field>
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "寄送中…" : "寄送登入連結"}
      </button>
    </form>
  );
}

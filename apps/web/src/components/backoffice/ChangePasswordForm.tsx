"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "@/app/account/password/actions";
import { Field, Notice, inputCls, primaryBtn } from "@/components/booking/ui";
import { PASSWORD_RULE_TEXT, newPasswordError } from "@/lib/auth/password";

export function ChangePasswordForm({ home, email }: { home: string; email: string }) {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    async (prev: ChangePasswordState, fd: FormData) => {
      // 前端先驗一次（伺服器端會再驗）
      const err = newPasswordError(fd.get("password"), fd.get("confirm"));
      if (err) return { error: err };
      return changePassword(prev, fd);
    },
    null,
  );
  if (state?.ok) {
    return (
      <div className="flex flex-col gap-5">
        <div role="status">
          <Notice tone="ok">密碼已更新。下次請用 Email 與新密碼登入。</Notice>
        </div>
        <Link href={home} className={primaryBtn}>
          {home === "/account" ? "回到我的預約" : "回到後台"}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      {/* 讓密碼管理器知道這組新密碼屬於哪個帳號 */}
      <input type="email" name="username" autoComplete="username" value={email} hidden readOnly />
      <Field label="新密碼" htmlFor="new-password" hint={PASSWORD_RULE_TEXT}>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={72}
          className={inputCls}
        />
      </Field>
      <Field label="確認新密碼" htmlFor="confirm-password">
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          maxLength={72}
          className={inputCls}
        />
      </Field>
      {state?.error && (
        <div role="alert">
          <Notice tone="warn">{state.error}</Notice>
        </div>
      )}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "更新中…" : "更新密碼"}
      </button>
    </form>
  );
}

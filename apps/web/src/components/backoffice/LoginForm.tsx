"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendLoginLink, signInWithPassword, type LoginState } from "@/app/login/actions";
import { Field, Notice, inputCls, primaryBtn } from "@/components/booking/ui";

const linkBtn =
  "inline-flex min-h-[44px] cursor-pointer items-center self-start border-0 bg-transparent p-0 text-[15px] tracking-[.06em] text-body underline underline-offset-4 hover:text-rose-deep";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  return mode === "password" ? (
    <PasswordForm next={next} onUseLink={() => setMode("link")} />
  ) : (
    <MagicLinkForm next={next} onBack={() => setMode("password")} />
  );
}

function PasswordForm({ next, onUseLink }: { next?: string; onUseLink: () => void }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInWithPassword, null);
  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-5">
        {next && <input type="hidden" name="next" value={next} />}
        <Field label="Email" htmlFor="login-email">
          <input id="login-email" name="email" type="email" inputMode="email" autoComplete="username" required className={inputCls} />
        </Field>
        <Field label="密碼" htmlFor="login-password">
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputCls}
          />
        </Field>
        {state?.error && (
          <div role="alert">
            <Notice tone="warn">{state.error}</Notice>
          </div>
        )}
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? "登入中…" : "登入"}
        </button>
      </form>
      <button type="button" onClick={onUseLink} className={linkBtn}>
        忘記密碼？改用 Email 登入連結
      </button>
      <p className="m-0 border-t border-line pt-5 text-[15px] text-body">
        還沒有帳號？
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className={`${linkBtn} ml-1 inline-flex`}>
          註冊
        </Link>
      </p>
    </div>
  );
}

function MagicLinkForm({ next, onBack }: { next?: string; onBack: () => void }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, null);
  return (
    <div className="flex flex-col gap-5">
      {state?.sent ? (
        <div role="status">
          <Notice tone="ok">
            若此 Email 有帳號，我們已寄出登入連結。請到信箱點信中的連結，連結 60 分鐘內有效、只能使用一次；登入後可設定新密碼。
          </Notice>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-5">
          {next && <input type="hidden" name="next" value={next} />}
          <p className="m-0 text-[15px] leading-[1.9] text-body">
            輸入 Email，我們會寄一封一次性登入連結給妳。登入後會帶妳到「變更密碼」頁設定新密碼。
          </p>
          <Field label="Email" htmlFor="link-email" error={state?.error}>
            <input id="link-email" name="email" type="email" inputMode="email" autoComplete="email" required className={inputCls} />
          </Field>
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "寄送中…" : "寄送登入連結"}
          </button>
        </form>
      )}
      <button type="button" onClick={onBack} className={linkBtn}>
        ← 改用密碼登入
      </button>
    </div>
  );
}

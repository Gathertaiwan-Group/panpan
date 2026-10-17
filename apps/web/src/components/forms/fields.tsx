"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/app/actions";

/**
 * 以 onSubmit + startTransition 呼叫 Server Action：
 * 驗證失敗時不會像 <form action> 一樣自動清空使用者已填的內容。
 */
export function useFormAction(fn: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(fn, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending, fe: state?.fieldErrors ?? {} };
}

/** 原型輸入框：padding 13/14、1px input-line、cream 底、15px；行動版 16px 避免 iOS 自動放大 */
export const inputClass =
  "w-full appearance-none rounded-none border border-input-line bg-cream px-[14px] py-[13px] text-[16px] text-ink outline-none focus:border-rose-hover dt:text-[15px]";

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-[13px] tracking-[.1em] text-body">
      {label}
      {children}
      {error && <span className="text-[13px] tracking-[.04em] text-rose-deep">{error}</span>}
    </label>
  );
}

/** honeypot（視覺與輔助科技皆隱藏） */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        網站
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingText = "送出中…",
}: {
  children: ReactNode;
  pending: boolean;
  pendingText?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer border-0 bg-rose p-[15px] text-center text-[15px] tracking-[.2em] text-on-rose hover:bg-rose-deep disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 text-[13px] leading-[1.8] tracking-[.04em] text-rose-deep">
      {message}
    </p>
  );
}

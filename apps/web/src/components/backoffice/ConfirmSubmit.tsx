"use client";

import type { ReactNode } from "react";

/** 送出前跳確認視窗（不可逆操作用） */
export function ConfirmSubmit({
  message,
  className,
  name,
  value,
  children,
}: {
  message: string;
  className: string;
  name?: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useScrollLock } from "@/lib/scroll-lock";

/** 表單對話框：行動版為滿版（含 safe-area），桌面版置中 */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  useScrollLock(open);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(58,40,38,.45)] dt:items-center dt:p-6" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col overflow-auto overscroll-contain bg-white outline-none dt:max-h-[min(860px,calc(100dvh-48px))] dt:max-w-[560px] dt:border dt:border-line"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-[14px] dt:px-8 dt:pt-6 dt:pb-5">
          <div className="flex flex-col gap-1 pt-[10px]">
            {eyebrow && <span className="font-en text-[13px] tracking-[.24em] text-gold">{eyebrow}</span>}
            <h2 className="m-0 font-serif text-[20px] font-medium tracking-[.1em] text-ink">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-[26px] font-light text-rose-deep"
          >
            ×
          </button>
        </div>
        <div className="px-5 pt-6 pb-[calc(28px+env(safe-area-inset-bottom))] dt:px-8 dt:pb-8">{children}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

/** 與網站既有表單一致：直角、1px 線、cream 底；行動版 16px 避免 iOS 放大 */
export const inputCls =
  "w-full min-h-[48px] appearance-none rounded-none border border-input-line bg-cream px-[14px] py-[12px] text-[16px] text-ink outline-none focus:border-rose-hover";

export const primaryBtn =
  "inline-flex min-h-[48px] cursor-pointer items-center justify-center border-0 bg-rose px-7 py-[13px] text-center text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep disabled:cursor-not-allowed disabled:opacity-60";

export const ghostBtn =
  "inline-flex min-h-[48px] cursor-pointer items-center justify-center border border-rose bg-transparent px-6 py-[12px] text-center text-[15px] tracking-[.14em] text-rose-deep hover:bg-blush disabled:cursor-not-allowed disabled:opacity-60";

export const smallBtn =
  "inline-flex min-h-[44px] cursor-pointer items-center justify-center border border-line-2 bg-white px-4 text-[14px] tracking-[.08em] text-ink hover:border-rose hover:text-rose-deep disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[14px] tracking-[.1em] text-body">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-[13px] leading-[1.7] text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="text-[13px] tracking-[.04em] text-rose-deep">
          {error}
        </span>
      )}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok"; children: ReactNode }) {
  const cls =
    tone === "warn"
      ? "border-rose bg-[#fbeeea] text-rose-deep"
      : tone === "ok"
        ? "border-gold-line bg-[#f7f0e8] text-ink"
        : "border-line bg-blush text-body";
  return <div className={`border px-4 py-3 text-[14px] leading-[1.8] ${cls}`}>{children}</div>;
}

export const money = (n: number) => `NT$${n.toLocaleString("en-US")}`;

export function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h && m ? `${h} 小時 ${m} 分` : h ? `${h} 小時` : `${m} 分鐘`;
}

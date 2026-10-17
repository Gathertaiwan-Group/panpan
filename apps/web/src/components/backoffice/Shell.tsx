import Link from "next/link";
import type { ReactNode } from "react";

/** 後台頁不需要品牌收尾區塊（root layout 共用，這裡只在後台頁面隱藏） */
export function HideBrandClosing() {
  return <style>{`[data-screen-label="品牌收尾"]{display:none}`}</style>;
}

export function Shell({
  eyebrow,
  title,
  who,
  nav,
  active,
  children,
}: {
  eyebrow: string;
  title: string;
  who: string;
  nav: Array<{ href: string; label: string }>;
  active: string;
  children: ReactNode;
}) {
  return (
    <section className="px-4 pt-6 pb-16 dt:px-[clamp(20px,4vw,48px)] dt:pt-10">
      <HideBrandClosing />
      <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-en text-[13px] tracking-[.26em] text-gold">{eyebrow}</span>
            <h1 className="m-0 font-serif text-[24px] font-medium tracking-[.1em] text-ink">{title}</h1>
            <span className="truncate text-[13px] text-muted">{who}</span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="min-h-[44px] cursor-pointer border border-line-2 bg-white px-4 text-[14px] tracking-[.08em] text-body hover:text-rose-deep"
            >
              登出
            </button>
          </form>
        </header>
        <nav aria-label="後台選單" className="-mt-2 flex gap-1 overflow-x-auto">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active === n.href ? "page" : undefined}
              className={`flex min-h-[44px] shrink-0 items-center border-b-2 px-3 text-[15px] tracking-[.08em] ${
                active === n.href ? "border-rose text-rose-deep" : "border-transparent text-body hover:text-rose-deep"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </section>
  );
}

export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <div
      role={err ? "alert" : "status"}
      className={`border px-4 py-3 text-[14px] leading-[1.8] ${err ? "border-rose bg-row-hover text-rose-deep" : "border-gold-line bg-[#fdf3e6] text-ink"}`}
    >
      {err || msg}
    </div>
  );
}

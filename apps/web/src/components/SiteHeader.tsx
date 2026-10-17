"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import { NAV, activeSection } from "@/lib/nav";
import { useScrollLock } from "@/lib/scroll-lock";

export function SiteHeader() {
  const pathname = usePathname();
  const active = activeSection(pathname);
  const [open, setOpen] = useState(false);

  useScrollLock(open);

  // 換頁即關閉選單
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // 視窗拉寬到桌面版時自動關閉
    const mq = window.matchMedia("(min-width: 820px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-[rgba(255,249,245,.94)] backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5 px-[clamp(20px,4vw,48px)] py-[14px]">
          <Link href="/" aria-label="朵朵曉語 首頁" className="flex items-center gap-3 hover:text-inherit">
            <LogoMark />
            <span className="flex flex-col gap-[2px]">
              <span className="font-serif text-[21px] font-medium tracking-[.32em] text-rose-deep">朵朵曉語</span>
              <span className="font-en text-[11px] tracking-[.3em] text-muted">DUODUO WHISPERS</span>
            </span>
          </Link>

          <nav aria-label="主要導覽" className="hidden flex-wrap items-center gap-[clamp(14px,2.2vw,30px)] dt:flex">
            {NAV.filter((n) => n.key !== "home").map((n) => {
              const isActive = active === n.key;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  title={n.hint}
                  aria-current={isActive ? "page" : undefined}
                  className={`border-b py-[6px] text-[14px] tracking-[.12em] hover:text-rose-deep ${
                    isActive ? "border-rose-hover text-rose-deep" : "border-transparent text-body"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <Link
              href="/account"
              className="ml-1 inline-flex min-h-[38px] items-center border border-rose px-4 text-[13px] tracking-[.14em] text-rose-deep hover:bg-blush hover:text-rose-deep"
            >
              我的預約
            </Link>
          </nav>

          <button
            type="button"
            aria-label="選單"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
            className="-mr-2 flex h-11 w-11 cursor-pointer flex-col items-end justify-center gap-[7px] border-0 bg-transparent p-2 dt:hidden"
          >
            <span className="block h-px w-6 bg-rose-deep" />
            <span className="block h-px w-4 bg-rose-deep" />
          </button>
        </div>
      </header>

      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="網站選單"
          className="fixed inset-0 z-40 flex flex-col overflow-auto overscroll-contain bg-cream px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))] text-ink dt:hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoMark />
              <div className="flex flex-col gap-[2px]">
                <span className="font-serif text-[21px] font-medium tracking-[.32em] text-rose-deep">朵朵曉語</span>
                <span className="font-en text-[11px] tracking-[.3em] text-gold">DUODUO WHISPERS</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="關閉"
              autoFocus
              onClick={() => setOpen(false)}
              className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center border-0 bg-transparent text-[26px] font-light text-ink"
            >
              ×
            </button>
          </div>
          <nav aria-label="行動版導覽" className="mt-12 flex flex-col">
            {NAV.map((n) => {
              const isActive = active === n.key;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  onClick={close}
                  aria-current={isActive ? "page" : undefined}
                  className="flex items-center justify-between gap-4 border-b border-line py-4 text-ink hover:text-rose-deep"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-serif text-[21px] tracking-[.18em]">{n.label}</span>
                    {n.key !== "home" && <span className="text-[13px] tracking-[.08em] text-muted">{n.hint}</span>}
                  </span>
                  <span className="text-[15px] text-rose-deep">{isActive ? "✦" : "→"}</span>
                </Link>
              );
            })}
          </nav>
          <Link
            href="/account"
            onClick={close}
            className="mt-8 inline-flex min-h-[48px] items-center justify-center border border-rose text-[15px] tracking-[.16em] text-rose-deep hover:bg-blush hover:text-rose-deep"
          >
            我的預約／會員登入
          </Link>
          <span className="mt-auto pt-10 text-[13px] tracking-[.16em] text-muted">在人生轉場時・陪妳優雅重啟</span>
        </div>
      )}
    </>
  );
}

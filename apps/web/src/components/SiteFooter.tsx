import Link from "next/link";
import { NAV } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="bg-ink px-[clamp(20px,4vw,48px)] pt-14 pb-[calc(36px+env(safe-area-inset-bottom))] text-foot-text">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="flex flex-wrap justify-between gap-9">
          <div className="flex flex-col gap-2">
            <span className="font-serif text-[22px] tracking-[.32em] text-on-rose-2">朵朵曉語</span>
            <span className="font-en text-[12px] tracking-[.3em]">DUODUO WHISPERS</span>
            <span className="mt-[10px] text-[14px] tracking-[.16em]">在人生轉場時・陪妳優雅重啟</span>
          </div>
          {/* row-gap 0 + 連結上下 12px padding：視覺間距同原型 gap 24px，觸控區 ≥44px */}
          <nav aria-label="頁尾導覽" className="-my-3 flex flex-wrap items-start gap-x-6">
            {NAV.map((n) => (
              <Link key={n.key} href={n.href} className="py-3 text-[14px] tracking-[.1em] text-foot-text hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-[rgba(233,214,206,.2)] pt-[22px] text-[12px] tracking-[.1em] text-foot-muted">
          © 2026 朵朵曉語 Duoduo Whispers · 好好告別
        </div>
      </div>
    </footer>
  );
}

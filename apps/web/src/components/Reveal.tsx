"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 捲動淡入：掃描 [data-reveal]，進入視窗時加上 .is-in。
 * 只在 html.reveal-ready 且使用者未要求減少動態（CSS media query）時才會先隱藏，
 * 因此 JS 未載入、或 prefers-reduced-motion 時內容一律直接顯示。
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)");
    // 已在視窗內的元素直接顯示，避免換頁時首屏閃爍
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add("is-in");
      else io.observe(el);
    });
    root.classList.add("reveal-ready");
    return () => io.disconnect();
  }, [pathname]);
  return null;
}

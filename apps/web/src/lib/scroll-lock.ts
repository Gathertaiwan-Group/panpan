"use client";
import { useEffect } from "react";

/** 開啟時鎖住頁面捲動（全螢幕選單、對話框） */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    root.classList.add("scroll-locked");
    return () => root.classList.remove("scroll-locked");
  }, [locked]);
}

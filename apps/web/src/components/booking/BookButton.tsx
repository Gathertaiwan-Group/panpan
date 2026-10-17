"use client";

import { useEffect, useState } from "react";

export interface OnlineBooking {
  href: string;
  /** 取代「體驗內容、時長與價格　·　待提供」 */
  label: string;
}

/**
 * 體驗詳細頁用：查詢這個 SET 是否開放線上預約（booking_enabled＋供應商＋價格≥30＋時長）。
 * 開放 → 回傳預約頁連結與價格標示；否則 null（維持原本的「預約這段體驗／私訊詢問」）。
 */
export function useOnlineBooking(slug: string): OnlineBooking | null {
  const [info, setInfo] = useState<OnlineBooking | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/booking/sets/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { bookable?: boolean; price?: number; durationMinutes?: number } | null) => {
        if (!alive || !d?.bookable || !d.price || !d.durationMinutes) return;
        const h = Math.floor(d.durationMinutes / 60);
        const m = d.durationMinutes % 60;
        const dur = h && m ? `${h} 小時 ${m} 分` : h ? `${h} 小時` : `${m} 分鐘`;
        setInfo({
          href: `/farewell/${slug}/book`,
          label: `${dur}　·　NT$${d.price.toLocaleString("en-US")}　·　可線上預約`,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);
  return info;
}

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnlineBooking } from "./booking/BookButton";
import { Dialog } from "./Dialog";
import { BookingForm } from "./forms/BookingForm";

/** 詳細頁：資訊框按鈕 + 行動版底部固定 CTA + 預約詢問對話框 */
export function SetActions({ slug, name, lineUrl }: { slug: string; name: string; lineUrl: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const inquire = () => setOpen(true);
  const online = useOnlineBooking(slug); // 開放線上預約 → 「立即預約」導向預約頁
  const router = useRouter();
  const book = online ? () => router.push(online.href) : inquire;
  const bookLabel = online ? "立即預約" : "預約這段體驗";

  // 私訊詢問：有 LINE 官方帳號就開 LINE；未設定時改開預約詢問表單，避免死連結
  const dmButton = (className: string) =>
    lineUrl ? (
      <a href={lineUrl} target="_blank" rel="noopener noreferrer" className={className}>
        私訊詢問
      </a>
    ) : (
      <button type="button" onClick={inquire} className={className}>
        私訊詢問
      </button>
    );

  return (
    <>
      <div className="mt-3 flex flex-col gap-[14px] bg-blush p-6">
        <span className="text-[14px] tracking-[.14em] text-body">{online ? online.label : "體驗內容、時長與價格　·　待提供"}</span>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={book}
            className="cursor-pointer border-0 bg-rose px-7 py-[14px] text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep"
          >
            {bookLabel}
          </button>
          {dmButton("cursor-pointer border border-rose bg-transparent px-7 py-[13px] text-[15px] tracking-[.16em] text-rose-deep hover:text-rose-deep")}
        </div>
      </div>

      <div
        data-mobile-cta
        className="fixed right-0 bottom-0 left-0 z-30 flex gap-[10px] border-t border-line bg-[rgba(250,245,242,.97)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] dt:hidden"
      >
        {dmButton("flex-1 cursor-pointer border border-rose bg-transparent py-[14px] text-center text-[15px] tracking-[.12em] text-rose-deep hover:text-rose-deep")}
        <button
          type="button"
          onClick={book}
          className="flex-[1.6] cursor-pointer border-0 bg-rose py-[14px] text-center text-[15px] tracking-[.12em] text-on-rose"
        >
          {bookLabel}
        </button>
      </div>

      <Dialog open={open} onClose={close} title="預約這段體驗" eyebrow="BOOKING">
        <BookingForm setSlug={slug} setName={name} />
      </Dialog>
    </>
  );
}

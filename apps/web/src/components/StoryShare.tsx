"use client";

import { useCallback, useState } from "react";
import { Dialog } from "./Dialog";
import { StoryForm } from "./forms/StoryForm";

export function StoryShareButton() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer border-0 bg-rose px-[30px] py-[14px] text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep"
      >
        分享我的轉身故事
      </button>
      <Dialog open={open} onClose={close} title="分享我的轉身故事" eyebrow="SHARE YOUR STORY">
        <StoryForm />
      </Dialog>
    </>
  );
}

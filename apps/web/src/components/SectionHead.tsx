import type { ReactNode } from "react";

/** 區塊標題：英文眉標 + 一句主標（+ 選填一句短文） */
export function SectionHead({
  eyebrow,
  title,
  lead,
  center,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div data-reveal className={`flex flex-col gap-4 ${center ? "items-center text-center" : ""}`}>
      <span className="font-en text-[14px] tracking-[.3em] text-gold">{eyebrow}</span>
      <Tag className="poem m-0 font-serif text-[clamp(26px,3.2vw,40px)] leading-[1.55] font-normal tracking-[.08em] text-ink">
        {title}
      </Tag>
      {lead && <p className="poem m-0 max-w-[560px] font-serif text-[16px] leading-[2] tracking-[.06em] text-body">{lead}</p>}
    </div>
  );
}

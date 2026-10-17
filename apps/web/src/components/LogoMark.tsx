import Image from "next/image";
import mark from "../../public/images/logo-mark.webp";

/** 品牌 D 字花瓣標記（取自 logo.jpg 上半部、去背並改為珊瑚玫瑰色，適用乳白／花瓣粉底） */
export function LogoMark({ className = "h-[46px] w-auto" }: { className?: string }) {
  return <Image src={mark} alt="" aria-hidden priority sizes="56px" className={className} />;
}

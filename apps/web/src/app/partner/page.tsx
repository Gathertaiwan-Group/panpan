import Image from "next/image";
import { PartnerForm } from "@/components/forms/PartnerForm";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "一起創造美好",
  "讓你的專業，成為別人生命裡的一道光。誠摯邀請美甲、美髮、紋繡、攝影、花藝等「美麗的魔法師」一起創造美好體驗。",
  "/partner",
);

const MAGIC = [
  { title: "讓人重新喜歡鏡子裡的自己", tag: "美甲・美髮・紋繡", img: "/images/pillar-beauty.webp", alt: "剛做好裸粉色指甲的雙手" },
  { title: "用鏡頭留下重要的生命片刻", tag: "攝影・寫真", img: "/images/pillar-memory.webp", alt: "拍立得照片與乾燥玫瑰" },
  { title: "為新的開始增添一點意義", tag: "花藝・設計・生活", img: "/images/pillar-living.webp", alt: "窗邊的一杯熱茶與一枝洋桔梗" },
] as const;

export default function PartnerPage() {
  return (
    <>
      {/* 1. 開場：圖文左右 */}
      <section data-screen-label="一起創造美好" className="bg-rose text-on-rose">
        <div className="mx-auto grid max-w-[1240px] items-stretch dt:grid-cols-2">
          <div className="relative aspect-[3/2] overflow-hidden bg-rose-deep dt:order-2 dt:aspect-auto dt:min-h-[560px]">
            <Image
              src="/images/partner.webp"
              alt="職人們在亞麻桌布上一起整理玫瑰花束，旁邊擺著化妝刷、指甲油與底片相機"
              fill
              priority
              sizes="(max-width: 819px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="poem flex flex-col justify-center gap-6 px-[clamp(20px,5vw,72px)] py-[clamp(48px,7vw,96px)]">
            <span className="font-en text-[14px] tracking-[.3em] text-on-rose-2">CREATE BEAUTY TOGETHER</span>
            <h1 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.55] font-normal tracking-[.08em]">
              讓你的專業，
              <br />
              成為別人<span className="inline-block">生命裡的一道光。</span>
            </h1>
            <p className="m-0 font-serif text-[17px] leading-[2] tracking-[.06em]">
              <span className="inline-block">我們把用專業創造美好的你，</span>
              <span className="inline-block">稱為「美麗的魔法師」。</span>
            </p>
            <a
              href="#partner-form"
              className="inline-flex min-h-[48px] items-center self-start bg-on-rose px-[28px] text-[15px] tracking-[.16em] text-rose-deep hover:bg-white hover:text-rose-deep"
            >
              成為合作夥伴 ↓
            </a>
          </div>
        </div>
      </section>

      {/* 2. 三種魔法 */}
      <section data-screen-label="一起創造美好 魔法師" className="px-[clamp(20px,4vw,48px)] py-[clamp(64px,9vw,110px)]">
        <ul className="mx-auto m-0 grid max-w-[1140px] list-none gap-8 p-0 dt:grid-cols-3 dt:gap-7">
          {MAGIC.map((m, i) => (
            <li key={m.title} data-reveal style={{ ["--reveal-delay" as string]: `${i * 110}ms` }} className="flex flex-col gap-3">
              <div className="relative aspect-[3/2] overflow-hidden bg-blush">
                <Image src={m.img} alt={m.alt} fill sizes="(max-width: 819px) 100vw, 33vw" className="object-cover" />
              </div>
              <span className="mt-1 text-[13px] tracking-[.2em] text-gold">{m.tag}</span>
              <h2 className="poem m-0 font-serif text-[20px] leading-[1.6] font-normal tracking-[.06em] text-ink">{m.title}</h2>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. 合作表單 */}
      <section id="partner-form" className="scroll-mt-20 bg-blush px-[clamp(20px,4vw,48px)] py-[clamp(64px,9vw,110px)]">
        <div className="mx-auto grid max-w-[1140px] items-start gap-[clamp(32px,6vw,90px)] dt:grid-cols-[minmax(0,.8fr)_minmax(0,1fr)]">
          <div data-reveal className="poem flex flex-col gap-4 dt:sticky dt:top-[110px]">
            <span className="font-en text-[14px] tracking-[.3em] text-gold">JOIN US</span>
            <h2 className="m-0 font-serif text-[clamp(24px,2.8vw,34px)] leading-[1.6] font-normal tracking-[.08em] text-ink">
              不只是合作店家，
              <br />
              更是一起創造美好的同行者
            </h2>
          </div>
          <div className="flex flex-col gap-[18px] border border-line bg-white p-[clamp(24px,4vw,44px)]">
            <PartnerForm />
          </div>
        </div>
      </section>
    </>
  );
}

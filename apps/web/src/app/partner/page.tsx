import { PartnerForm } from "@/components/forms/PartnerForm";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta(
  "一起創造美好",
  "讓你的專業，成為別人生命裡的一道光。誠摯邀請美甲、美髮、紋繡、攝影、花藝等「美麗的魔法師」一起創造美好體驗。",
  "/partner",
);

export default function PartnerPage() {
  return (
    <>
      <section data-screen-label="一起創造美好" className="bg-rose px-[clamp(20px,4vw,48px)] py-[clamp(72px,10vw,130px)] text-on-rose">
        <div className="mx-auto flex max-w-[880px] flex-col gap-[26px]">
          <span className="font-en text-[14px] tracking-[.3em] text-on-rose-2">CREATE BEAUTY TOGETHER</span>
          <h1 className="poem m-0 font-serif text-[clamp(28px,3.8vw,46px)] leading-[1.55] font-normal tracking-[.08em]">
            讓你的專業，
            <br />
            成為別人
            <wbr />
            生命裡的一道光。
          </h1>
          <p className="poem m-0 font-serif text-[18px] leading-[2]">
            每一份用心，都值得被看見。
            <br />
            每一種專業，都有機會成為一段美好故事的開始。
          </p>
        </div>
      </section>
      <section className="px-[clamp(20px,4vw,48px)] py-[clamp(64px,9vw,110px)]">
        <div className="mx-auto grid max-w-[1140px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-[clamp(36px,6vw,90px)]">
          <div className="flex flex-col gap-5 text-[16px] leading-[2.1] text-body">
            <p className="m-0">
              我們相信，好的服務不只是完成一件價值交換的交易。它也可以是一份溫柔的陪伴，一次重新認識自己的機會，或是在人生重要的轉折裡，為一個人留下值得珍藏的回憶。
            </p>
            <p className="m-0">
              在不同領域裡，有許多用心的店家、專業的職人，以及擁有美感與熱情的創作者。我們把這些願意用專業創造美好的你，稱為
              <span className="font-serif whitespace-nowrap text-rose-deep">「美麗的魔法師」</span>。
            </p>
            <p className="m-0">
              也許，你擅長讓一個人重新喜歡鏡子裡的自己；也許，你能用鏡頭留下重要的生命片刻；也許，你的花藝、設計或一項用心的服務，能為一段新的開始增添意義。
            </p>
            <p className="m-0 font-serif text-ink">我們期待遇見的，不只是合作店家，更是認同這份理念、願意一起創造美好體驗的同行者。</p>
          </div>
          <div className="flex flex-col gap-[18px] border border-line bg-white p-[clamp(28px,4vw,44px)]">
            <PartnerForm />
          </div>
        </div>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { PhotoSlot } from "@/components/PhotoSlot";
import { getSets } from "@/lib/data";
import logo from "../../public/logo.jpg";
import { Phrase } from "@/components/Phrase";

export const revalidate = 300;

export default async function HomePage() {
  const sets = await getSets();
  return (
    <>
      <section data-screen-label="首頁 Hero" className="overflow-hidden bg-rose text-on-rose">
        <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-[clamp(32px,5vw,72px)] px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,80px)]">
          <div className="flex justify-center">
            <Image
              src={logo}
              alt="朵朵曉語 Logo"
              priority
              sizes="(max-width: 819px) 260px, 440px"
              className="hero-logo-mask aspect-[2/3] h-auto w-full max-w-[260px] object-cover dt:max-w-[440px]"
            />
          </div>
          <div className="flex flex-col gap-7">
            <span className="font-en text-[18px] tracking-[.14em] text-on-rose-2 italic">Every flower has its own season</span>
            <h1 className="m-0 font-serif text-[clamp(32px,4.2vw,54px)] leading-[1.45] font-normal tracking-[.08em]">
              每一朵花，
              <br />
              都有屬於自己的花期
            </h1>
            <p className="poem m-0 font-serif text-[clamp(16px,1.5vw,19px)] leading-[2] tracking-[.1em] text-on-rose">
              把走過的每一步人生，化作溫柔而堅定的心語
            </p>
            <div className="mt-2 flex flex-wrap gap-[14px]">
              <Link
                href="/about"
                className="bg-on-rose px-[30px] py-[15px] text-[15px] tracking-[.16em] text-rose-deep hover:bg-white hover:text-rose-deep"
              >
                認識朵朵 →
              </Link>
              <Link
                href="/farewell"
                className="border border-on-rose-2 px-[30px] py-[14px] text-[15px] tracking-[.16em] text-on-rose hover:bg-[rgba(255,255,255,.1)] hover:text-on-rose"
              >
                探索好好告別 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section data-screen-label="首頁 序言" className="px-6 py-[clamp(72px,10vw,140px)] text-center">
        <div className="poem mx-auto flex max-w-[620px] flex-col gap-[30px] font-serif text-[clamp(16px,1.6vw,19px)] leading-[2.2] tracking-[.08em] text-ink-2">
          <p className="m-0">
            人生很多時候，
            <br />
            我們常常會有告別一個人、<span className="whitespace-nowrap">一段關係、一種身分、</span>
            <br />
            一種生活，或是一種模式的時候——
            <br />
            同時，也正在重新認識自己。
          </p>
          <div className="mx-auto h-12 w-px bg-gold-line" />
          <p className="m-0">
            我相信，每個人都是世上獨一無二的一朵花，
            <br />
            都有屬於自己的花期。
          </p>
          <p className="m-0">
            有些日子，我們正在黑暗裡生根；
            <br />
            有些日子，我們終於迎來破曉。
            <br />
            而那些曾經走過的路，
            <br />
            也許最後都會成為我們綻放的養分。
          </p>
          <p className="m-0 text-[clamp(18px,1.9vw,22px)] text-rose-deep">
            我是朵朵，
            <br />
            這裡，是「朵朵曉語」。
          </p>
        </div>
      </section>

      <section data-screen-label="首頁 IP × 品牌" className="bg-blush px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-14">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-[clamp(28px,5vw,80px)]">
            <h2 className="m-0 font-serif text-[clamp(24px,2.8vw,34px)] leading-[1.7] font-normal tracking-[.08em] text-ink">
              朵朵的故事，
              <br />
              陪妳在每個人生轉場時刻，
              <br />
              一起找回最初的自己。
            </h2>
            <div className="flex flex-col gap-[18px] text-[16px] leading-[2.1] tracking-[.06em] text-body">
              <p className="m-0">每個人，都走在人生不同的季節。有些時候，我們正在告別；有些時候，我們正在重新開始。</p>
              <p className="m-0">
                而那些曾經走過的迷惘、失去與重新整理，慢慢也能變成帶給妳力量的種子。如果妳現在，也正在人生的某個轉場裡，希望這裡，能陪妳一起走一段。
              </p>
              <p className="m-0 font-serif text-rose-deep">不用急著成為誰，慢慢找回自己就好。</p>
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-6">
            <div className="flex flex-col gap-5 bg-cream p-[clamp(28px,4vw,48px)]">
              <span className="font-en text-[14px] tracking-[.3em] text-gold">WHISPERS</span>
              <h3 className="m-0 font-serif text-[26px] font-medium tracking-[.14em] text-rose-deep">朵朵曉語</h3>
              <p className="poem m-0 font-serif text-[18px] leading-[1.8] text-ink">把走過的人生，沉澱成溫柔且堅強的心語</p>
              <p className="m-0 text-[15px] leading-[2] text-body">這裡有我的故事、我的生活、我的體悟，也有那些一路走來，慢慢才明白的事。</p>
              <Link
                href="/whispers"
                className="hit mt-auto self-start border-b border-gold-line pb-1 text-[15px] tracking-[.14em] text-rose-deep"
              >
                走進朵朵曉語 →
              </Link>
            </div>
            <div className="flex flex-col gap-5 bg-rose p-[clamp(28px,4vw,48px)] text-on-rose">
              <span className="font-en text-[14px] tracking-[.3em] text-on-rose-2">A GRACEFUL FAREWELL</span>
              <h3 className="m-0 font-serif text-[26px] font-medium tracking-[.14em]">好好告別</h3>
              <p className="poem m-0 font-serif text-[18px] leading-[1.8]">陪妳，好好告別；也陪妳，好好開始。</p>
              <p className="m-0 text-[15px] leading-[2]">
                也許是一段讓自己重新變美的時光；也許是一張值得珍藏的照片；也許是一場只屬於自己的美好儀式。陪妳為每一個階段留下句點，也為下一個自己，留下美好的起點。
              </p>
              <Link
                href="/farewell"
                className="hit mt-auto self-start border-b border-on-rose-2 pb-1 text-[15px] tracking-[.14em] text-on-rose hover:text-on-rose-2"
              >
                探索好好告別 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section data-screen-label="首頁 體驗入口" className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)]">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-11">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <h2 className="m-0 font-serif text-[clamp(24px,2.8vw,34px)] font-normal tracking-[.1em]">為自己選一段值得的體驗</h2>
            <Link href="/farewell" className="hit text-[14px] tracking-[.14em] text-rose-deep">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
            {sets.map((s) => (
              <Link key={s.slug} href={`/farewell/${s.slug}`} className="flex flex-col gap-4 hover:opacity-[.88]">
                <PhotoSlot ratio="4/5" label={s.photo} src={s.coverUrl} sizes="(max-width: 819px) 100vw, 33vw" />
                <span className="font-en text-[13px] tracking-[.24em] text-gold">{s.no}</span>
                <h3 className="poem m-0 font-serif text-[21px] font-medium tracking-[.1em] text-ink">
                  <Phrase text={s.name} />
                </h3>
                <p className="m-0 text-[15px] leading-[1.9] text-body">{s.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

import Image from "next/image";

export function BrandClosing() {
  return (
    <section data-screen-label="品牌收尾" className="relative isolate overflow-hidden bg-ink-2 text-center text-white">
      <Image
        src="/images/closing.webp"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[50%_60%] opacity-90"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(58,40,38,.18)_0%,rgba(58,40,38,.55)_100%)]" />
      <div className="poem on-photo mx-auto flex min-h-[min(78svh,640px)] max-w-[640px] flex-col items-center justify-center gap-7 px-6 py-[clamp(88px,12vw,150px)] font-serif">
        <h2 data-reveal className="m-0 text-[clamp(26px,3.4vw,42px)] leading-[1.6] font-normal tracking-[.1em]">
          妳不需要急著開花。
          <br />
          <span className="inline-block">每一朵花，</span>
          <span className="inline-block">都有自己的花期。</span>
        </h2>
        <div aria-hidden className="h-11 w-px bg-on-rose-2" />
        <p data-reveal className="m-0 text-[17px] leading-[2] tracking-[.1em] text-on-rose">
          <span className="inline-block">願我們都能，好好告別，</span>
          <span className="inline-block">然後好好開始。</span>
        </p>
      </div>
    </section>
  );
}

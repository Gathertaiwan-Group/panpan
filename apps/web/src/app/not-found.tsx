import Link from "next/link";

export default function NotFound() {
  return (
    <section className="px-[clamp(20px,4vw,48px)] py-[clamp(72px,9vw,120px)] text-center">
      <div className="mx-auto flex max-w-[600px] flex-col items-center gap-6">
        <span className="font-en text-[14px] tracking-[.3em] text-gold">PAGE NOT FOUND</span>
        <h1 className="m-0 font-serif text-[clamp(26px,3.2vw,40px)] leading-[1.6] font-normal tracking-[.08em]">這一頁，暫時還沒有開花。</h1>
        <Link href="/" className="bg-rose px-[30px] py-[14px] text-[15px] tracking-[.16em] text-on-rose hover:bg-rose-deep hover:text-on-rose">
          回到首頁 →
        </Link>
      </div>
    </section>
  );
}

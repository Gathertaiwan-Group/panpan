import Image, { type StaticImageData } from "next/image";

/** 固定比例的圖片框（直角、無陰影） */
export function Photo({
  src,
  alt,
  ratio,
  sizes,
  priority,
  className = "",
  imgClassName = "",
}: {
  src: string | StaticImageData;
  alt: string;
  ratio: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-blush ${className}`} style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${imgClassName}`} />
    </div>
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "朵朵曉語 Duoduo Whispers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG 圖：玫瑰底 + 品牌 Logo（logo.jpg 本身為玫瑰底，置中即無縫） */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "logo.jpg"));
  const src = `data:image/jpeg;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", background: "#A35B55" }}>
        <img src={src} width={420} height={630} alt="" />
      </div>
    ),
    size,
  );
}

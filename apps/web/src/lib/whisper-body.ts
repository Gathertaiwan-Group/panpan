/** 心語內文格式（content.json._format）："## " 小標、"> " 引言、"——" 署名，其餘為內文 */
export type WhisperBlock =
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "sign"; text: string }
  | { kind: "para"; text: string };

export function parseWhisperBody(body: string): WhisperBlock[] {
  return body
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l): WhisperBlock => {
      if (l.startsWith("## ")) return { kind: "heading", text: l.slice(3) };
      if (l.startsWith("> ")) return { kind: "quote", text: l.slice(2) };
      if (l.startsWith("——")) return { kind: "sign", text: l };
      return { kind: "para", text: l };
    });
}

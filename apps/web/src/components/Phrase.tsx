import { Fragment } from "react";

/** 不在這些字前面換行（虛字黏前一詞），避免「枯萎／的生活」 */
const GLUE = new Set(["的", "了", "得", "地", "之", "著", "們", "嗎", "呢", "吧"]);
const segmenter = new Intl.Segmenter("zh-Hant", { granularity: "word" });

const isWord = (s: string) => /[\p{L}\p{N}]/u.test(s);
const isSpace = (s: string) => s.trim() === "";
const isOpen = (s: string) => /^[\p{Ps}\p{Pi}]/u.test(s);
/** 連接符號（如「絨霧眉／霧唇」）：前後不拆開 */
const isJoiner = (s: string) => /^[／/]$/.test(s);
const endsClause = (s: string) => !isWord(s) && !isSpace(s) && !isOpen(s) && !isJoiner(s);

type Piece = { space: string } | { words: string[] };

/** 依標點與空白切成子句（標點留在子句尾、空白留在子句之間），子句內再依詞切分 */
function toPieces(text: string): Piece[] {
  const out: Piece[] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur });
    cur = [];
  };
  for (const { segment } of segmenter.segment(text)) {
    if (isSpace(segment)) {
      flush();
      out.push({ space: segment });
      continue;
    }
    const last = cur[cur.length - 1];
    // 開括號另起子句；詞接在句讀標點後也另起子句
    if (last !== undefined && ((isOpen(segment) && !isOpen(last)) || (isWord(segment) && endsClause(last)))) flush();
    cur.push(segment);
  }
  flush();
  return out;
}

/**
 * 後台資料標題用的中文斷行：
 * - 行動版（父層 .poem）：先在標點處換行（每個子句是 inline-block），子句本身放不下才在詞界換行，
 *   不會出現「一／件事」「我不是離開一個人／，」這種拆詞或標點行首。
 * - 桌面沒有 keep-all、子句為一般 inline，<wbr> 不改變原本斷行。文字內容不變。
 */
export function Phrase({ text }: { text: string }) {
  return (
    <>
      {toPieces(text).map((p, ci) =>
        "space" in p ? (
          <Fragment key={ci}>{p.space}</Fragment>
        ) : (
          <span key={ci} className="phrase-clause">
            {p.words.map((w, i) => (
              <Fragment key={i}>
                {i > 0 && isWord(w) && isWord(p.words[i - 1]) && !GLUE.has(w) && <wbr />}
                {w}
              </Fragment>
            ))}
          </span>
        ),
      )}
    </>
  );
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 一律以台北時間顯示（不依賴伺服器／瀏覽器時區） */
export function taipeiParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  return {
    date: `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）`,
    time: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
  };
}

export function whenLabel(startsAt: string, endsAt: string): string {
  const s = taipeiParts(startsAt);
  const e = taipeiParts(endsAt);
  return `${s.date} ${s.time}–${e.time}`;
}

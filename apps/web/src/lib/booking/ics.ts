/** 產生單一事件的 .ics（UTC 時間；RFC 5545 文字跳脫、75 octet 折行簡化為 72 字元） */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function fold(line: string): string {
  const chars = [...line];
  if (chars.length <= 72) return line;
  const out: string[] = [];
  for (let i = 0; i < chars.length; i += 72) out.push((i ? " " : "") + chars.slice(i, i + 72).join(""));
  return out.join("\r\n");
}

export function buildIcs(e: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  now?: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Duoduo Whispers//Booking//ZH-TW",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${esc(e.uid)}`,
    `DTSTAMP:${utc(e.now ?? new Date())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${esc(e.summary)}`,
    `DESCRIPTION:${esc(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

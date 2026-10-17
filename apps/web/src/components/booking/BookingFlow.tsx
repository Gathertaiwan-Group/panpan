"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DayView } from "@/lib/booking/availability";
import { Field, Notice, durationLabel, ghostBtn, inputCls, money, primaryBtn } from "./ui";

type Step = "date" | "time" | "info" | "confirm";
const STEPS: Step[] = ["date", "time", "info", "confirm"];
const STEP_LABEL: Record<Step, string> = { date: "選日期", time: "選時段", info: "填資料", confirm: "確認付款" };
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export interface FlowSet {
  slug: string;
  code: string;
  name: string;
  price: number;
  durationMinutes: number;
}

interface Info {
  name: string;
  phone: string;
  email: string;
  note: string;
  consent: boolean;
}

const EMPTY_INFO: Info = { name: "", phone: "", email: "", note: "", consent: false };

function addMinutes(time: string, min: number): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const t = h * 60 + m + min;
  const hh = Math.floor(t / 60) % 24;
  return `${String(hh).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}${t >= 24 * 60 ? "（隔日）" : ""}`;
}

function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${y}/${m}/${d}（${WEEK[wd]}）`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y} 年 ${Number(m)} 月`;
}

function readUrl(): { step: Step; date: string; time: string } {
  const sp = new URLSearchParams(window.location.search);
  const step = (STEPS as string[]).includes(sp.get("step") ?? "") ? (sp.get("step") as Step) : "date";
  return { step, date: sp.get("date") ?? "", time: sp.get("time") ?? "" };
}

const DRAFT_KEY = "dd-booking-info";

export function BookingFlow({
  set,
  atmEnabled,
  initialMonth,
  prefill,
}: {
  set: FlowSet;
  atmEnabled: boolean;
  initialMonth: string;
  /** 已登入會員：預填稱呼與 Email（草稿已有內容時以草稿為準） */
  prefill?: { name: string; email: string };
}) {
  const [step, setStep] = useState<Step>("date");
  const [month, setMonth] = useState(initialMonth);
  const [months, setMonths] = useState<string[]>([initialMonth]);
  const [days, setDays] = useState<Record<string, Record<string, DayView>>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [info, setInfo] = useState<Info>(EMPTY_INFO);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payMethod, setPayMethod] = useState<"card" | "atm">("card");
  const [banner, setBanner] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ---- 網址同步（重新整理／上一頁可回到同一步） ----
  const go = useCallback((next: Step, d = date, t = time, push = true) => {
    const sp = new URLSearchParams();
    sp.set("step", next);
    if (d) sp.set("date", d);
    if (t) sp.set("time", t);
    const url = `${window.location.pathname}?${sp.toString()}`;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [date, time]);

  useEffect(() => {
    const apply = () => {
      const u = readUrl();
      setDate(u.date);
      setTime(u.time);
      if (u.date) setMonth(u.date.slice(0, 7));
      // 沒有日期／時段就不能停在後面的步驟
      const s: Step = !u.date ? "date" : !u.time && u.step !== "date" ? "time" : u.step;
      setStep(s);
    };
    apply();
    let draft: Partial<Info> = {};
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) draft = JSON.parse(raw) as Partial<Info>;
    } catch {
      /* 無痕模式等：略過 */
    }
    setInfo({
      ...EMPTY_INFO,
      ...draft,
      name: draft.name || prefill?.name || "",
      email: draft.email || prefill?.email || "",
      consent: false,
    });
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
    // 只在掛載時還原一次（prefill 由伺服器給、不會變）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const { name, phone, email, note } = info;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name, phone, email, note }));
    } catch {
      /* 略過 */
    }
  }, [info]);

  // ---- 可預約時段 ----
  const load = useCallback(
    async (m: string, force = false) => {
      if (!force && days[m]) return;
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch(`/api/booking/availability?slug=${encodeURIComponent(set.slug)}&month=${m}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { months: string[]; days: Record<string, DayView> };
        setMonths(data.months);
        setDays((prev) => ({ ...prev, [m]: data.days }));
      } catch {
        setLoadError("讀取可預約時段失敗，請稍後再試。");
      } finally {
        setLoading(false);
      }
    },
    [days, set.slug],
  );

  useEffect(() => {
    void load(month);
  }, [month, load]);

  const monthDays = days[month];
  const day: DayView | undefined = date ? days[date.slice(0, 7)]?.[date] : undefined;
  const slot = day?.slots.find((s) => s.time === time);
  const atmAllowed = atmEnabled && Boolean(slot?.atm);

  useEffect(() => {
    if (!atmAllowed && payMethod === "atm") setPayMethod("card");
  }, [atmAllowed, payMethod]);

  // 選好的日期／時段已不可約（例如重新整理後）→ 退回
  useEffect(() => {
    if (!day) return;
    if (step !== "date" && day.status !== "open") {
      setBanner("這一天已經沒有可預約的時段，請改選其他日期。");
      go("date", "", "", false);
    } else if ((step === "info" || step === "confirm") && (!slot || !slot.available)) {
      setBanner("這個時段已經無法預約，請改選其他時段。");
      go("time", date, "", false);
    }
  }, [day, slot, step, date, go]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number) as [number, number];
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: Array<string | null> = Array.from({ length: first }, () => null);
    for (let d = 1; d <= n; d++) out.push(`${month}-${String(d).padStart(2, "0")}`);
    return out;
  }, [month]);

  const monthIdx = months.indexOf(month);

  // ---- 驗證 ----
  function validateInfo(): boolean {
    const e: Record<string, string> = {};
    if (!info.name.trim()) e.name = "請填寫稱呼";
    const phone = info.phone.replace(/\D/g, "").replace(/^886/, "0");
    if (!/^09\d{8}$/.test(phone)) e.phone = "請填寫台灣手機號碼（09 開頭共 10 碼）";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(info.email.trim())) e.email = "Email 格式不正確";
    if (info.note.length > 500) e.note = "備註請在 500 字以內";
    if (!info.consent) e.consent = "請閱讀並勾選同意預約須知";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (submitting) return;
    if (!validateInfo()) {
      go("info");
      return;
    }
    setSubmitting(true);
    setBanner("");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: set.slug,
          date,
          time,
          payMethod,
          name: info.name,
          phone: info.phone,
          email: info.email,
          note: info.note,
          consent: info.consent,
          website: "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        message?: string;
        payUrl?: string;
        fieldErrors?: Record<string, string>;
      };
      if (res.ok && data.ok && data.payUrl) {
        window.location.assign(data.payUrl);
        return;
      }
      if (data.code === "slot_taken" || data.code === "slot_unavailable" || data.code === "out_of_range") {
        await load(date.slice(0, 7), true);
        setBanner(data.message || "這個時段剛剛被預約了，請改選其他時段。");
        go("time", date, "", false);
      } else if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        setBanner(data.message || "請檢查欄位內容。");
        go("info");
      } else {
        setBanner(data.message || "送出失敗，請稍後再試一次。");
      }
    } catch {
      setBanner("網路連線不穩，請稍後再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- 底部操作列 ----
  const primary: { label: string; disabled: boolean; onClick: () => void } =
    step === "date"
      ? { label: "下一步：選時段", disabled: !date || day?.status !== "open", onClick: () => go("time") }
      : step === "time"
        ? { label: "下一步：填資料", disabled: !slot?.available, onClick: () => go("info") }
        : step === "info"
          ? { label: "下一步：確認", disabled: false, onClick: () => validateInfo() && go("confirm") }
          : { label: submitting ? "前往付款中…" : `確認並前往付款 ${money(set.price)}`, disabled: submitting, onClick: submit };

  const stepIndex = STEPS.indexOf(step);
  const summary = date ? `${dateLabel(date)}${time ? ` ${time}–${addMinutes(time, set.durationMinutes)}` : ""}` : "尚未選擇日期";

  return (
    <div className="flex flex-col gap-7">
      {/* 步驟指示 */}
      <ol className="m-0 grid list-none grid-cols-4 gap-1 p-0" aria-label="預約步驟">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={`border-t-2 pt-2 text-center text-[13px] tracking-[.08em] ${
              i <= stepIndex ? "border-rose text-rose-deep" : "border-line text-muted"
            }`}
          >
            <span className="font-en text-[13px]">{String(i + 1).padStart(2, "0")}</span>
            <span className="block">{STEP_LABEL[s]}</span>
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="m-0 font-serif text-[22px] font-normal tracking-[.1em] text-ink outline-none">
        {step === "date" && "選擇日期"}
        {step === "time" && `選擇時段｜${date ? dateLabel(date) : ""}`}
        {step === "info" && "填寫預約資料"}
        {step === "confirm" && "確認預約內容"}
      </h2>

      {banner && (
        <div role="alert">
          <Notice tone="warn">{banner}</Notice>
        </div>
      )}

      {step === "date" && (
        <section aria-label="月曆" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] cursor-pointer border border-line bg-white text-[18px] text-rose-deep disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setMonth(months[monthIdx - 1])}
              disabled={monthIdx <= 0}
              aria-label="上個月"
            >
              ‹
            </button>
            <span className="font-serif text-[18px] tracking-[.12em] text-ink" aria-live="polite">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              className="min-h-[44px] min-w-[44px] cursor-pointer border border-line bg-white text-[18px] text-rose-deep disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setMonth(months[monthIdx + 1])}
              disabled={monthIdx < 0 || monthIdx >= months.length - 1}
              aria-label="下個月"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[13px] text-muted" aria-hidden="true">
            {WEEK.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          {loadError ? (
            <Notice tone="warn">{loadError}</Notice>
          ) : (
            <div className="grid grid-cols-7 gap-1" aria-busy={loading}>
              {cells.map((d, i) => {
                if (!d) return <span key={`b${i}`} />;
                const v = monthDays?.[d];
                const open = v?.status === "open";
                const selected = d === date;
                const n = Number(d.slice(8));
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!open}
                    aria-pressed={selected}
                    aria-label={`${dateLabel(d)}${open ? "，可預約" : v?.status === "full" ? "，已額滿" : "，不開放"}`}
                    onClick={() => {
                      setBanner("");
                      setDate(d);
                      setTime("");
                      go("time", d, "");
                    }}
                    className={`flex min-h-[48px] flex-col items-center justify-center gap-[2px] border text-[16px] ${
                      selected
                        ? "border-rose bg-rose text-on-rose"
                        : open
                          ? "cursor-pointer border-line-2 bg-white text-ink hover:border-rose"
                          : "cursor-default border-transparent bg-transparent text-[#c4b0aa]"
                    }`}
                  >
                    <span>{n}</span>
                    {v?.status === "full" && <span className="text-[10px] leading-none tracking-normal">額滿</span>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="m-0 text-[13px] leading-[1.8] text-muted">
            {loading ? "讀取中…" : "可預約 24 小時後至 60 天內的時段。白底日期可以點選。"}
          </p>
        </section>
      )}

      {step === "time" && (
        <section aria-label="時段" className="flex flex-col gap-4">
          {!day ? (
            <p className="m-0 text-[15px] text-muted">讀取中…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 dt:grid-cols-3">
              {day.slots.map((s) => {
                const selected = s.time === time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    aria-pressed={selected}
                    onClick={() => {
                      setBanner("");
                      setTime(s.time);
                      go("info", date, s.time);
                    }}
                    className={`min-h-[52px] border px-2 text-[16px] tracking-[.06em] ${
                      selected
                        ? "border-rose bg-rose text-on-rose"
                        : s.available
                          ? "cursor-pointer border-line-2 bg-white text-ink hover:border-rose"
                          : "cursor-not-allowed border-line bg-transparent text-[#b9a39d] line-through"
                    }`}
                  >
                    {s.time}–{addMinutes(s.time, set.durationMinutes)}
                    {!s.available && <span className="sr-only">（不可預約）</span>}
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" className={`${ghostBtn} self-start`} onClick={() => go("date", date, "")}>
            ← 改選日期
          </button>
        </section>
      )}

      {step === "info" && (
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (validateInfo()) go("confirm");
          }}
        >
          <Field label="怎麼稱呼妳" htmlFor="bk-name" error={errors.name}>
            <input
              id="bk-name"
              className={inputCls}
              autoComplete="name"
              maxLength={40}
              value={info.name}
              onChange={(e) => setInfo({ ...info, name: e.target.value })}
            />
          </Field>
          <Field label="手機" htmlFor="bk-phone" error={errors.phone} hint="供應商會用這支電話與妳聯繫地點與細節">
            <input
              id="bk-phone"
              className={inputCls}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={info.phone}
              onChange={(e) => setInfo({ ...info, phone: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="bk-email" error={errors.email} hint="確認信與行事曆檔會寄到這裡">
            <input
              id="bk-email"
              className={inputCls}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={info.email}
              onChange={(e) => setInfo({ ...info, email: e.target.value })}
            />
          </Field>
          <Field label="想讓我們知道的事（選填）" htmlFor="bk-note" error={errors.note}>
            <textarea
              id="bk-note"
              className={`${inputCls} min-h-[110px] resize-y`}
              rows={4}
              maxLength={500}
              value={info.note}
              onChange={(e) => setInfo({ ...info, note: e.target.value })}
            />
          </Field>

          <details className="border border-line bg-white px-4 py-3 text-[14px] leading-[1.9] text-body">
            <summary className="flex min-h-[44px] cursor-pointer items-center text-ink">預約須知（請展開閱讀）</summary>
            <ul className="m-0 mt-2 flex flex-col gap-1 pl-5">
              <li>本體驗採線上全額付款，付款完成即確認預約，不需等待回覆。</li>
              <li>信用卡付款請於 15 分鐘內完成；ATM 轉帳請於繳費期限內完成，逾時時段將自動釋出。</li>
              <li>確認後，負責的供應商會在體驗前與妳聯繫，確認地點與細節。</li>
              <li>如需改期或取消，請回覆確認信或私訊與我們聯繫，我們會協助處理；退款依實際情況以原付款方式辦理。</li>
              <li>妳填寫的資料只用於這次預約的聯繫與服務提供。</li>
            </ul>
          </details>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[15px] leading-[1.7] text-ink">
              <input
                type="checkbox"
                className="mt-[3px] h-5 w-5 shrink-0 accent-[#a35b55]"
                checked={info.consent}
                onChange={(e) => setInfo({ ...info, consent: e.target.checked })}
              />
              我已閱讀並同意預約須知
            </label>
            {errors.consent && (
              <span role="alert" className="text-[13px] text-rose-deep">
                {errors.consent}
              </span>
            )}
          </div>
          <button type="submit" className="sr-only">
            下一步
          </button>
          <button type="button" className={`${ghostBtn} self-start`} onClick={() => go("time", date, time)}>
            ← 改選時段
          </button>
        </form>
      )}

      {step === "confirm" && (
        <section className="flex flex-col gap-5">
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 border border-line bg-white p-5 text-[15px] leading-[1.7]">
            <dt className="text-muted">體驗</dt>
            <dd className="m-0 text-ink">{set.name}</dd>
            <dt className="text-muted">日期時間</dt>
            <dd className="m-0 text-ink">
              {dateLabel(date)}
              <br />
              {time}–{addMinutes(time, set.durationMinutes)}（{durationLabel(set.durationMinutes)}）
            </dd>
            <dt className="text-muted">稱呼</dt>
            <dd className="m-0 break-all text-ink">{info.name}</dd>
            <dt className="text-muted">手機</dt>
            <dd className="m-0 text-ink">{info.phone}</dd>
            <dt className="text-muted">Email</dt>
            <dd className="m-0 break-all text-ink">{info.email}</dd>
            {info.note && (
              <>
                <dt className="text-muted">備註</dt>
                <dd className="m-0 [overflow-wrap:anywhere] whitespace-pre-wrap text-ink">{info.note}</dd>
              </>
            )}
            <dt className="text-muted">金額</dt>
            <dd className="m-0 font-serif text-[18px] text-rose-deep">{money(set.price)}</dd>
          </dl>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-[14px] tracking-[.1em] text-body">付款方式</legend>
            <label className="flex min-h-[52px] cursor-pointer items-center gap-3 border border-line-2 bg-white px-4 text-[15px] has-[:checked]:border-rose">
              <input
                type="radio"
                name="pay"
                className="h-5 w-5 accent-[#a35b55]"
                checked={payMethod === "card"}
                onChange={() => setPayMethod("card")}
              />
              <span>
                信用卡
                <span className="block text-[13px] text-muted">付款完成立即確認；請於 15 分鐘內完成</span>
              </span>
            </label>
            {atmEnabled && (
              <label
                className={`flex min-h-[52px] items-center gap-3 border border-line-2 bg-white px-4 text-[15px] has-[:checked]:border-rose ${
                  atmAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
              >
                <input
                  type="radio"
                  name="pay"
                  className="h-5 w-5 accent-[#a35b55]"
                  disabled={!atmAllowed}
                  checked={payMethod === "atm"}
                  onChange={() => setPayMethod("atm")}
                />
                <span>
                  ATM 轉帳
                  <span className="block text-[13px] text-muted">
                    {atmAllowed ? "取得轉帳帳號後，請於 2 天內完成轉帳" : "只適用於 72 小時之後的時段"}
                  </span>
                </span>
              </label>
            )}
          </fieldset>
          <p className="m-0 text-[13px] leading-[1.8] text-muted">
            按下付款後，會前往 PChomePay 支付連的安全付款頁面。付款完成即確認預約，確認信會寄到妳的 Email。
          </p>
          <button type="button" className={`${ghostBtn} self-start`} onClick={() => go("info")}>
            ← 修改資料
          </button>
        </section>
      )}

      {/* 操作列：行動版固定在底部（data-mobile-cta 讓 footer 自動加高避免被遮），桌面版跟在內容後 */}
      <div
        data-mobile-cta
        className="fixed right-0 bottom-0 left-0 z-30 flex items-center gap-3 border-t border-line bg-[rgba(250,245,242,.97)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] dt:static dt:border-0 dt:bg-transparent dt:p-0"
      >
        <div className="min-w-0 flex-1 text-[13px] leading-[1.5] text-body dt:hidden">
          <span className="block truncate text-ink">{set.name}</span>
          <span className="block truncate">{summary}</span>
        </div>
        <button
          type="button"
          className={`${primaryBtn} shrink-0 px-5 dt:px-9`}
          disabled={primary.disabled}
          onClick={primary.onClick}
        >
          {primary.label}
        </button>
      </div>
    </div>
  );
}

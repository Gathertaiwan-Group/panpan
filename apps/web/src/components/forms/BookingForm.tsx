"use client";

import { submitBooking } from "@/app/actions";
import { Field, FormError, Honeypot, SubmitButton, inputClass, useFormAction } from "./fields";

export function BookingForm({ setSlug, setName }: { setSlug: string; setName: string }) {
  const { state, onSubmit, pending, fe } = useFormAction(submitBooking);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-[14px] py-10 text-center" role="status">
        <span className="font-serif text-[22px] tracking-[.1em] text-rose-deep">謝謝妳，已收到妳的預約詢問</span>
        <span className="text-[15px] leading-[1.9] text-body">我們會盡快與妳聯繫，確認體驗內容與時間。</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative flex flex-col gap-[18px]" noValidate>
      <Honeypot />
      <input type="hidden" name="set_slug" value={setSlug} />
      <p className="m-0 font-serif text-[16px] leading-[1.9] text-rose-deep">{setName}</p>
      <Field label="怎麼稱呼妳" error={fe.name}>
        <input name="name" required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="聯絡方式（Email／LINE／電話）" error={fe.contact}>
        <input name="contact" required className={inputClass} />
      </Field>
      <Field label="希望的日期（選填）" error={fe.preferred_date}>
        <input name="preferred_date" type="date" className={`${inputClass} min-h-[50px]`} />
      </Field>
      <Field label="想對我們說的話（選填）" error={fe.message}>
        <textarea name="message" rows={4} className={`${inputClass} resize-y`} />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton pending={pending}>送出預約詢問</SubmitButton>
    </form>
  );
}

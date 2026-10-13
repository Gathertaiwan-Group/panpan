"use client";

import { submitStory } from "@/app/actions";
import { Field, FormError, Honeypot, SubmitButton, inputClass, useFormAction } from "./fields";

export function StoryForm() {
  const { state, onSubmit, pending, fe } = useFormAction(submitStory);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-[14px] py-10 text-center" role="status">
        <span className="font-serif text-[22px] tracking-[.1em] text-rose-deep">謝謝妳願意分享</span>
        <span className="text-[15px] leading-[1.9] text-body">
          我們會細心閱讀妳的故事；任何公開前，都會再次與妳確認。
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative flex flex-col gap-[18px]" noValidate>
      <Honeypot />
      <Field label="怎麼稱呼妳（選填）" error={fe.name}>
        <input name="name" autoComplete="name" className={inputClass} />
      </Field>
      <Field label="聯絡方式（Email／LINE）" error={fe.contact}>
        <input name="contact" required className={inputClass} />
      </Field>
      <Field label="妳的轉身故事" error={fe.story}>
        <textarea name="story" rows={7} required className={`${inputClass} resize-y`} />
      </Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-[1.8] text-body">
        <input type="checkbox" name="wants_anonymous" defaultChecked className="mt-[5px] h-[18px] w-[18px] shrink-0 accent-rose" />
        若公開，我希望以匿名方式呈現
      </label>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-[1.8] text-body">
        <input type="checkbox" name="consent_given" required className="mt-[5px] h-[18px] w-[18px] shrink-0 accent-rose" />
        <span>
          我同意朵朵曉語閱讀並保存這段分享。公開前會再次徵得我的同意，我也可以隨時要求撤回公開。
          {fe.consent_given && <span className="block text-[13px] text-rose-deep">{fe.consent_given}</span>}
        </span>
      </label>
      <span className="text-[13px] leading-[1.8] text-muted">
        分享與公開故事均須取得當事人同意，並尊重匿名、隱私及撤回公開的意願。
      </span>
      <FormError message={state?.error} />
      <SubmitButton pending={pending}>送出我的故事</SubmitButton>
    </form>
  );
}

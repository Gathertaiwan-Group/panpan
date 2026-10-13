"use client";

import { content } from "@duoduo/content";
import { submitPartner } from "@/app/actions";
import { Field, FormError, Honeypot, SubmitButton, inputClass, useFormAction } from "./fields";

const fields = content.partnerFormFields;
const fieldOf = (name: string) => fields.find((f) => f.name === name)!;

export function PartnerForm() {
  const { state, onSubmit, pending, fe } = useFormAction(submitPartner);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-[14px] py-10 text-center" role="status">
        <span className="font-serif text-[22px] tracking-[.1em] text-rose-deep">謝謝你，美麗的魔法師</span>
        <span className="text-[15px] leading-[1.9] text-body">我們會盡快與你聯繫。</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative flex flex-col gap-[18px]" noValidate>
      <h3 className="m-0 font-serif text-[22px] font-medium tracking-[.12em]">成為美麗的魔法師</h3>
      <Honeypot />
      <Field label={fieldOf("brand_name").label} error={fe.brand_name}>
        <input name="brand_name" required autoComplete="organization" className={inputClass} />
      </Field>
      <Field label={fieldOf("field").label} error={fe.field}>
        <select name="field" required className={`${inputClass} select-chevron`} defaultValue={fieldOf("field").options?.[0]}>
          {fieldOf("field").options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Field>
      <Field label={fieldOf("contact").label} error={fe.contact}>
        <input name="contact" required className={inputClass} />
      </Field>
      <Field label={fieldOf("message").label} error={fe.message}>
        <textarea name="message" rows={4} className={`${inputClass} resize-y`} />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton pending={pending}>送出合作意願</SubmitButton>
    </form>
  );
}

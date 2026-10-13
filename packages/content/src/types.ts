/** 型別對應 content.json（逐字文案來源，亦為 Supabase seed 來源）。 */
export type NavKey = "home" | "farewell" | "about" | "stories" | "whispers" | "partner";

export interface NavItem {
  key: NavKey;
  label: string;
}

export interface ExperienceSetRaw {
  key: string;
  no: string;
  name: string;
  photo: string;
  tagline: string;
  desc: string;
  headline: string;
  body: string[];
}

export interface Pillar {
  zh: string;
  en: string;
}

export interface StoryRaw {
  no: string;
  title: string;
  desc: string;
}

export interface StoryPart {
  title: string;
  hint: string;
}

export interface WhisperRaw {
  no: string;
  theme: string;
  title: string;
  sub: string;
  letterTo: string;
  letter: string;
  body: string;
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

export interface ContentJson {
  _format: string;
  nav: NavItem[];
  experienceSets: ExperienceSetRaw[];
  experiencePillars: Pillar[];
  roadmap: string[];
  about: string[];
  stories: StoryRaw[];
  storyDetailStructure: StoryPart[];
  whispers: WhisperRaw[];
  partnerFormFields: FormField[];
}

/* ---- 正規化後（網站使用）的型別 ---- */

export interface ExperienceSet extends ExperienceSetRaw {
  slug: string;
  coverUrl?: string | null;
}

export interface Story extends StoryRaw {
  slug: string;
  /** 四段內容；null = 尚無實際內容（顯示原型的提示框） */
  parts: (string | null)[];
  coverUrl?: string | null;
  /** true = content.json 範例（非真實會員故事） */
  isSample: boolean;
}

export interface Whisper extends WhisperRaw {
  slug: string;
}

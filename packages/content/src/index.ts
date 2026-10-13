import raw from "../content.json";
import type { ContentJson, ExperienceSet, Story, Whisper } from "./types";

export * from "./types";

export const content = raw as ContentJson;

/** SET key → 正式路由 slug（README §5） */
export const SET_SLUGS: Record<string, string> = {
  nail: "nail-photo",
  hair: "hair-photo",
  brow: "nail-brow-lip",
};

/** 心語文章 slug（README §5，依 no 排序） */
export const WHISPER_SLUGS = [
  "01-the-beginning",
  "02-coming-home",
  "03-love-and-responsibility",
  "04-the-birth",
  "05-the-future",
] as const;

/** 新生故事範例 slug */
export const STORY_SLUGS = ["story-01", "story-02", "story-03"] as const;

export const fallbackSets: ExperienceSet[] = content.experienceSets.map((s) => ({
  ...s,
  slug: SET_SLUGS[s.key] ?? s.key,
  coverUrl: null,
}));

export const fallbackWhispers: Whisper[] = content.whispers.map((w, i) => ({
  ...w,
  slug: WHISPER_SLUGS[i] ?? `whisper-${w.no}`,
}));

export const fallbackStories: Story[] = content.stories.map((s, i) => ({
  ...s,
  slug: STORY_SLUGS[i] ?? `story-${i + 1}`,
  parts: content.storyDetailStructure.map(() => null),
  coverUrl: null,
  isSample: true,
}));

import "server-only";
import {
  content,
  fallbackSets,
  fallbackStories,
  fallbackWhispers,
  type ExperienceSet,
  type Story,
  type Whisper,
} from "@duoduo/content";
import { storagePublicUrl } from "./env";
import { contentClient } from "./supabase";

/**
 * 資料層：有 Supabase env 就讀 Supabase（schema.sql 的表），
 * 未設定、查詢失敗或查無資料時一律 fallback 到 content.json。
 */

type SetRow = {
  slug: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  headline: string;
  body: string[];
  photo_label: string | null;
  cover_path: string | null;
};

type WhisperRow = {
  slug: string;
  no: string;
  theme: string;
  title: string;
  subtitle: string | null;
  body: string;
  letter_to: string | null;
  letter: string | null;
};

type StoryRow = {
  slug: string;
  no: string | null;
  title: string;
  summary: string | null;
  before_text: string | null;
  what_i_did: string | null;
  record_text: string | null;
  closing_quote: string | null;
  gallery_paths: string[] | null;
  author_display: string | null;
};

function warn(scope: string, err: unknown) {
  console.warn(`[data] ${scope} 讀取 Supabase 失敗，改用 content.json：`, err);
}

export async function getSets(): Promise<ExperienceSet[]> {
  const db = contentClient(["experiences"]);
  if (!db) return fallbackSets;
  const { data, error } = await db
    .from("experience_sets")
    .select("slug,code,name,tagline,description,headline,body,photo_label,cover_path")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error || !data?.length) {
    if (error) warn("experience_sets", error.message);
    return fallbackSets;
  }
  return (data as SetRow[]).map((r) => {
    const fb = fallbackSets.find((s) => s.slug === r.slug);
    return {
      key: fb?.key ?? r.slug,
      slug: r.slug,
      no: r.code,
      name: r.name,
      photo: r.photo_label ?? fb?.photo ?? r.name,
      tagline: r.tagline,
      desc: r.description,
      headline: r.headline,
      body: r.body,
      coverUrl: storagePublicUrl(r.cover_path),
    };
  });
}

export async function getSet(slug: string) {
  const sets = await getSets();
  const index = sets.findIndex((s) => s.slug === slug);
  return index === -1 ? null : { set: sets[index], others: sets.filter((_, i) => i !== index) };
}

export async function getWhispers(): Promise<Whisper[]> {
  const db = contentClient(["whispers"]);
  if (!db) return fallbackWhispers;
  const { data, error } = await db
    .from("whispers")
    .select("slug,no,theme,title,subtitle,body,letter_to,letter")
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) {
    if (error) warn("whispers", error.message);
    return fallbackWhispers;
  }
  return (data as WhisperRow[]).map((r) => ({
    slug: r.slug,
    no: r.no,
    theme: r.theme,
    title: r.title,
    sub: r.subtitle ?? "",
    body: r.body,
    letterTo: r.letter_to ?? "",
    letter: r.letter ?? "",
  }));
}

export async function getWhisper(slug: string) {
  const list = await getWhispers();
  const index = list.findIndex((w) => w.slug === slug);
  if (index === -1) return null;
  return { whisper: list[index], prev: list[index - 1] ?? null, next: list[index + 1] ?? null };
}

/**
 * 新生故事：只讀 published && consent_given && !withdrawn（RLS 亦同）。
 * 依品牌文件不得虛構會員案例——Supabase 尚無已公開故事時，顯示 content.json
 * 的 3 則「範例」（與原型一致，詳細頁為四段架構提示框，不含虛構內文）。
 */
export async function getStories(): Promise<Story[]> {
  const db = contentClient(["stories"]);
  if (!db) return fallbackStories;
  const { data, error } = await db
    .from("stories")
    .select("slug,no,title,summary,before_text,what_i_did,record_text,closing_quote,gallery_paths,author_display")
    .eq("published", true)
    .eq("consent_given", true)
    .eq("withdrawn", false)
    .order("created_at", { ascending: true });
  if (error || !data?.length) {
    if (error) warn("stories", error.message);
    return fallbackStories;
  }
  return (data as StoryRow[]).map((r, i) => ({
    slug: r.slug,
    no: r.no ?? `故事${"一二三四五六七八九十"[i] ?? i + 1}`,
    title: r.title,
    desc: r.summary ?? "",
    parts: [r.before_text, r.what_i_did, r.record_text, r.closing_quote],
    coverUrl: storagePublicUrl(r.gallery_paths?.[0]),
    isSample: false,
  }));
}

export async function getStory(slug: string) {
  const list = await getStories();
  return list.find((s) => s.slug === slug) ?? null;
}

export async function getRoadmap(): Promise<{ show: boolean; items: string[] }> {
  const fallback = { show: true, items: content.roadmap };
  const db = contentClient(["settings"]);
  if (!db) return fallback;
  const { data, error } = await db.from("site_settings").select("key,value").in("key", ["show_roadmap", "roadmap"]);
  if (error || !data) {
    if (error) warn("site_settings", error.message);
    return fallback;
  }
  const map = new Map(data.map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const show = map.has("show_roadmap") ? map.get("show_roadmap") !== false : true;
  const items = Array.isArray(map.get("roadmap")) ? (map.get("roadmap") as string[]) : content.roadmap;
  return { show, items };
}

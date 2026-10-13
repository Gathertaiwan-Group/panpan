import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getSets, getStories, getWhispers } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sets, stories, whispers] = await Promise.all([getSets(), getStories(), getWhispers()]);
  const now = new Date();
  const url = (p: string) => `${SITE_URL}${p}`;
  return [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: url("/farewell"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...sets.map((s) => ({ url: url(`/farewell/${s.slug}`), lastModified: now, priority: 0.8 })),
    { url: url("/about"), lastModified: now, priority: 0.7 },
    { url: url("/stories"), lastModified: now, priority: 0.6 },
    // 範例故事（非真實會員故事）不列入索引
    ...stories.filter((s) => !s.isSample).map((s) => ({ url: url(`/stories/${s.slug}`), lastModified: now, priority: 0.5 })),
    { url: url("/whispers"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...whispers.map((w) => ({ url: url(`/whispers/${w.slug}`), lastModified: now, priority: 0.6 })),
    { url: url("/partner"), lastModified: now, priority: 0.5 },
  ];
}

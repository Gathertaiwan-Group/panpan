#!/usr/bin/env node
// 由 packages/content/content.json 產生 supabase/seed.sql（可重複執行：on conflict do update）
// 用法：node scripts/gen-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const c = JSON.parse(readFileSync(join(root, "packages/content/content.json"), "utf8"));

const SET_SLUGS = { nail: "nail-photo", hair: "hair-photo", brow: "nail-brow-lip" };
const WHISPER_SLUGS = ["01-the-beginning", "02-coming-home", "03-love-and-responsibility", "04-the-birth", "05-the-future"];
const STORY_SLUGS = ["story-01", "story-02", "story-03"];

const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(", ")}]::text[]`;

const modules = [
  ["nail", "美甲", "beauty"],
  ["hair", "美髮", "beauty"],
  ["brow", "絨霧眉", "beauty"],
  ["lip", "霧唇改色", "beauty"],
  ["photo", "寫真", "memory"],
];
const setModules = { "nail-photo": ["nail", "photo"], "hair-photo": ["hair", "photo"], "nail-brow-lip": ["nail", "brow", "lip"] };

const out = [];
out.push("-- 由 scripts/gen-seed.mjs 自 content.json 產生，請勿手改。可重複執行。");
out.push("-- 全部寫入 schema panpan（不碰 public）。");
out.push("begin;");

out.push("\n-- 體驗模組");
for (const [slug, name, cat] of modules) {
  out.push(
    `insert into panpan.experience_modules (slug, name, category) values (${q(slug)}, ${q(name)}, ${q(cat)})\n` +
      `  on conflict (slug) do update set name = excluded.name, category = excluded.category;`,
  );
}

out.push("\n-- 體驗 SET");
c.experienceSets.forEach((s, i) => {
  const slug = SET_SLUGS[s.key];
  out.push(
    `insert into panpan.experience_sets (slug, code, name, tagline, description, headline, body, photo_label, status, sort_order)\n` +
      `values (${q(slug)}, ${q(s.no)}, ${q(s.name)}, ${q(s.tagline)}, ${q(s.desc)}, ${q(s.headline)}, ${arr(s.body)}, ${q(s.photo)}, 'published', ${i + 1})\n` +
      `on conflict (slug) do update set code = excluded.code, name = excluded.name, tagline = excluded.tagline,\n` +
      `  description = excluded.description, headline = excluded.headline, body = excluded.body,\n` +
      `  photo_label = excluded.photo_label, sort_order = excluded.sort_order, updated_at = now();`,
  );
});
for (const [setSlug, mods] of Object.entries(setModules)) {
  out.push(
    `insert into panpan.experience_set_modules (set_id, module_id)\n` +
      `  select s.id, m.id from panpan.experience_sets s, panpan.experience_modules m\n` +
      `  where s.slug = ${q(setSlug)} and m.slug in (${mods.map(q).join(", ")})\n` +
      `on conflict do nothing;`,
  );
}

out.push("\n-- 心語文章");
c.whispers.forEach((w, i) => {
  out.push(
    `insert into panpan.whispers (slug, no, theme, title, subtitle, body, letter_to, letter, published, sort_order)\n` +
      `values (${q(WHISPER_SLUGS[i])}, ${q(w.no)}, ${q(w.theme)}, ${q(w.title)}, ${q(w.sub)}, ${q(w.body)}, ${q(w.letterTo)}, ${q(w.letter)}, true, ${i + 1})\n` +
      `on conflict (slug) do update set no = excluded.no, theme = excluded.theme, title = excluded.title,\n` +
      `  subtitle = excluded.subtitle, body = excluded.body, letter_to = excluded.letter_to,\n` +
      `  letter = excluded.letter, sort_order = excluded.sort_order;`,
  );
});

out.push("\n-- 新生故事：僅為範例草稿。依品牌文件不得虛構會員案例 → 一律 published=false、consent_given=false。");
c.stories.forEach((s, i) => {
  out.push(
    `insert into panpan.stories (slug, no, title, summary, consent_given, published)\n` +
      `values (${q(STORY_SLUGS[i])}, ${q(s.no)}, ${q(s.title)}, ${q(s.desc)}, false, false)\n` +
      `on conflict (slug) do update set no = excluded.no, title = excluded.title, summary = excluded.summary,\n` +
      `  consent_given = false, published = false;`,
  );
});

out.push("\n-- 站台設定");
out.push(
  `insert into panpan.site_settings (key, value) values\n` +
    `  ('show_roadmap', 'true'::jsonb),\n` +
    `  ('roadmap', ${q(JSON.stringify(c.roadmap))}::jsonb)\n` +
    `on conflict (key) do update set value = excluded.value;`,
);
out.push("\ncommit;\n");

writeFileSync(join(root, "supabase/seed.sql"), out.join("\n"));
console.log("wrote supabase/seed.sql");

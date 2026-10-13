#!/usr/bin/env node
/**
 * 透過 Supabase Management API 套用 supabase/migrations/*.sql 到共用專案的 `panpan` schema。
 * 不使用 `supabase db push`（該庫已有其他專案的 migration 帳本）。
 *
 * 用法：
 *   SUPABASE_PROJECT_REF=xxxx SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.mjs          # 套用未套用的 migration
 *   SUPABASE_PROJECT_REF=xxxx SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migrations.mjs --seed   # 另外執行 supabase/seed.sql（可重複執行）
 *   加 --dry-run 只列出將執行的檔案。
 *
 * 帳本：panpan.schema_migrations(version text primary key, applied_at timestamptz default now())
 * 每支 migration 與其帳本紀錄包在同一個交易（begin/commit）中，失敗即整支回滾。
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const SEED = args.has("--seed");
const DRY = args.has("--dry-run");

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!DRY && (!ref || !token)) {
  console.error("缺少 SUPABASE_PROJECT_REF 或 SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const lit = (s) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const dir = join(root, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  if (DRY) {
    console.log("migrations:", files.join(", ") || "(none)");
    if (SEED) console.log("seed: supabase/seed.sql");
    return;
  }

  await query(
    "create schema if not exists panpan;\n" +
      "create table if not exists panpan.schema_migrations (version text primary key, applied_at timestamptz default now());\n" +
      "revoke all on panpan.schema_migrations from anon, authenticated;",
  );
  const rows = await query("select version from panpan.schema_migrations order by version;");
  const applied = new Set(rows.map((r) => r.version));

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) {
      console.log(`skip   ${file}（已套用）`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    process.stdout.write(`apply  ${file} … `);
    await query(`begin;\n${sql}\ninsert into panpan.schema_migrations (version) values (${lit(version)});\ncommit;`);
    console.log("ok");
  }

  if (SEED) {
    const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8");
    process.stdout.write("seed   supabase/seed.sql … ");
    await query(seed);
    console.log("ok");
  }
}

main().catch((err) => {
  console.error("\n失敗：", err.message);
  process.exit(1);
});

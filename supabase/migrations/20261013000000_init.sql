-- 朵朵曉語官網：初始 schema
-- ⚠️ 本專案與其他站共用同一個 Supabase 專案，所有物件一律放在獨立 schema `panpan`，絕不碰 public。
-- 套用方式：node scripts/apply-migrations.mjs（Management API；不使用 supabase db push）
-- gen_random_uuid() 為 Postgres 13+ 內建，不需 pgcrypto。

create schema if not exists panpan;

-- ===== 體驗（模組化，可組合） =====
create table panpan.experience_modules (       -- 單一專業：美甲、美髮、寫真、絨霧眉、霧唇改色、妝髮、花藝…
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text check (category in ('beauty','memory','ritual','living')),
  created_at timestamptz default now()
);

create table panpan.experience_sets (          -- 對外販售的 SET（第一階段 3 個）
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                   -- nail-photo / hair-photo / nail-brow-lip
  code text not null,                          -- 'SET 01'
  name text not null,                          -- '美甲 × 寫真'
  tagline text not null,
  description text not null,
  headline text not null,
  body text[] not null,
  photo_label text,
  cover_path text,                             -- storage: panpan-experiences/...
  price_twd integer,
  duration_minutes integer,
  status text not null default 'published' check (status in ('draft','published','coming_soon')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table panpan.experience_set_modules (
  set_id uuid references panpan.experience_sets(id) on delete cascade,
  module_id uuid references panpan.experience_modules(id) on delete cascade,
  primary key (set_id, module_id)
);

create table panpan.experience_partners (      -- 未來跨品牌合作（不開放 anon）
  id uuid primary key default gen_random_uuid(),
  name text not null, field text, contact text, active boolean default true,
  created_at timestamptz default now()
);

-- ===== 心語文章 =====
create table panpan.whispers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  no text not null,                            -- '01'
  theme text not null,
  title text not null,
  subtitle text,
  body text not null,                          -- '## ' 小標、'> ' 引言、'——' 署名，以 \n 分段
  letter_to text,
  letter text,
  cover_path text,                             -- storage: panpan-whispers/...
  published boolean default true,
  published_at timestamptz default now(),
  sort_order int default 0
);

-- ===== 新生故事（必須經當事人同意） =====
create table panpan.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  no text,
  title text not null,
  summary text,
  before_text text,                            -- 轉身以前
  what_i_did text,                             -- 這一次，我為自己做了
  record_text text,                            -- 那一天的紀錄
  closing_quote text,                          -- 我想留下的一句話
  gallery_paths text[] default '{}',           -- storage: panpan-stories/...
  author_display text,                         -- 可匿名
  is_anonymous boolean default false,
  consent_given boolean not null default false,
  consent_at timestamptz,
  withdrawn boolean default false,
  published boolean default false,
  created_at timestamptz default now()
);

-- ===== 表單 =====
create table panpan.partner_applications (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  field text not null,
  contact text not null,
  message text,
  status text default 'new',
  created_at timestamptz default now()
);

create table panpan.booking_inquiries (
  id uuid primary key default gen_random_uuid(),
  set_slug text not null,
  name text not null,
  contact text not null,
  preferred_date date,
  message text,
  status text default 'new',
  created_at timestamptz default now()
);

create table panpan.story_submissions (
  id uuid primary key default gen_random_uuid(),
  name text,
  contact text not null,
  story text not null,
  wants_anonymous boolean default true,
  consent_given boolean not null check (consent_given = true),
  created_at timestamptz default now()
);

create table panpan.site_settings (
  key text primary key,
  value jsonb not null
);
insert into panpan.site_settings (key, value) values
  ('show_roadmap', 'true'::jsonb),
  ('roadmap', '["妝髮 × 寫真","花藝 × 寫真","美麗 × 攝影 × 餐飲","儀式 × 生活體驗","跨品牌專業組合"]'::jsonb)
on conflict (key) do nothing;

-- ===== 權限（明確 grant；先收回再給） =====
revoke all on all tables in schema panpan from anon, authenticated;
grant usage on schema panpan to anon, authenticated, service_role;

-- 內容表：唯讀
grant select on panpan.experience_modules, panpan.experience_sets, panpan.experience_set_modules,
                panpan.whispers, panpan.stories, panpan.site_settings
  to anon, authenticated;

-- 表單表：只能 insert（不給 select；前端 insert 不可接 .select()）
grant insert on panpan.partner_applications, panpan.booking_inquiries, panpan.story_submissions
  to anon, authenticated;

-- experience_partners：不給 anon / authenticated
grant all on all tables in schema panpan to service_role;

-- ===== RLS =====
alter table panpan.experience_modules     enable row level security;
alter table panpan.experience_sets        enable row level security;
alter table panpan.experience_set_modules enable row level security;
alter table panpan.experience_partners    enable row level security;
alter table panpan.whispers               enable row level security;
alter table panpan.stories                enable row level security;
alter table panpan.partner_applications   enable row level security;
alter table panpan.booking_inquiries      enable row level security;
alter table panpan.story_submissions      enable row level security;
alter table panpan.site_settings          enable row level security;

create policy "public read modules"  on panpan.experience_modules     for select using (true);
create policy "public read sets"     on panpan.experience_sets        for select using (status <> 'draft');
create policy "public read set mods" on panpan.experience_set_modules for select using (true);
create policy "public read whispers" on panpan.whispers               for select using (published);
create policy "public read stories"  on panpan.stories                for select using (published and consent_given and not withdrawn);
create policy "public read settings" on panpan.site_settings          for select using (true);

create policy "anon insert partner"  on panpan.partner_applications for insert with check (true);
create policy "anon insert booking"  on panpan.booking_inquiries    for insert with check (true);
create policy "anon insert story"    on panpan.story_submissions    for insert with check (consent_given = true);
-- 管理寫入一律使用 service role，不開放 anon update/delete。

-- ===== Storage（與其他站共用，bucket 名稱一律加 panpan- 前綴） =====
insert into storage.buckets (id, name, public) values
  ('panpan-experiences', 'panpan-experiences', true),
  ('panpan-whispers',    'panpan-whispers',    true),
  ('panpan-stories',     'panpan-stories',     true),
  ('panpan-brand',       'panpan-brand',       true)
on conflict (id) do nothing;

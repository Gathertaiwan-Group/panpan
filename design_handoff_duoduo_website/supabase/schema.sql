-- 朵朵曉語官網 Supabase schema
create extension if not exists "pgcrypto";

-- ===== 體驗（模組化，可組合） =====
create table experience_modules (            -- 單一專業：美甲、美髮、寫真、絨霧眉、霧唇改色、妝髮、花藝…
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text check (category in ('beauty','memory','ritual','living')),
  created_at timestamptz default now()
);

create table experience_sets (               -- 對外販售的 SET（第一階段 3 個）
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- nail-photo / hair-photo / nail-brow-lip
  code text not null,                        -- 'SET 01'
  name text not null,                        -- '美甲 × 寫真'
  tagline text not null,
  description text not null,
  headline text not null,
  body text[] not null,
  photo_label text,
  cover_path text,                           -- storage: experiences/...
  price_twd integer,
  duration_minutes integer,
  status text not null default 'published' check (status in ('draft','published','coming_soon')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table experience_set_modules (
  set_id uuid references experience_sets(id) on delete cascade,
  module_id uuid references experience_modules(id) on delete cascade,
  primary key (set_id, module_id)
);

create table experience_partners (           -- 未來跨品牌合作
  id uuid primary key default gen_random_uuid(),
  name text not null, field text, contact text, active boolean default true,
  created_at timestamptz default now()
);

-- ===== 心語文章 =====
create table whispers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  no text not null,                          -- '01'
  theme text not null,
  title text not null,
  subtitle text,
  body text not null,                        -- '## ' 小標、'> ' 引言、'——' 署名，以 \n 分段
  letter_to text,
  letter text,
  cover_path text,
  published boolean default true,
  published_at timestamptz default now(),
  sort_order int default 0
);

-- ===== 新生故事（必須經當事人同意） =====
create table stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  no text,
  title text not null,
  summary text,
  before_text text,                          -- 轉身以前
  what_i_did text,                           -- 這一次，我為自己做了
  record_text text,                          -- 那一天的紀錄
  closing_quote text,                        -- 我想留下的一句話
  gallery_paths text[] default '{}',
  author_display text,                       -- 可匿名
  is_anonymous boolean default false,
  consent_given boolean not null default false,
  consent_at timestamptz,
  withdrawn boolean default false,
  published boolean default false,
  created_at timestamptz default now()
);

-- ===== 表單 =====
create table partner_applications (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  field text not null,
  contact text not null,
  message text,
  status text default 'new',
  created_at timestamptz default now()
);

create table booking_inquiries (
  id uuid primary key default gen_random_uuid(),
  set_slug text not null,
  name text not null,
  contact text not null,
  preferred_date date,
  message text,
  status text default 'new',
  created_at timestamptz default now()
);

create table story_submissions (
  id uuid primary key default gen_random_uuid(),
  name text,
  contact text not null,
  story text not null,
  wants_anonymous boolean default true,
  consent_given boolean not null check (consent_given = true),
  created_at timestamptz default now()
);

create table site_settings (
  key text primary key,
  value jsonb not null
);
insert into site_settings values ('show_roadmap', 'true'::jsonb),
  ('roadmap', '["妝髮 × 寫真","花藝 × 寫真","美麗 × 攝影 × 餐飲","儀式 × 生活體驗","跨品牌專業組合"]'::jsonb);

-- ===== RLS =====
alter table experience_modules enable row level security;
alter table experience_sets enable row level security;
alter table experience_set_modules enable row level security;
alter table experience_partners enable row level security;
alter table whispers enable row level security;
alter table stories enable row level security;
alter table partner_applications enable row level security;
alter table booking_inquiries enable row level security;
alter table story_submissions enable row level security;
alter table site_settings enable row level security;

create policy "public read modules"  on experience_modules     for select using (true);
create policy "public read sets"     on experience_sets        for select using (status <> 'draft');
create policy "public read set mods" on experience_set_modules for select using (true);
create policy "public read whispers" on whispers               for select using (published);
create policy "public read stories"  on stories                for select using (published and consent_given and not withdrawn);
create policy "public read settings" on site_settings          for select using (true);

create policy "anon insert partner"  on partner_applications for insert with check (true);
create policy "anon insert booking"  on booking_inquiries    for insert with check (true);
create policy "anon insert story"    on story_submissions    for insert with check (consent_given = true);
-- 管理寫入一律使用 service role（apps/api 或 Supabase Studio），不開放 anon update/delete。

-- ===== Storage =====
insert into storage.buckets (id, name, public) values
  ('experiences','experiences', true),
  ('whispers','whispers', true),
  ('stories','stories', true),
  ('brand','brand', true)
on conflict do nothing;

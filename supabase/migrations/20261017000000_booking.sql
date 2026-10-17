-- 朵朵曉語：線上預約 ＋ PChomePay 全額付款 ＋ 供應商後台 ＋ 管理後台
-- ⚠️ 共用 Supabase 專案：所有物件一律在 schema `panpan`；只另外安裝 btree_gist（extensions schema）與 pg_cron。
--    絕不碰 public / hank。
-- 套用：node scripts/apply-migrations.mjs（整支包在單一交易）。
--
-- 角色與權限總覽
--   anon           ：完全讀不到 vendors / staff / 時段 / bookings / payments（預約一律走伺服器端 service role）
--   authenticated  ：靠 RLS ＋ security definer helper（panpan.is_admin() / panpan.my_vendor_id()）隔離
--                    - 供應商：只讀自己 vendor 的預約（且只有必要欄位，欄位層級 grant）、只能改自己的時段表
--                    - 管理員：讀全部；寫入仍走伺服器端 service role
--   service_role   ：伺服器端（Route Handler / Server Action），繞過 RLS
--
-- 時區一律 Asia/Taipei（台灣無日光節約）。

create extension if not exists btree_gist with schema extensions;

-- =====================================================================
-- 供應商／後台帳號
-- =====================================================================
create table panpan.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  contact_email text check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table panpan.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null check (role in ('admin', 'vendor')),
  vendor_id uuid references panpan.vendors (id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint staff_role_vendor check (
    (role = 'admin' and vendor_id is null) or (role = 'vendor' and vendor_id is not null)
  )
);
create index staff_vendor_idx on panpan.staff (vendor_id);

-- 體驗 SET：綁主供應商、線上預約開關（price_twd / duration_minutes 已存在）
alter table panpan.experience_sets
  add column vendor_id uuid references panpan.vendors (id) on delete set null,
  add column booking_enabled boolean not null default false;
alter table panpan.experience_sets
  add constraint experience_sets_booking_ready check (
    not booking_enabled
    or (vendor_id is not null and price_twd >= 30 and duration_minutes between 15 and 720)
  );

-- =====================================================================
-- 供應商時段：每週可接時段 ＋ 單日請假／加開
-- =====================================================================
create table panpan.vendor_weekly_slots (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references panpan.vendors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),   -- 0=日
  start_time time not null check (extract(second from start_time) = 0),
  created_at timestamptz not null default now(),
  unique (vendor_id, weekday, start_time)
);

create table panpan.vendor_date_overrides (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references panpan.vendors (id) on delete cascade,
  date date not null,
  closed boolean not null default false,          -- 請假：當天全部不開放
  extra_times time[] not null default '{}',       -- 加開：當天額外時段
  note text check (note is null or length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, date)
);

-- =====================================================================
-- 預約 ＋ 付款
-- =====================================================================
create or replace function panpan.normalize_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d like '886%' then '0' || substr(d, 4)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s;
$$;

create table panpan.bookings (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  access_token text not null,                     -- 付款結果頁存取用（不可猜），不給供應商
  set_id uuid not null references panpan.experience_sets (id) on delete restrict,
  set_name text not null,                         -- 下單當下快照
  vendor_id uuid not null references panpan.vendors (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'expired', 'cancelled', 'refunded')),
  pay_method text not null check (pay_method in ('card', 'atm')),
  amount integer not null check (amount >= 30),
  hold_expires_at timestamptz,
  customer_name text not null check (length(btrim(customer_name)) between 1 and 80),
  phone text not null check (length(phone) <= 30),
  email text not null check (length(email) <= 254),
  note text check (note is null or length(note) <= 1000),
  email_norm text not null,
  phone_norm text not null,
  consent_at timestamptz not null default now(),
  paid_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  needs_attention boolean not null default false,
  attention_reason text,
  admin_note text,
  customer_email_sent_at timestamptz,
  vendor_email_sent_at timestamptz,
  admin_email_sent_at timestamptz,
  attention_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_order_no_key unique (order_no),
  constraint bookings_access_token_key unique (access_token),
  constraint bookings_time_order check (ends_at > starts_at),
  -- 同一供應商的占用中預約不可重疊（不同供應商同時段可並存）
  constraint bookings_vendor_no_overlap exclude using gist (
    vendor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending_payment', 'confirmed'))
);
create index bookings_vendor_starts_idx on panpan.bookings (vendor_id, starts_at);
create index bookings_hold_idx on panpan.bookings (hold_expires_at) where status = 'pending_payment';
create index bookings_email_norm_idx on panpan.bookings (email_norm) where status = 'pending_payment';
create index bookings_phone_norm_idx on panpan.bookings (phone_norm) where status = 'pending_payment';
create index bookings_attention_idx on panpan.bookings (created_at) where needs_attention;

create table panpan.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references panpan.bookings (id) on delete cascade,
  gateway text not null default 'pchomepay',
  gateway_order_id text not null,
  status text not null default 'init' check (status in ('init', 'paid', 'failed')),
  amount integer not null check (amount >= 30),
  pay_type text,
  payment_url text,
  atm_bank_code text,
  atm_virtual_account text,
  atm_expire_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  checked_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_gateway_order_id_key unique (gateway_order_id)
);
create index payments_booking_idx on panpan.payments (booking_id);

-- updated_at
create or replace function panpan.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger vendors_touch before update on panpan.vendors
  for each row execute function panpan.touch_updated_at();
create trigger overrides_touch before update on panpan.vendor_date_overrides
  for each row execute function panpan.touch_updated_at();
create trigger bookings_touch before update on panpan.bookings
  for each row execute function panpan.touch_updated_at();
create trigger payments_touch before update on panpan.payments
  for each row execute function panpan.touch_updated_at();

-- =====================================================================
-- 身分 helper（security definer；RLS policy 用）
-- =====================================================================
create or replace function panpan.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from panpan.staff s
     where s.user_id = (select auth.uid()) and s.role = 'admin' and s.active
  );
$$;

create or replace function panpan.my_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.vendor_id
    from panpan.staff s
    join panpan.vendors v on v.id = s.vendor_id
   where s.user_id = (select auth.uid()) and s.role = 'vendor' and s.active and v.active
   limit 1;
$$;

-- =====================================================================
-- 逾時保留釋出（lazy：create_booking／mark_booking_paid 內也會呼叫；pg_cron 每 10 分鐘全清）
-- =====================================================================
create or replace function panpan.expire_stale_holds(
  p_vendor_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with expired as (
    update panpan.bookings b
       set status = 'expired'
     where b.status = 'pending_payment'
       and b.hold_expires_at < now()
       and (p_vendor_id is null or b.vendor_id = p_vendor_id)
       and (p_from is null or p_to is null or (b.starts_at < p_to and b.ends_at > p_from))
    returning 1
  )
  select count(*)::integer from expired;
$$;

-- =====================================================================
-- create_booking
--   鎖（以 vendor 為鍵）→ 驗證 SET 與時段 → 釋出逾時保留 → 同人未付款上限
--   → （取代同人同時段的舊保留＋insert，同一子交易）→ 捕捉衝突回 slot_taken
--   金額、時長、供應商一律以 DB 為準，不信任呼叫端。
-- =====================================================================
create or replace function panpan.create_booking(
  p_order_no        text,
  p_access_token    text,
  p_set_id          uuid,
  p_starts_at       timestamptz,
  p_pay_method      text,
  p_hold_expires_at timestamptz,
  p_customer_name   text,
  p_phone           text,
  p_email           text,
  p_note            text,
  p_max_pending     integer default 2,
  p_lead            interval default interval '24 hours',
  p_horizon         interval default interval '61 days',
  p_atm_lead        interval default interval '72 hours'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_set       record;
  v_email     text := lower(btrim(p_email));
  v_phone     text := panpan.normalize_phone(p_phone);
  v_ends_at   timestamptz;
  v_date      date := (p_starts_at at time zone 'Asia/Taipei')::date;
  v_time      time := (p_starts_at at time zone 'Asia/Taipei')::time;
  v_closed    boolean;
  v_extra     time[];
  v_offered   boolean;
  v_count     integer;
  v_replaced  integer := 0;
  v_id        uuid;
  v_constraint text;
begin
  select s.id, s.name, s.vendor_id, s.price_twd, s.duration_minutes
    into v_set
    from panpan.experience_sets s
    join panpan.vendors v on v.id = s.vendor_id and v.active
   where s.id = p_set_id
     and s.status = 'published'
     and s.booking_enabled
     and s.price_twd >= 30
     and s.duration_minutes > 0;
  if not found then
    return jsonb_build_object('result', 'not_bookable');
  end if;

  if p_pay_method not in ('card', 'atm') then
    return jsonb_build_object('result', 'invalid_input');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_phone) < 8 or length(btrim(coalesce(p_customer_name, ''))) = 0 then
    return jsonb_build_object('result', 'invalid_input');
  end if;

  -- 時間規則（伺服器端也會先擋；這裡是最後一道）
  if p_starts_at < now() + p_lead or p_starts_at > now() + p_horizon then
    return jsonb_build_object('result', 'out_of_range');
  end if;
  if p_pay_method = 'atm' and p_starts_at < now() + p_atm_lead then
    return jsonb_build_object('result', 'atm_not_allowed');
  end if;
  if p_hold_expires_at is null or p_hold_expires_at <= now() or p_hold_expires_at >= p_starts_at then
    return jsonb_build_object('result', 'invalid_input');
  end if;

  -- 時段必須是供應商有開的（每週時段或當日加開，且當日未請假）
  select o.closed, o.extra_times into v_closed, v_extra
    from panpan.vendor_date_overrides o
   where o.vendor_id = v_set.vendor_id and o.date = v_date;
  if coalesce(v_closed, false) then
    v_offered := false;
  else
    v_offered := exists (
      select 1 from panpan.vendor_weekly_slots w
       where w.vendor_id = v_set.vendor_id
         and w.weekday = extract(dow from v_date)::smallint
         and w.start_time = v_time
    ) or (v_extra is not null and v_time = any (v_extra));
  end if;
  if not v_offered then
    return jsonb_build_object('result', 'slot_unavailable');
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_set.duration_minutes);

  -- 同一供應商的建單序列化
  perform pg_advisory_xact_lock(hashtextextended('panpan.booking:' || v_set.vendor_id::text, 0));
  perform panpan.expire_stale_holds(v_set.vendor_id, p_starts_at, v_ends_at);

  -- 同一人（Email 或電話）未付款保留上限；同人同時段且未付款的舊保留會被這次取代，不列入計數
  select count(*) into v_count
    from panpan.bookings b
   where b.status = 'pending_payment'
     and b.hold_expires_at > now()
     and (b.email_norm = v_email or b.phone_norm = v_phone)
     and not (b.vendor_id = v_set.vendor_id and b.starts_at = p_starts_at
              and b.email_norm = v_email and b.phone_norm = v_phone
              and not exists (select 1 from panpan.payments p where p.booking_id = b.id and p.status = 'paid'));
  if v_count >= p_max_pending then
    return jsonb_build_object('result', 'too_many_pending');
  end if;

  begin
    update panpan.bookings b
       set status = 'cancelled', cancelled_at = now(), admin_note = coalesce(b.admin_note, '同人重新下單取代')
     where b.status = 'pending_payment'
       and b.vendor_id = v_set.vendor_id
       and b.starts_at = p_starts_at
       and b.email_norm = v_email
       and b.phone_norm = v_phone
       and not exists (select 1 from panpan.payments p where p.booking_id = b.id and p.status = 'paid');
    get diagnostics v_replaced = row_count;

    insert into panpan.bookings (
      order_no, access_token, set_id, set_name, vendor_id, starts_at, ends_at, status, pay_method, amount,
      hold_expires_at, customer_name, phone, email, note, email_norm, phone_norm, consent_at
    ) values (
      p_order_no, p_access_token, v_set.id, v_set.name, v_set.vendor_id, p_starts_at, v_ends_at,
      'pending_payment', p_pay_method, v_set.price_twd, p_hold_expires_at,
      btrim(p_customer_name), btrim(p_phone), btrim(p_email), nullif(btrim(coalesce(p_note, '')), ''),
      v_email, v_phone, now()
    )
    returning id into v_id;
  exception
    -- 例外會回滾整個 begin 區塊（包含上面的取代），舊保留維持原狀
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint in ('bookings_order_no_key', 'bookings_access_token_key') then
        return jsonb_build_object('result', 'order_no_taken');
      end if;
      return jsonb_build_object('result', 'slot_taken');
    when exclusion_violation then
      return jsonb_build_object('result', 'slot_taken');
  end;

  return jsonb_build_object(
    'result', 'created', 'id', v_id, 'replaced', v_replaced,
    'amount', v_set.price_twd, 'ends_at', v_ends_at, 'set_name', v_set.name
  );
end;
$$;

-- =====================================================================
-- mark_booking_paid（notify／回查後呼叫；呼叫端已用閘道回查確認「已付」）
--   for update 鎖付款與預約 → 冪等（已 paid 回 already_paid）→ 金額不符不轉換
--   → 條件式轉換：pending_payment → confirmed；逾時後才付款：時段仍空 → 收回並確認，
--     時段已被佔 → 標記需人工處理（呼叫端通知管理員退款）
--   回傳 transitioned=true 只在「這一次」把預約轉成 confirmed（呼叫端據此只寄一次信）
--   回傳 attention_new=true 只在「這一次」新標記需人工處理
-- =====================================================================
create or replace function panpan.mark_booking_paid(
  p_gateway_order_id text,
  p_amount           integer,
  p_pay_type         text,
  p_raw              jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pay    panpan.payments%rowtype;
  v_bk     panpan.bookings%rowtype;
  v_reason text;
  v_new    boolean;
begin
  select * into v_pay from panpan.payments where gateway_order_id = p_gateway_order_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  select * into v_bk from panpan.bookings where id = v_pay.booking_id for update;

  update panpan.payments
     set raw = raw || jsonb_build_object('paid_check_' || to_char(now(), 'YYYYMMDD"T"HH24MISS'), coalesce(p_raw, '{}'::jsonb)),
         pay_type = coalesce(p_pay_type, pay_type)
   where id = v_pay.id;

  if v_pay.status = 'paid' then
    return jsonb_build_object('result', 'already_paid', 'transitioned', false, 'attention_new', false,
                              'booking_id', v_bk.id, 'booking_status', v_bk.status);
  end if;

  if p_amount is null or p_amount <> v_pay.amount or v_pay.amount <> v_bk.amount then
    v_new := not (v_bk.needs_attention and v_bk.attention_reason = 'amount_mismatch');
    update panpan.bookings
       set needs_attention = true, attention_reason = 'amount_mismatch'
     where id = v_bk.id;
    return jsonb_build_object('result', 'amount_mismatch', 'transitioned', false, 'attention_new', v_new,
                              'reason', 'amount_mismatch', 'booking_id', v_bk.id, 'booking_status', v_bk.status);
  end if;

  update panpan.payments set status = 'paid', paid_at = now() where id = v_pay.id;

  if v_bk.status = 'pending_payment' then
    if v_bk.starts_at <= now() then
      update panpan.bookings
         set status = 'confirmed', paid_at = now(), confirmed_at = now(), hold_expires_at = null,
             needs_attention = true, attention_reason = 'paid_after_start'
       where id = v_bk.id;
      return jsonb_build_object('result', 'needs_attention', 'reason', 'paid_after_start',
                                'transitioned', false, 'attention_new', true,
                                'booking_id', v_bk.id, 'booking_status', 'confirmed');
    end if;
    -- 仍是 pending_payment ＝ 沒有人能佔到重疊時段（排他約束），直接確認
    update panpan.bookings
       set status = 'confirmed', paid_at = now(), confirmed_at = now(), hold_expires_at = null
     where id = v_bk.id;
    return jsonb_build_object('result', 'confirmed', 'transitioned', true, 'attention_new', false,
                              'booking_id', v_bk.id, 'booking_status', 'confirmed');
  end if;

  if v_bk.status = 'expired' and v_bk.starts_at > now() then
    perform panpan.expire_stale_holds(v_bk.vendor_id, v_bk.starts_at, v_bk.ends_at);
    begin
      update panpan.bookings
         set status = 'confirmed', paid_at = now(), confirmed_at = now(), hold_expires_at = null
       where id = v_bk.id;
      return jsonb_build_object('result', 'confirmed', 'reclaimed', true, 'transitioned', true,
                                'attention_new', false, 'booking_id', v_bk.id, 'booking_status', 'confirmed');
    exception when exclusion_violation or unique_violation then
      update panpan.bookings
         set paid_at = now(), needs_attention = true, attention_reason = 'paid_after_expiry_slot_taken'
       where id = v_bk.id;
      return jsonb_build_object('result', 'needs_attention', 'reason', 'paid_after_expiry_slot_taken',
                                'transitioned', false, 'attention_new', true,
                                'booking_id', v_bk.id, 'booking_status', v_bk.status);
    end;
  end if;

  v_reason := case v_bk.status
    when 'confirmed' then 'duplicate_payment'
    when 'expired'   then 'paid_after_expiry_past'
    when 'cancelled' then 'paid_after_cancel'
    else 'paid_after_refund'
  end;
  update panpan.bookings
     set needs_attention = true, attention_reason = v_reason
   where id = v_bk.id;
  return jsonb_build_object('result', 'needs_attention', 'reason', v_reason,
                            'transitioned', false, 'attention_new', true,
                            'booking_id', v_bk.id, 'booking_status', v_bk.status);
end;
$$;

-- ATM 取號：記錄帳號與繳費期限；保留延長到繳費期限（不超過開始前）
create or replace function panpan.record_atm_info(
  p_gateway_order_id text,
  p_bank_code        text,
  p_virtual_account  text,
  p_expire_at        timestamptz,
  p_raw              jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pay panpan.payments%rowtype;
begin
  select * into v_pay from panpan.payments where gateway_order_id = p_gateway_order_id for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;
  update panpan.payments
     set atm_bank_code = coalesce(nullif(p_bank_code, ''), atm_bank_code),
         atm_virtual_account = coalesce(nullif(p_virtual_account, ''), atm_virtual_account),
         atm_expire_at = coalesce(p_expire_at, atm_expire_at),
         raw = raw || jsonb_build_object('atm_' || to_char(now(), 'YYYYMMDD"T"HH24MISS'), coalesce(p_raw, '{}'::jsonb))
   where id = v_pay.id;
  if p_expire_at is not null and v_pay.status = 'init' then
    update panpan.bookings b
       set hold_expires_at = least(greatest(b.hold_expires_at, p_expire_at), b.starts_at - interval '1 hour')
     where b.id = v_pay.booking_id and b.status = 'pending_payment' and b.pay_method = 'atm';
  end if;
  return jsonb_build_object('result', 'ok');
end;
$$;

-- =====================================================================
-- 供應商可見的預約（只有必要欄位；security_invoker → 仍受 bookings 的 RLS 與欄位 grant 約束）
-- 待付款／逾時／取消不給供應商看（只看已確認與已退款的歷史）
-- =====================================================================
create view panpan.vendor_bookings
with (security_invoker = true)
as
select b.id, b.vendor_id, b.set_id, b.set_name, b.starts_at, b.ends_at, b.status,
       b.customer_name, b.phone, b.note
  from panpan.bookings b
 where b.status in ('confirmed', 'refunded');

-- =====================================================================
-- 權限：先收回再精確 grant
-- =====================================================================
revoke all on panpan.vendors, panpan.staff, panpan.vendor_weekly_slots, panpan.vendor_date_overrides,
              panpan.bookings, panpan.payments, panpan.vendor_bookings
  from public, anon, authenticated;
grant all on panpan.vendors, panpan.staff, panpan.vendor_weekly_slots, panpan.vendor_date_overrides,
             panpan.bookings, panpan.payments, panpan.vendor_bookings
  to service_role;

grant select on panpan.vendors, panpan.staff to authenticated;
grant select, insert, update, delete on panpan.vendor_weekly_slots, panpan.vendor_date_overrides to authenticated;
-- bookings：只給 authenticated 必要欄位（email、金額、token、付款內部欄位都不給）
grant select (id, vendor_id, set_id, set_name, starts_at, ends_at, status, customer_name, phone, note)
  on panpan.bookings to authenticated;
grant select on panpan.vendor_bookings to authenticated;
-- payments：anon / authenticated 一律沒有任何權限

alter table panpan.vendors               enable row level security;
alter table panpan.staff                 enable row level security;
alter table panpan.vendor_weekly_slots   enable row level security;
alter table panpan.vendor_date_overrides enable row level security;
alter table panpan.bookings              enable row level security;
alter table panpan.payments              enable row level security;

create policy "vendor reads own vendor" on panpan.vendors for select to authenticated
  using ((select panpan.is_admin()) or id = (select panpan.my_vendor_id()));
create policy "staff reads own row" on panpan.staff for select to authenticated
  using (user_id = (select auth.uid()) or (select panpan.is_admin()));

create policy "vendor manages own weekly slots" on panpan.vendor_weekly_slots for all to authenticated
  using ((select panpan.is_admin()) or vendor_id = (select panpan.my_vendor_id()))
  with check ((select panpan.is_admin()) or vendor_id = (select panpan.my_vendor_id()));
create policy "vendor manages own overrides" on panpan.vendor_date_overrides for all to authenticated
  using ((select panpan.is_admin()) or vendor_id = (select panpan.my_vendor_id()))
  with check ((select panpan.is_admin()) or vendor_id = (select panpan.my_vendor_id()));

create policy "vendor reads own bookings" on panpan.bookings for select to authenticated
  using ((select panpan.is_admin()) or vendor_id = (select panpan.my_vendor_id()));
-- payments：無 policy（RLS 開啟 ＋ 無 grant → 只有 service_role）

-- 函式：預設 PUBLIC 可執行 → 全部收回再精確 grant
revoke execute on function panpan.normalize_phone(text) from public, anon, authenticated;
revoke execute on function panpan.touch_updated_at() from public, anon, authenticated;
revoke execute on function panpan.is_admin() from public, anon;
revoke execute on function panpan.my_vendor_id() from public, anon;
revoke execute on function panpan.expire_stale_holds(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function panpan.create_booking(text, text, uuid, timestamptz, text, timestamptz, text, text, text, text, integer, interval, interval, interval)
  from public, anon, authenticated;
revoke execute on function panpan.mark_booking_paid(text, integer, text, jsonb) from public, anon, authenticated;
revoke execute on function panpan.record_atm_info(text, text, text, timestamptz, jsonb) from public, anon, authenticated;

grant execute on function panpan.is_admin() to authenticated, service_role;
grant execute on function panpan.my_vendor_id() to authenticated, service_role;
grant execute on function panpan.normalize_phone(text) to service_role;
grant execute on function panpan.expire_stale_holds(uuid, timestamptz, timestamptz) to service_role;
grant execute on function panpan.create_booking(text, text, uuid, timestamptz, text, timestamptz, text, text, text, text, integer, interval, interval, interval)
  to service_role;
grant execute on function panpan.mark_booking_paid(text, integer, text, jsonb) to service_role;
grant execute on function panpan.record_atm_info(text, text, text, timestamptz, jsonb) to service_role;

-- =====================================================================
-- pg_cron：每 10 分鐘釋出逾時保留（DB 沒有 pg_cron 時略過；lazy 釋出仍然有效）
-- =====================================================================
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.schedule('panpan-expire-holds', '*/10 * * * *', 'select panpan.expire_stale_holds()');
    exception when others then
      raise notice 'pg_cron 無法啟用，略過（%）', sqlerrm;
    end;
  else
    raise notice 'pg_cron 不可用，略過排程';
  end if;
end
$do$;

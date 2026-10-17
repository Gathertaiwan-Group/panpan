-- 朵朵曉語：預約審查修正（20261017000000_booking.sql 已上線，不可改，改在這支）
-- ⚠️ 只動 panpan schema（與既有 pg_cron job）；不碰 public / hank。
--
-- 1. 建單 IP 限流：每 IP（sha256 雜湊，不存原值）每小時最多 5 次建單、每日最多 2 次 ATM 保留
-- 2. 供應商 RLS：只能讀自己 vendor「已確認／已退款」的預約（未付款／逾時／取消客人的個資不給）
-- 3. pg_cron：同一個 job 改跑 panpan.booking_maintenance()（釋出逾時保留 ＋ 清理舊限流紀錄）

-- =====================================================================
-- 1. IP 限流
-- =====================================================================
create table panpan.booking_rate_events (
  id bigint generated always as identity primary key,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('create', 'atm')),
  created_at timestamptz not null default now()
);
create index booking_rate_events_lookup_idx on panpan.booking_rate_events (ip_hash, kind, created_at);
create index booking_rate_events_created_idx on panpan.booking_rate_events (created_at);

-- 原子地「檢查＋寫入」：以 ip_hash 為鍵的 advisory lock 序列化同一 IP 的併發請求
create or replace function panpan.check_booking_rate(
  p_ip_hash      text,
  p_pay_method   text,
  p_max_per_hour integer default 5,
  p_max_atm_day  integer default 2
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' or p_pay_method not in ('card', 'atm') then
    return jsonb_build_object('result', 'invalid_input');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('panpan.rate:' || p_ip_hash, 0));

  select count(*) into v_count
    from panpan.booking_rate_events e
   where e.ip_hash = p_ip_hash and e.kind = 'create' and e.created_at > now() - interval '1 hour';
  if v_count >= p_max_per_hour then
    return jsonb_build_object('result', 'rate_limited');
  end if;

  if p_pay_method = 'atm' then
    select count(*) into v_count
      from panpan.booking_rate_events e
     where e.ip_hash = p_ip_hash and e.kind = 'atm' and e.created_at > now() - interval '1 day';
    if v_count >= p_max_atm_day then
      return jsonb_build_object('result', 'atm_rate_limited');
    end if;
    insert into panpan.booking_rate_events (ip_hash, kind) values (p_ip_hash, 'atm');
  end if;

  insert into panpan.booking_rate_events (ip_hash, kind) values (p_ip_hash, 'create');
  return jsonb_build_object('result', 'ok');
end;
$$;

-- 定期維護：釋出逾時保留 ＋ 刪除 2 天前的限流紀錄
create or replace function panpan.booking_maintenance()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expired integer;
  v_purged  integer;
begin
  v_expired := panpan.expire_stale_holds();
  delete from panpan.booking_rate_events where created_at < now() - interval '2 days';
  get diagnostics v_purged = row_count;
  return jsonb_build_object('expired', v_expired, 'purged', v_purged);
end;
$$;

revoke all on panpan.booking_rate_events from public, anon, authenticated;
grant all on panpan.booking_rate_events to service_role;
alter table panpan.booking_rate_events enable row level security;   -- 無 policy：只有 service_role

revoke execute on function panpan.check_booking_rate(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function panpan.booking_maintenance() from public, anon, authenticated;
grant execute on function panpan.check_booking_rate(text, text, integer, integer) to service_role;
grant execute on function panpan.booking_maintenance() to service_role;

-- =====================================================================
-- 2. 供應商只能讀已確認／已退款（管理員不受限）
-- =====================================================================
drop policy "vendor reads own bookings" on panpan.bookings;
create policy "vendor reads own bookings" on panpan.bookings for select to authenticated
  using (
    (select panpan.is_admin())
    or (vendor_id = (select panpan.my_vendor_id()) and status in ('confirmed', 'refunded'))
  );

-- =====================================================================
-- 3. 既有 pg_cron job 改跑維護函式（同名 job → cron.schedule 會更新；沒有 pg_cron 時略過）
-- =====================================================================
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('panpan-expire-holds', '*/10 * * * *', 'select panpan.booking_maintenance()');
  else
    raise notice 'pg_cron 未安裝，略過排程';
  end if;
end
$do$;

-- 20261018000000_booking_hardening：IP 限流、供應商只讀已確認／已退款、維護函式

-- ① 每 IP 每小時最多 5 次建單；不同 IP 互不影響
do $$
declare h text := repeat('a', 64); h2 text := repeat('b', 64); r jsonb; i int;
begin
  for i in 1..5 loop
    r := panpan.check_booking_rate(h, 'card');
    assert r->>'result' = 'ok', '第 ' || i || ' 次應通過：' || r::text;
  end loop;
  r := panpan.check_booking_rate(h, 'card');
  assert r->>'result' = 'rate_limited', '第 6 次應被擋：' || r::text;
  assert (panpan.check_booking_rate(h2, 'card'))->>'result' = 'ok', '其他 IP 不受影響';
  -- 一小時前的紀錄不算
  update panpan.booking_rate_events set created_at = now() - interval '61 minutes' where ip_hash = h;
  assert (panpan.check_booking_rate(h, 'card'))->>'result' = 'ok', '一小時後恢復';
  assert (panpan.check_booking_rate('not-a-hash', 'card'))->>'result' = 'invalid_input';
  raise notice 'PASS 每 IP 每小時 5 次建單';
end $$;

-- ② 每 IP 每日最多 2 次 ATM 保留（即使每小時額度還有）
do $$
declare h text := repeat('c', 64); r jsonb;
begin
  assert (panpan.check_booking_rate(h, 'atm'))->>'result' = 'ok';
  update panpan.booking_rate_events set created_at = now() - interval '2 hours' where ip_hash = h;
  assert (panpan.check_booking_rate(h, 'atm'))->>'result' = 'ok';
  r := panpan.check_booking_rate(h, 'atm');
  assert r->>'result' = 'atm_rate_limited', '當日第 3 次 ATM 應被擋：' || r::text;
  assert (panpan.check_booking_rate(h, 'card'))->>'result' = 'ok', '信用卡仍可';
  assert not exists (select 1 from panpan.booking_rate_events where ip_hash = h and kind = 'atm'
                      group by ip_hash having count(*) > 2), '被擋的不寫入';
  raise notice 'PASS 每 IP 每日 2 次 ATM';
end $$;

-- ③ 維護函式：釋出逾時保留 ＋ 清掉 2 天前的限流紀錄
do $$
declare r jsonb;
begin
  insert into panpan.booking_rate_events (ip_hash, kind, created_at) values (repeat('d', 64), 'create', now() - interval '3 days');
  r := panpan.booking_maintenance();
  assert (r->>'purged')::int >= 1, '應清掉舊紀錄：' || r::text;
  assert not exists (select 1 from panpan.booking_rate_events where created_at < now() - interval '2 days');
  assert exists (select 1 from panpan.booking_rate_events where ip_hash = repeat('a', 64)), '近期紀錄保留';
  raise notice 'PASS booking_maintenance';
end $$;

-- ④ anon／authenticated 不能碰限流表與 RPC
begin;
set local role anon;
do $$
begin
  begin
    perform count(*) from panpan.booking_rate_events;
    raise exception 'anon 不應能讀限流表';
  exception when insufficient_privilege then null;
  end;
  begin
    perform panpan.check_booking_rate(repeat('e', 64), 'card');
    raise exception 'anon 不應能呼叫 check_booking_rate';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon 不能碰限流';
end $$;
rollback;

-- ⑤ 供應商直接查 bookings 表也只看得到已確認／已退款（未付款／逾時／取消客人的電話拿不到）
do $$
begin
  assert exists (select 1 from panpan.bookings where vendor_id = '10000000-0000-0000-0000-00000000000a'
                  and status in ('pending_payment', 'expired', 'cancelled')), '前置：A 有非確認的預約';
end $$;
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert (select count(*) from panpan.bookings where status not in ('confirmed', 'refunded')) = 0,
    'A 直接查 bookings 不應看到未付款／逾時／取消';
  assert (select count(*) from panpan.bookings where status = 'confirmed') > 0, 'A 仍看得到自己的已確認';
  raise notice 'PASS 供應商讀 bookings 只限已確認／已退款';
end $$;
rollback;
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert (select count(*) from panpan.bookings where status = 'pending_payment') > 0, '管理員仍可讀全部';
  raise notice 'PASS 管理員不受影響';
end $$;
rollback;

-- ⑥ 併發：同一 IP 兩條連線同時送（各 4 次）→ 合計只放行 5 次（檢查＋寫入是原子的）
create extension if not exists dblink;
select coalesce(nullif(:'c2conn', ''), format('dbname=%s user=%s', current_database(), current_user)) as c2conn \gset
select dblink_connect('c3', :'c2conn');
select dblink_send_query('c3', $q$
  do $$ declare i int; begin
    for i in 1..4 loop
      insert into sqltest.results values ('rate_c3_' || i, panpan.check_booking_rate(repeat('f', 64), 'card'));
    end loop;
    perform pg_sleep(1);
  end $$;
$q$);
select pg_sleep(0.3);
do $$ declare i int; begin
  for i in 1..4 loop
    insert into sqltest.results values ('rate_main_' || i, panpan.check_booking_rate(repeat('f', 64), 'card'));
  end loop;
end $$;
select * from dblink_get_result('c3') as t(status text);
select * from dblink_get_result('c3') as t(status text);
do $$
begin
  assert (select count(*) from sqltest.results where k like 'rate_%' and v->>'result' = 'ok') = 5,
    '併發下合計只放行 5 次，實際：' || (select count(*) from sqltest.results where k like 'rate_%' and v->>'result' = 'ok');
  assert (select count(*) from panpan.booking_rate_events where ip_hash = repeat('f', 64)) = 5;
  raise notice 'PASS 限流在併發下仍原子';
end $$;
select dblink_disconnect('c3');

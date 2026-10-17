-- 兩條連線的併發情境（dblink 開第二條連線，pg_sleep 控制先後）
create extension if not exists dblink;
select coalesce(nullif(:'c2conn', ''), format('dbname=%s user=%s', current_database(), current_user)) as c2conn \gset
select dblink_connect('c2', :'c2conn');

-- ① 同 vendor 同時段兩人同時搶：c2 先拿到 vendor 鎖並持有 1 秒，主連線等鎖後 slot_taken
select dblink_send_query('c2', $q$
  do $$ begin
    insert into sqltest.results values ('race_c2', sqltest.book('DD9001', sqltest.set_a(), sqltest.day(30), 'card', 'r1@example.com', '0910101010'));
    perform pg_sleep(1);
  end $$;
$q$);
select pg_sleep(0.3);
insert into sqltest.results values ('race_main', sqltest.book('DD9002', sqltest.set_a(), sqltest.day(30), 'card', 'r2@example.com', '0920202020'));
select * from dblink_get_result('c2') as t(status text);
select * from dblink_get_result('c2') as t(status text);
do $$
begin
  assert (select v->>'result' from sqltest.results where k = 'race_c2') = 'created', 'c2 created';
  assert (select v->>'result' from sqltest.results where k = 'race_main') = 'slot_taken', 'main slot_taken';
  assert (select count(*) from panpan.bookings where vendor_id = '10000000-0000-0000-0000-00000000000a'
            and starts_at = sqltest.day(30) and status in ('pending_payment', 'confirmed')) = 1, '只有一筆';
  raise notice 'PASS 同 vendor 同時段併發只有一筆成功';
end $$;

-- ② 不同 vendor 同時段併發：兩筆都成功（鎖以 vendor 為鍵，不互相阻擋）
select dblink_send_query('c2', $q$
  do $$ begin
    insert into sqltest.results values ('race2_c2', sqltest.book('DD9003', sqltest.set_a(), sqltest.day(31), 'card', 'r3@example.com', '0930303030'));
    perform pg_sleep(1);
  end $$;
$q$);
select pg_sleep(0.3);
select clock_timestamp() as t0 \gset
insert into sqltest.results values ('race2_main', sqltest.book('DD9004', sqltest.set_b(), sqltest.day(31), 'card', 'r4@example.com', '0940404040'));
insert into sqltest.results values ('race2_fast', to_jsonb(extract(epoch from clock_timestamp() - :'t0'::timestamptz) < 0.5));
select * from dblink_get_result('c2') as t(status text);
select * from dblink_get_result('c2') as t(status text);
do $$
begin
  assert (select v->>'result' from sqltest.results where k = 'race2_c2') = 'created';
  assert (select v->>'result' from sqltest.results where k = 'race2_main') = 'created';
  assert (select v::text::boolean from sqltest.results where k = 'race2_fast'), '不同 vendor 不應等鎖';
  raise notice 'PASS 不同 vendor 同時段併發可並存且不互等';
end $$;

-- ③ 同一筆付款兩個 notify 同時到：row lock 序列化 → 一個 confirmed、一個 already_paid
do $$ begin
  perform sqltest.book('DD9005', sqltest.set_a(), sqltest.day(32), 'card', 'r5@example.com', '0950505050');
  perform sqltest.pay('DD9005');
end $$;
select dblink_send_query('c2', $q$
  do $$ begin
    perform pg_sleep(0.3);
    insert into sqltest.results values ('notify_c2', panpan.mark_booking_paid('DD9005', 3600, 'CARD', '{}'));
  end $$;
$q$);
do $$ begin
  insert into sqltest.results values ('notify_main', panpan.mark_booking_paid('DD9005', 3600, 'CARD', '{}'));
  perform pg_sleep(1);
end $$;
select * from dblink_get_result('c2') as t(status text);
select * from dblink_get_result('c2') as t(status text);
do $$
begin
  assert (select v->>'result' from sqltest.results where k = 'notify_main') = 'confirmed';
  assert (select (v->>'transitioned')::boolean from sqltest.results where k = 'notify_main');
  assert (select v->>'result' from sqltest.results where k = 'notify_c2') = 'already_paid';
  assert not (select (v->>'transitioned')::boolean from sqltest.results where k = 'notify_c2');
  raise notice 'PASS 併發 notify 只轉換一次';
end $$;

select dblink_disconnect('c2');

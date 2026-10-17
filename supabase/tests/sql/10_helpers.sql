-- 測試資料與 helper
create schema sqltest;
create table sqltest.results (k text primary key, v jsonb);
grant usage on schema sqltest to anon, authenticated, service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'vendor-a@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'vendor-b@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000ff', 'nobody@example.com');

insert into panpan.vendors (id, name, contact_email) values
  ('10000000-0000-0000-0000-00000000000a', '供應商A', 'a@example.com'),
  ('10000000-0000-0000-0000-00000000000b', '供應商B', 'b@example.com');

insert into panpan.staff (user_id, email, role, vendor_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'vendor-a@example.com', 'vendor', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000b1', 'vendor-b@example.com', 'vendor', '10000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', 'admin', null);

insert into panpan.experience_sets (id, slug, code, name, tagline, description, headline, body, status,
                                    price_twd, duration_minutes, vendor_id, booking_enabled) values
  ('20000000-0000-0000-0000-00000000000a', 'set-a', 'SET A', '體驗A', 't', 'd', 'h', array['b'], 'published', 3600, 120, '10000000-0000-0000-0000-00000000000a', true),
  ('20000000-0000-0000-0000-0000000000a2', 'set-a2', 'SET A2', '體驗A2', 't', 'd', 'h', array['b'], 'published', 1800, 60, '10000000-0000-0000-0000-00000000000a', true),
  ('20000000-0000-0000-0000-00000000000b', 'set-b', 'SET B', '體驗B', 't', 'd', 'h', array['b'], 'published', 3600, 120, '10000000-0000-0000-0000-00000000000b', true),
  ('20000000-0000-0000-0000-0000000000c0', 'set-off', 'SET C', '體驗C', 't', 'd', 'h', array['b'], 'published', null, null, null, false);

-- 兩家都是每天 10:00、11:00、14:00
insert into panpan.vendor_weekly_slots (vendor_id, weekday, start_time)
select v, d, t
  from unnest(array['10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b']::uuid[]) v,
       generate_series(0, 6) d,
       unnest(array['10:00', '11:00', '14:00']::time[]) t;

-- 第 n 天（台北）的 hh:mm
create function sqltest.day(n integer, hhmm text default '10:00') returns timestamptz language sql stable as $$
  select (((now() at time zone 'Asia/Taipei')::date + n)::text || ' ' || hhmm)::timestamp at time zone 'Asia/Taipei'
$$;

create function sqltest.book(
  p_order text, p_set uuid, p_starts timestamptz, p_method text, p_email text, p_phone text,
  p_hold timestamptz default now() + interval '15 minutes'
) returns jsonb language sql as $$
  select panpan.create_booking(p_order, 'tok-' || p_order, p_set, p_starts, p_method, p_hold,
                               '測試客人', p_phone, p_email, '備註', 2)
$$;

create function sqltest.set_a() returns uuid language sql immutable as $$ select '20000000-0000-0000-0000-00000000000a'::uuid $$;
create function sqltest.set_a2() returns uuid language sql immutable as $$ select '20000000-0000-0000-0000-0000000000a2'::uuid $$;
create function sqltest.set_b() returns uuid language sql immutable as $$ select '20000000-0000-0000-0000-00000000000b'::uuid $$;

-- 建立付款紀錄（模擬伺服器端建單後寫入）
create function sqltest.pay(p_order text) returns void language sql as $$
  insert into panpan.payments (booking_id, gateway_order_id, amount)
  select id, order_no, amount from panpan.bookings where order_no = p_order
$$;

grant execute on all functions in schema sqltest to anon, authenticated, service_role;

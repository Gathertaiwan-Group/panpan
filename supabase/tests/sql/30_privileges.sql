-- 權限與 RLS 隔離（anon／供應商 A／供應商 B／管理員／無 staff 帳號）

-- 準備：B 有一筆已確認預約
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0100', sqltest.set_b(), sqltest.day(21), 'card', 'b-cust@example.com', '0988000001');
  perform sqltest.pay('DD0100');
  perform panpan.mark_booking_paid('DD0100', 3600, 'CARD', '{}');
  assert (select status from panpan.bookings where order_no = 'DD0100') = 'confirmed';
end $$;

-- ===== anon =====
begin;
set local role anon;
do $$
declare t text;
begin
  foreach t in array array['panpan.bookings', 'panpan.payments', 'panpan.vendor_bookings', 'panpan.vendors',
                           'panpan.staff', 'panpan.vendor_weekly_slots', 'panpan.vendor_date_overrides'] loop
    begin
      execute format('select count(*) from %s', t);
      raise exception 'anon 不應能讀 %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    perform panpan.create_booking('X', 'X', sqltest.set_a(), now(), 'card', now(), 'n', '0912345678', 'a@b.co', null);
    raise exception 'anon 不應能執行 create_booking';
  exception when insufficient_privilege then null;
  end;
  begin
    perform panpan.mark_booking_paid('DD0040', 3600, 'CARD', '{}');
    raise exception 'anon 不應能執行 mark_booking_paid';
  exception when insufficient_privilege then null;
  end;
  begin
    perform panpan.is_admin();
    raise exception 'anon 不應能執行 is_admin';
  exception when insufficient_privilege then null;
  end;
  -- 公開內容仍可讀
  assert (select count(*) from panpan.experience_sets) >= 3, 'anon 仍可讀 experience_sets';
  raise notice 'PASS anon 讀不到預約／付款／供應商資料、不能呼叫 RPC';
end $$;
rollback;

-- ===== 供應商 A =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
declare n integer;
begin
  assert panpan.my_vendor_id() = '10000000-0000-0000-0000-00000000000a', 'my_vendor_id';
  assert not panpan.is_admin(), 'A 不是管理員';
  assert (select count(*) from panpan.vendor_bookings) > 0, 'A 看得到自己的已確認預約';
  assert (select count(*) from panpan.vendor_bookings where vendor_id <> '10000000-0000-0000-0000-00000000000a') = 0,
    'A 看不到 B 的預約（view）';
  begin
    perform order_no from panpan.bookings limit 1;
    raise exception 'A 不應能讀 order_no 以外未授權欄位';
  exception when insufficient_privilege then null;
  end;
  begin
    perform email from panpan.bookings limit 1;
    raise exception 'A 不應能讀客人 Email';
  exception when insufficient_privilege then null;
  end;
  begin
    perform access_token from panpan.bookings limit 1;
    raise exception 'A 不應能讀 access_token';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from panpan.bookings b where b.vendor_id = '10000000-0000-0000-0000-00000000000b') = 0,
    'A 直接查 bookings 也看不到 B';
  begin
    perform count(*) from panpan.payments;
    raise exception 'A 不應能讀 payments';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from panpan.vendors) = 1, 'A 只看得到自己的供應商資料';
  assert (select count(*) from panpan.staff) = 1, 'A 只看得到自己的 staff';

  -- 時段：看不到、改不了、刪不了 B 的
  assert (select count(*) from panpan.vendor_weekly_slots where vendor_id = '10000000-0000-0000-0000-00000000000b') = 0;
  update panpan.vendor_weekly_slots set start_time = '09:00' where vendor_id = '10000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'A 改不了 B 的時段';
  delete from panpan.vendor_weekly_slots where vendor_id = '10000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'A 刪不了 B 的時段';
  begin
    insert into panpan.vendor_weekly_slots (vendor_id, weekday, start_time)
      values ('10000000-0000-0000-0000-00000000000b', 1, '08:00');
    raise exception 'A 不應能幫 B 新增時段';
  exception when insufficient_privilege then null;  -- RLS with check 違反 = 42501
  end;
  begin
    update panpan.vendor_weekly_slots set vendor_id = '10000000-0000-0000-0000-00000000000b'
     where vendor_id = '10000000-0000-0000-0000-00000000000a' and weekday = 1 and start_time = '10:00';
    raise exception 'A 不應能把時段搬給 B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into panpan.vendor_date_overrides (vendor_id, date, closed)
      values ('10000000-0000-0000-0000-00000000000b', current_date + 30, true);
    raise exception 'A 不應能幫 B 請假';
  exception when insufficient_privilege then null;
  end;
  -- 自己的可以
  insert into panpan.vendor_weekly_slots (vendor_id, weekday, start_time)
    values ('10000000-0000-0000-0000-00000000000a', 1, '08:00');
  insert into panpan.vendor_date_overrides (vendor_id, date, closed)
    values ('10000000-0000-0000-0000-00000000000a', current_date + 30, true);
  delete from panpan.vendor_weekly_slots where vendor_id = '10000000-0000-0000-0000-00000000000a' and start_time = '08:00';
  get diagnostics n = row_count;
  assert n = 1, 'A 可刪自己的時段';
  -- 寫入類 RPC 一律不給
  begin
    perform panpan.mark_booking_paid('DD0040', 3600, 'CARD', '{}');
    raise exception 'A 不應能執行 mark_booking_paid';
  exception when insufficient_privilege then null;
  end;
  begin
    perform panpan.create_booking('X', 'X', sqltest.set_a(), now(), 'card', now(), 'n', '0912345678', 'a@b.co', null);
    raise exception 'A 不應能執行 create_booking';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 供應商 A 只看得到／改得到自己的';
end $$;
rollback;

-- B 的時段沒有被動到
do $$
begin
  assert (select count(*) from panpan.vendor_weekly_slots where vendor_id = '10000000-0000-0000-0000-00000000000b') = 21,
    'B 的時段完好';
  raise notice 'PASS B 的時段未被 A 影響';
end $$;

-- ===== 供應商 B 看不到 A =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert (select count(*) from panpan.vendor_bookings) = 1, 'B 只看到自己的 1 筆已確認';
  assert (select count(*) from panpan.vendor_bookings where vendor_id = '10000000-0000-0000-0000-00000000000a') = 0;
  raise notice 'PASS 供應商 B 看不到 A 的預約';
end $$;
rollback;

-- ===== 無 staff 紀錄的登入者 =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert panpan.my_vendor_id() is null and not panpan.is_admin();
  assert (select count(*) from panpan.vendor_bookings) = 0, '無 staff 看不到預約';
  assert (select count(*) from panpan.vendor_weekly_slots) = 0, '無 staff 看不到時段';
  assert (select count(*) from panpan.vendors) = 0;
  raise notice 'PASS 無 staff 紀錄的帳號什麼都看不到';
end $$;
rollback;

-- ===== 停用的供應商帳號 =====
update panpan.staff set active = false where user_id = '00000000-0000-0000-0000-0000000000a1';
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert panpan.my_vendor_id() is null, '停用後 my_vendor_id 為 null';
  assert (select count(*) from panpan.vendor_bookings) = 0, '停用後看不到預約';
  raise notice 'PASS 停用帳號失去存取';
end $$;
rollback;
update panpan.staff set active = true where user_id = '00000000-0000-0000-0000-0000000000a1';

-- ===== 管理員 =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert panpan.is_admin();
  assert (select count(distinct vendor_id) from panpan.vendor_bookings) = 2, '管理員看得到兩家';
  begin
    perform count(*) from panpan.payments;
    raise exception '管理員走 user client 也不能直接讀 payments（一律伺服器端）';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 管理員可讀全部預約（必要欄位）';
end $$;
rollback;

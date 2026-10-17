-- 一般消費者會員：預約歸戶（claim）、客人只看得到自己的、不能寫入、不能自升為 staff

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'Cust-A@Example.com', now()),   -- 已驗證（大小寫不同也要認領得到）
  ('00000000-0000-0000-0000-0000000000c2', 'cust-b@example.com', now()),   -- 已驗證
  ('00000000-0000-0000-0000-0000000000c3', 'cust-u@example.com', null);    -- 未驗證

-- 準備：A、B、未驗證者各有預約（訪客下單，user_id 為 null）
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0601', sqltest.set_a(), sqltest.day(47, '10:00'), 'card', ' cust-a@example.com ', '0988060001');
  assert r->>'result' = 'created', r::text;
  r := sqltest.book('DD0602', sqltest.set_b(), sqltest.day(47, '10:00'), 'card', 'cust-b@example.com', '0988060002');
  assert r->>'result' = 'created', r::text;
  r := sqltest.book('DD0603', sqltest.set_b(), sqltest.day(47, '14:00'), 'card', 'cust-u@example.com', '0988060003');
  assert r->>'result' = 'created', r::text;
  perform sqltest.pay('DD0601');
  perform panpan.mark_booking_paid('DD0601', 3600, 'CARD', '{}');
  assert (select count(*) from panpan.bookings where order_no in ('DD0601', 'DD0602', 'DD0603') and user_id is null) = 3;
end $$;

-- ===== anon 不能認領／讀 =====
begin;
set local role anon;
do $$
begin
  begin
    perform panpan.claim_my_bookings();
    raise exception 'anon 不應能執行 claim_my_bookings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from panpan.my_bookings();
    raise exception 'anon 不應能執行 my_bookings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform panpan.confirmed_user_id('00000000-0000-0000-0000-0000000000c1');
    raise exception 'anon 不應能執行 confirmed_user_id';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon 不能認領／讀會員預約';
end $$;
rollback;

-- ===== 未驗證 Email 的帳號認領不到 =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert panpan.claim_my_bookings() = 0, '未驗證帳號不可認領';
  assert (select count(*) from panpan.my_bookings()) = 0, '未驗證帳號 my_bookings 為空';
  assert (select count(*) from panpan.bookings) = 0, '未驗證帳號直接查 bookings 為空';
  raise notice 'PASS 未驗證 Email 的帳號認領不到預約';
end $$;
commit;
do $$ begin
  assert (select user_id from panpan.bookings where order_no = 'DD0603') is null, 'DD0603 仍未歸戶';
end $$;

-- ===== 客人 A：認領自己的、看不到 B 的 =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert panpan.claim_my_bookings() = 1, 'A 認領 1 筆（Email 大小寫／空白正規化）';
  assert panpan.claim_my_bookings() = 0, '再次認領為 0（冪等）';
  assert (select count(*) from panpan.my_bookings()) = 1, 'A 只看到 1 筆';
  assert (select order_no from panpan.my_bookings()) = 'DD0601', 'A 看到自己的訂單編號';
  assert (select payment_status from panpan.my_bookings()) = 'paid', 'A 看得到自己的付款狀態';
  assert (select vendor_name from panpan.my_bookings()) = '供應商A', 'A 看得到供應商名稱';
  assert (select count(*) from panpan.bookings) = 1, 'A 直接查 bookings 只有自己的';
  assert (select count(*) from panpan.bookings where id in (select id from panpan.bookings b2 where b2.vendor_id = '10000000-0000-0000-0000-00000000000b')) = 0,
    'A 看不到 B 的預約';
  raise notice 'PASS 客人 A 只認領／看得到自己的預約';
end $$;
commit;

begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
do $$
declare t text;
begin
  -- 敏感欄位：直接查表讀不到
  foreach t in array array['order_no', 'email', 'access_token', 'admin_note', 'needs_attention', 'attention_reason', 'amount', 'user_id'] loop
    begin
      execute format('select %I from panpan.bookings limit 1', t);
      raise exception '客人不應能直接讀 bookings.%', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  -- 其他人的資料
  begin
    perform count(*) from panpan.payments;
    raise exception '客人不應能讀 payments';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from panpan.staff) = 0, '客人讀不到 staff';
  assert (select count(*) from panpan.vendors) = 0, '客人讀不到 vendors';
  assert (select count(*) from panpan.vendor_bookings) = 0, '客人讀不到 vendor_bookings';
  assert (select count(*) from panpan.vendor_weekly_slots) = 0, '客人讀不到時段';
  assert not panpan.is_admin() and panpan.my_vendor_id() is null, '客人不是 staff';
  raise notice 'PASS 客人無法讀 staff／vendors／付款／其他人資料與敏感欄位';
end $$;
rollback;

-- ===== 客人不能寫入、不能自升為 staff =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    insert into panpan.staff (user_id, email, role) values ('00000000-0000-0000-0000-0000000000c1', 'x', 'admin');
    raise exception '客人不應能新增 staff';
  exception when insufficient_privilege then null;
  end;
  begin
    update panpan.staff set role = 'admin';
    raise exception '客人不應能修改 staff';
  exception when insufficient_privilege then null;
  end;
  begin
    update panpan.bookings set status = 'cancelled';
    raise exception '客人不應能修改 bookings';
  exception when insufficient_privilege then null;
  end;
  begin
    update panpan.bookings set user_id = '00000000-0000-0000-0000-0000000000c1';
    raise exception '客人不應能改 user_id';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from panpan.bookings;
    raise exception '客人不應能刪除 bookings';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into panpan.bookings (order_no) values ('X');
    raise exception '客人不應能新增 bookings';
  exception when insufficient_privilege then null;
  end;
  begin
    perform panpan.create_booking('X', 'X', sqltest.set_a(), now(), 'card', now(), 'n', '0912345678', 'a@b.co', null);
    raise exception '客人不應能執行 create_booking';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into panpan.payments (booking_id, gateway_order_id, amount) values (gen_random_uuid(), 'X', 100);
    raise exception '客人不應能新增 payments';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 客人不能寫入預約／付款、不能自升為 staff';
end $$;
rollback;
do $$ begin
  assert not exists (select 1 from panpan.staff where user_id = '00000000-0000-0000-0000-0000000000c1'), '客人未成為 staff';
end $$;

-- ===== 客人 B：看不到 A 的；A 的認領不會搶到 B 的 =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert (select count(*) from panpan.my_bookings()) = 0, 'B 尚未認領前什麼都看不到（A 的也看不到）';
  assert panpan.claim_my_bookings() = 1, 'B 認領自己的 1 筆';
  assert (select array_agg(order_no) from panpan.my_bookings()) = array['DD0602'], 'B 只看到 DD0602';
  assert (select count(*) from panpan.bookings) = 1, 'B 直接查也只有自己的';
  raise notice 'PASS A 客人看不到 B 的預約、B 看不到 A 的';
end $$;
commit;

-- ===== 下單時直接歸戶：已驗證才寫入 user_id =====
do $$
declare r jsonb;
begin
  r := panpan.create_booking('DD0611', 'tok-DD0611', sqltest.set_a(), sqltest.day(48, '10:00'), 'card',
                             now() + interval '15 minutes', '客人A', '0988060011', 'other@example.com', null, 2,
                             p_user_id => '00000000-0000-0000-0000-0000000000c1');
  assert r->>'result' = 'created', r::text;
  assert (select user_id from panpan.bookings where order_no = 'DD0611') = '00000000-0000-0000-0000-0000000000c1', '已驗證 → 寫入 user_id';
  r := panpan.create_booking('DD0612', 'tok-DD0612', sqltest.set_a(), sqltest.day(48, '14:00'), 'card',
                             now() + interval '15 minutes', '未驗證', '0988060012', 'x2@example.com', null, 2,
                             p_user_id => '00000000-0000-0000-0000-0000000000c3');
  assert r->>'result' = 'created', r::text;
  assert (select user_id from panpan.bookings where order_no = 'DD0612') is null, '未驗證 → 不寫入 user_id';
  -- 帳號刪除 → user_id set null（預約保留）
  delete from auth.users where id = '00000000-0000-0000-0000-0000000000c2';
  assert (select user_id from panpan.bookings where order_no = 'DD0602') is null, '帳號刪除後預約保留、user_id 清空';
  raise notice 'PASS 下單直接歸戶只限已驗證帳號；刪帳號不刪預約';
end $$;

-- ===== 既有權限不變：供應商仍讀不到 order_no／金額，也看不到客人歸戶欄位 =====
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  begin
    perform user_id from panpan.bookings limit 1;
    raise exception '供應商不應能讀 user_id';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from panpan.my_bookings()) = 0, '供應商的 my_bookings 不含客人預約';
  assert (select count(*) from panpan.vendor_bookings where vendor_id <> '10000000-0000-0000-0000-00000000000a') = 0;
  raise notice 'PASS 供應商權限不變';
end $$;
rollback;

-- ===== 同時是客人的供應商：後台 vendor_bookings 不會混入自己當客人的預約 =====
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0621', sqltest.set_b(), sqltest.day(49, '10:00'), 'card', 'vendor-a@example.com', '0988060021');
  assert r->>'result' = 'created', r::text;
  perform sqltest.pay('DD0621');
  perform panpan.mark_booking_paid('DD0621', 3600, 'CARD', '{}');
end $$;
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert panpan.claim_my_bookings() = 1, '供應商 A 以客人身分認領自己的預約';
  assert (select count(*) from panpan.my_bookings()) = 1, '會員專區看得到';
  assert (select count(*) from panpan.vendor_bookings where vendor_id = '10000000-0000-0000-0000-00000000000b') = 0,
    '供應商後台不混入（B 家的）自己當客人的預約';
  raise notice 'PASS 同時是客人的供應商：後台不混入自己的消費預約';
end $$;
rollback;

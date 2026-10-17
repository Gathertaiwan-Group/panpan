-- create_booking / mark_booking_paid 功能測試（superuser 身分，等同伺服器端 service role）

-- ① 正常建立；不同 vendor 同時段可並存；同 vendor 重疊時段 slot_taken
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0001', sqltest.set_a(), sqltest.day(5), 'card', 'p1@example.com', '0911000001');
  assert r->>'result' = 'created', 'A 建立：' || r::text;
  assert (r->>'amount')::int = 3600, '金額取自 DB';
  r := sqltest.book('DD0002', sqltest.set_b(), sqltest.day(5), 'card', 'p2@example.com', '0911000002');
  assert r->>'result' = 'created', '不同 vendor 同時段可並存：' || r::text;
  -- 同 vendor A、另一個 SET（60 分）11:00 開始 → 與 10:00-12:00 重疊
  r := sqltest.book('DD0003', sqltest.set_a2(), sqltest.day(5, '11:00'), 'card', 'p3@example.com', '0911000003');
  assert r->>'result' = 'slot_taken', '同 vendor 重疊應 slot_taken：' || r::text;
  r := sqltest.book('DD0004', sqltest.set_a(), sqltest.day(5), 'card', 'p4@example.com', '0911000004');
  assert r->>'result' = 'slot_taken', '同 vendor 同時段應 slot_taken';
  raise notice 'PASS 同 vendor 互斥、不同 vendor 並存';
end $$;

-- ② 時間規則與時段必須是有開的
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0010', sqltest.set_a(), now() + interval '2 hours', 'card', 'q@example.com', '0922000001');
  assert r->>'result' = 'out_of_range', '24 小時內不可約：' || r::text;
  r := sqltest.book('DD0011', sqltest.set_a(), sqltest.day(70), 'card', 'q@example.com', '0922000001');
  assert r->>'result' = 'out_of_range', '超過 60 天不可約';
  r := sqltest.book('DD0012', sqltest.set_a(), sqltest.day(6, '12:30'), 'card', 'q@example.com', '0922000001');
  assert r->>'result' = 'slot_unavailable', '沒開的時間不可約：' || r::text;
  r := sqltest.book('DD0013', sqltest.set_a(), sqltest.day(2), 'atm', 'q@example.com', '0922000001', now() + interval '1 day');
  assert r->>'result' = 'atm_not_allowed', 'ATM 需 72 小時後：' || r::text;
  r := sqltest.book('DD0014', '20000000-0000-0000-0000-0000000000c0', sqltest.day(6), 'card', 'q@example.com', '0922000001');
  assert r->>'result' = 'not_bookable', '未開放線上預約的 SET';
  -- 請假
  insert into panpan.vendor_date_overrides (vendor_id, date, closed)
    values ('10000000-0000-0000-0000-00000000000a', ((now() at time zone 'Asia/Taipei')::date + 7), true);
  r := sqltest.book('DD0015', sqltest.set_a(), sqltest.day(7), 'card', 'q@example.com', '0922000001');
  assert r->>'result' = 'slot_unavailable', '請假日不可約';
  -- 加開
  insert into panpan.vendor_date_overrides (vendor_id, date, extra_times)
    values ('10000000-0000-0000-0000-00000000000a', ((now() at time zone 'Asia/Taipei')::date + 8), array['19:00'::time]);
  r := sqltest.book('DD0016', sqltest.set_a(), sqltest.day(8, '19:00'), 'card', 'q@example.com', '0922000001');
  assert r->>'result' = 'created', '加開時段可約：' || r::text;
  raise notice 'PASS 時間規則／請假／加開';
end $$;

-- ③ 逾時保留可被搶
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0020', sqltest.set_a(), sqltest.day(9), 'card', 'old@example.com', '0933000001');
  assert r->>'result' = 'created';
  update panpan.bookings set hold_expires_at = now() - interval '1 minute' where order_no = 'DD0020';
  r := sqltest.book('DD0021', sqltest.set_a(), sqltest.day(9), 'card', 'new@example.com', '0933000002');
  assert r->>'result' = 'created', '逾時保留應可被搶：' || r::text;
  assert (select status from panpan.bookings where order_no = 'DD0020') = 'expired', '舊保留標記 expired';
  raise notice 'PASS 逾時保留可被搶';
end $$;

-- ④ 同人未付款上限（2 筆；Email 或電話任一相同都算）；同人同時段重下單會取代舊保留
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0030', sqltest.set_a(), sqltest.day(10), 'card', 'same@example.com', '0944000001');
  assert r->>'result' = 'created';
  r := sqltest.book('DD0031', sqltest.set_a(), sqltest.day(11), 'card', 'SAME@example.com ', '0944000099');
  assert r->>'result' = 'created';
  assert panpan.normalize_phone('+886 944-000-001') = '0944000001', '電話正規化';
  r := sqltest.book('DD0032', sqltest.set_b(), sqltest.day(12), 'card', 'same@example.com', '+886 944-000-001');
  assert r->>'result' = 'too_many_pending', '同人第 3 筆應被擋：' || r::text;
  r := sqltest.book('DD0033', sqltest.set_a(), sqltest.day(10), 'card', 'same@example.com', '0944000001');
  assert r->>'result' = 'created' and (r->>'replaced')::int = 1, '同人同時段重下單取代舊保留：' || r::text;
  assert (select status from panpan.bookings where order_no = 'DD0030') = 'cancelled';
  raise notice 'PASS 同人上限與取代';
end $$;

-- ⑤ mark_booking_paid：金額不符不轉換；正確金額轉 confirmed（transitioned）；重複呼叫冪等
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0040', sqltest.set_a(), sqltest.day(13), 'card', 'pay@example.com', '0955000001');
  perform sqltest.pay('DD0040');
  r := panpan.mark_booking_paid('DD0040', 1, 'CARD', '{}');
  assert r->>'result' = 'amount_mismatch' and (r->>'transitioned')::boolean = false, '金額不符：' || r::text;
  assert (select status from panpan.bookings where order_no = 'DD0040') = 'pending_payment', '金額不符不轉換';
  assert (select status from panpan.payments where gateway_order_id = 'DD0040') = 'init';
  r := panpan.mark_booking_paid('DD0040', 3600, 'CARD', '{"a":1}');
  assert r->>'result' = 'confirmed' and (r->>'transitioned')::boolean, '正確金額確認：' || r::text;
  assert (select status from panpan.bookings where order_no = 'DD0040') = 'confirmed';
  assert (select paid_at is not null and hold_expires_at is null from panpan.bookings where order_no = 'DD0040');
  r := panpan.mark_booking_paid('DD0040', 3600, 'CARD', '{}');
  assert r->>'result' = 'already_paid' and (r->>'transitioned')::boolean = false, '重複呼叫冪等：' || r::text;
  r := panpan.mark_booking_paid('NOPE', 3600, 'CARD', '{}');
  assert r->>'result' = 'not_found';
  raise notice 'PASS mark_booking_paid 金額比對／冪等';
end $$;

-- ⑥ 逾時後才付款：時段仍空 → 收回確認；時段已被佔 → 需人工處理
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0050', sqltest.set_a(), sqltest.day(14), 'card', 'late1@example.com', '0966000001');
  perform sqltest.pay('DD0050');
  update panpan.bookings set hold_expires_at = now() - interval '1 minute' where order_no = 'DD0050';
  perform panpan.expire_stale_holds();
  assert (select status from panpan.bookings where order_no = 'DD0050') = 'expired';
  r := panpan.mark_booking_paid('DD0050', 3600, 'CARD', '{}');
  assert r->>'result' = 'confirmed' and (r->>'reclaimed')::boolean, '時段仍空應收回：' || r::text;

  r := sqltest.book('DD0051', sqltest.set_a(), sqltest.day(15), 'card', 'late2@example.com', '0966000002');
  perform sqltest.pay('DD0051');
  update panpan.bookings set hold_expires_at = now() - interval '1 minute' where order_no = 'DD0051';
  r := sqltest.book('DD0052', sqltest.set_a(), sqltest.day(15), 'card', 'taker@example.com', '0966000003');
  assert r->>'result' = 'created';
  r := panpan.mark_booking_paid('DD0051', 3600, 'CARD', '{}');
  assert r->>'result' = 'needs_attention' and r->>'reason' = 'paid_after_expiry_slot_taken'
     and (r->>'attention_new')::boolean, '時段被佔應人工處理：' || r::text;
  assert (select status from panpan.bookings where order_no = 'DD0051') = 'expired';
  assert (select needs_attention from panpan.bookings where order_no = 'DD0051');
  assert (select status from panpan.payments where gateway_order_id = 'DD0051') = 'paid', '錢已收，付款標記 paid';
  raise notice 'PASS 逾時後付款（收回／人工處理）';
end $$;

-- ⑦ ATM 取號延長保留（不超過開始前 1 小時）
do $$
declare r jsonb;
begin
  r := sqltest.book('DD0060', sqltest.set_b(), sqltest.day(20), 'atm', 'atm@example.com', '0977000001', now() + interval '2 days');
  assert r->>'result' = 'created', 'ATM 建立：' || r::text;
  perform sqltest.pay('DD0060');
  r := panpan.record_atm_info('DD0060', '012', '9999888877776666', now() + interval '3 days', '{}');
  assert (select atm_virtual_account from panpan.payments where gateway_order_id = 'DD0060') = '9999888877776666';
  assert (select hold_expires_at > now() + interval '2 days 23 hours' from panpan.bookings where order_no = 'DD0060');
  raise notice 'PASS ATM 取號';
end $$;

-- 朵朵曉語：一般消費者會員專區（預約歸戶）
-- ⚠️ 只動 panpan schema；不碰 public / hank。auth.users 只讀（FK ＋ 判斷 email_confirmed_at）。
--
-- 1. bookings.user_id（nullable，FK auth.users，帳號刪除 → set null）
-- 2. create_booking 多一個 p_user_id（伺服器端從 session 取得；只有 Email 已驗證的帳號才寫入）
-- 3. panpan.claim_my_bookings()：security definer；Email 一律取自 auth.users（且必須已驗證），
--    只認領 user_id is null 且 email_norm 相同的預約
-- 4. 客人讀取：
--    - RLS：bookings 加「客人只讀自己的」policy（欄位仍受既有的欄位層級 grant 限制，order_no／金額／Email／token 都讀不到）
--    - panpan.my_bookings()：security definer，只回本人（auth.uid()）且 Email 已驗證的預約，
--      只含客人需要的欄位（不含 access_token、admin_note、needs_attention／attention_reason、付款原始資料）
--    - 客人對 bookings／payments 沒有任何 insert／update／delete 權限（沿用既有：authenticated 只有 select 欄位）

-- =====================================================================
-- 1. 欄位
-- =====================================================================
alter table panpan.bookings
  add column user_id uuid references auth.users (id) on delete set null;
create index bookings_user_idx on panpan.bookings (user_id, starts_at) where user_id is not null;
create index bookings_unclaimed_email_idx on panpan.bookings (email_norm) where user_id is null;

-- =====================================================================
-- 2. create_booking：加 p_user_id（簽章改變 → 先 drop 再建）
-- =====================================================================
-- auth.users 只有 owner（security definer）讀得到：Email 已驗證才回傳 id，否則 null
create or replace function panpan.confirmed_user_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null;
$$;
revoke execute on function panpan.confirmed_user_id(uuid) from public, anon, authenticated;
grant execute on function panpan.confirmed_user_id(uuid) to service_role;
drop function panpan.create_booking(text, text, uuid, timestamptz, text, timestamptz, text, text, text, text, integer, interval, interval, interval);

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
  p_atm_lead        interval default interval '72 hours',
  p_user_id         uuid default null
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
  v_uid       uuid;
begin
  -- 歸戶：呼叫端（伺服器）從 session 取得的使用者；只有 Email 已驗證的帳號才寫入
  if p_user_id is not null then
    v_uid := panpan.confirmed_user_id(p_user_id);
  end if;

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
      hold_expires_at, customer_name, phone, email, note, email_norm, phone_norm, consent_at, user_id
    ) values (
      p_order_no, p_access_token, v_set.id, v_set.name, v_set.vendor_id, p_starts_at, v_ends_at,
      'pending_payment', p_pay_method, v_set.price_twd, p_hold_expires_at,
      btrim(p_customer_name), btrim(p_phone), btrim(p_email), nullif(btrim(coalesce(p_note, '')), ''),
      v_email, v_phone, now(), v_uid
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

revoke execute on function panpan.create_booking(text, text, uuid, timestamptz, text, timestamptz, text, text, text, text, integer, interval, interval, interval, uuid) from public, anon, authenticated;
grant execute on function panpan.create_booking(text, text, uuid, timestamptz, text, timestamptz, text, text, text, text, integer, interval, interval, interval, uuid) to service_role;

-- =====================================================================
-- 3. 認領（登入／驗證完成後由伺服器以使用者 session 呼叫）
-- =====================================================================
create or replace function panpan.claim_my_bookings()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_n     integer;
begin
  if v_uid is null then
    return 0;
  end if;
  select lower(btrim(u.email)) into v_email
    from auth.users u
   where u.id = v_uid and u.email_confirmed_at is not null and u.email is not null;
  if v_email is null or v_email = '' then
    return 0;   -- 未驗證 Email 的帳號認領不到任何預約
  end if;
  update panpan.bookings b
     set user_id = v_uid
   where b.user_id is null
     and b.email_norm = v_email;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- =====================================================================
-- 4. 客人讀取
-- =====================================================================
create policy "customer reads own bookings" on panpan.bookings for select to authenticated
  using (user_id = (select auth.uid()));

-- vendor_bookings 是 security_invoker view：加了客人 policy 後，「同時也是客人的供應商」會在後台看到自己當客人的預約
-- → view 明確限定為「管理員或自己 vendor」（欄位不變，供應商既有可見範圍不變）
create or replace view panpan.vendor_bookings
with (security_invoker = true)
as
select b.id, b.vendor_id, b.set_id, b.set_name, b.starts_at, b.ends_at, b.status,
       b.customer_name, b.phone, b.note
  from panpan.bookings b
 where b.status in ('confirmed', 'refunded')
   and ((select panpan.is_admin()) or b.vendor_id = (select panpan.my_vendor_id()));

create or replace function panpan.my_bookings()
returns table (
  id               uuid,
  order_no         text,
  set_id           uuid,
  set_name         text,
  set_slug         text,
  vendor_name      text,
  vendor_phone     text,
  vendor_email     text,
  starts_at        timestamptz,
  ends_at          timestamptz,
  status           text,
  hold_expires_at  timestamptz,
  pay_method       text,
  amount           integer,
  customer_name    text,
  payment_status   text,
  paid_at          timestamptz,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.order_no, b.set_id, b.set_name, s.slug, v.name, v.phone, v.contact_email,
         b.starts_at, b.ends_at, b.status, b.hold_expires_at, b.pay_method, b.amount, b.customer_name,
         (select p.status from panpan.payments p where p.booking_id = b.id order by p.created_at desc limit 1),
         b.paid_at, b.created_at
    from panpan.bookings b
    join auth.users u on u.id = b.user_id and u.email_confirmed_at is not null
    left join panpan.experience_sets s on s.id = b.set_id
    left join panpan.vendors v on v.id = b.vendor_id
   where b.user_id = (select auth.uid())
   order by b.starts_at desc;
$$;

revoke execute on function panpan.claim_my_bookings() from public, anon, authenticated;
revoke execute on function panpan.my_bookings() from public, anon, authenticated;
grant execute on function panpan.claim_my_bookings() to authenticated, service_role;
grant execute on function panpan.my_bookings() to authenticated, service_role;

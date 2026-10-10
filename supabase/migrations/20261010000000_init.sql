-- Mama's Kitchen: initial schema
--
-- Conventions
-- * Customers never write orders directly. They call place_order(), which validates
--   prices on the server, locks inventory rows and writes the order atomically.
-- * Guests track an order with its unguessable tracking_token (get_order_by_token).
-- * Every chef action goes through a chef_* function that checks is_staff(),
--   writes order_status_history (the activity log) and queues a notification.
-- * Order rows snapshot item names, option labels and prices, so editing the menu
--   never changes historical orders.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('chef', 'staff');
create type public.menu_type as enum ('weekly', 'holiday', 'event', 'catering', 'custom');
create type public.menu_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum ('received', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
create type public.payment_status as enum ('unpaid', 'partially_paid', 'paid', 'refunded');
create type public.payment_method as enum ('cash', 'zelle', 'cashapp', 'card');
create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.option_kind as enum ('single', 'multi');
create type public.notification_channel as enum ('push', 'email', 'sms');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');
create type public.catering_status as enum ('new', 'quoted', 'accepted', 'declined');

-- ---------------------------------------------------------------------------
-- Staff accounts
-- ---------------------------------------------------------------------------
-- A row here makes an auth user a chef/staff member. Add the chef with:
--   insert into public.users (id, role, display_name) values ('<auth uid>', 'chef', 'Mama');
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'staff',
  display_name text,
  created_at timestamptz not null default now()
);

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Business settings (single row)
-- ---------------------------------------------------------------------------
create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Mama''s Kitchen',
  tagline text not null default 'Good Food Brings People Together',
  timezone text not null default 'America/New_York',
  pickup_address text,
  contact_phone text,
  contact_email text,
  zelle_contact text,
  cashtag text,
  payment_methods public.payment_method[] not null default '{cash,zelle,cashapp}',
  delivery_enabled boolean not null default false,
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  tax_rate numeric(6, 4) not null default 0 check (tax_rate >= 0 and tax_rate < 1),
  pickup_slots text[] not null default '{"12:00 – 1:00 PM","1:00 – 2:00 PM","2:00 – 3:00 PM"}',
  public_site_url text,
  updated_at timestamptz not null default now()
);
insert into public.business_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  phone text not null unique,          -- digits only, see normalize_phone()
  email text,
  notes text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.normalize_phone(p text) returns text
language sql immutable as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

create table public.notification_preferences (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  push boolean not null default true,
  email boolean not null default true,
  sms boolean not null default false,
  new_menus boolean not null default false,
  holiday_menus boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  token text primary key,
  customer_id uuid references public.customers (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dishes and menus
-- ---------------------------------------------------------------------------
-- menu_items is the chef's dish catalog. A dish is put on a menu via menu_entries,
-- which carries per-menu availability (max portions, sold out).
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  category text not null default 'Traditional Liberian Meals',
  image_url text,                       -- https URL, or "asset:<key>" for bundled placeholder photos
  base_price numeric(10, 2) not null check (base_price >= 0),
  is_hidden boolean not null default false,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  kind public.option_kind not null default 'single',
  required boolean not null default false,
  sort_order int not null default 0
);
create index on public.item_options (menu_item_id);

create table public.item_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.item_options (id) on delete cascade,
  label text not null,
  price_delta numeric(10, 2) not null default 0 check (price_delta >= 0),
  is_default boolean not null default false,
  sort_order int not null default 0
);
create index on public.item_option_values (option_id);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  type public.menu_type not null default 'weekly',
  title text not null,
  description text not null default '',
  cover_image_url text,
  pickup_date date not null,
  order_deadline timestamptz not null,
  status public.menu_status not null default 'draft',
  accepting_orders boolean not null default true,   -- chef can close ordering early
  share_slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.menus (status, pickup_date);

create table public.menu_entries (
  menu_id uuid not null references public.menus (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  max_quantity int check (max_quantity is null or max_quantity >= 0),   -- null = unlimited
  sold_count int not null default 0 check (sold_count >= 0),
  sold_out boolean not null default false,
  price_override numeric(10, 2) check (price_override is null or price_override >= 0),
  sort_order int not null default 0,
  primary key (menu_id, menu_item_id)
);

create table public.special_events (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid unique references public.menus (id) on delete set null,
  name text not null,
  banner_image_url text,
  description text not null default '',
  event_date date not null,
  order_deadline timestamptz,
  max_capacity int,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.catering_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text,
  email text,
  event_date text,
  event_type text not null default 'Other',
  guest_count int check (guest_count is null or guest_count > 0),
  requested_dishes text,
  budget text,
  notes text,
  status public.catering_status not null default 'new',
  quote_amount numeric(10, 2),
  quote_notes text,
  quoted_at timestamptz,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null unique default nextval('public.order_number_seq'),
  client_request_id uuid not null unique,               -- idempotency key from the device
  tracking_token uuid not null unique default gen_random_uuid(),
  menu_id uuid not null references public.menus (id),
  customer_id uuid not null references public.customers (id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  fulfillment public.fulfillment_type not null default 'pickup',
  pickup_date date not null,
  pickup_slot text,
  delivery_address text,
  notes text,
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  amount_received numeric(10, 2) not null default 0,
  refunded_amount numeric(10, 2) not null default 0,
  status public.order_status not null default 'received',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter sequence public.order_number_seq owned by public.orders.order_number;
create index on public.orders (menu_id, status);
create index on public.orders (customer_id);
create index on public.orders (pickup_date);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  image_url text,
  base_price numeric(10, 2) not null,
  unit_price numeric(10, 2) not null,
  quantity int not null check (quantity between 1 and 50),
  line_total numeric(10, 2) not null,
  instructions text,
  sort_order int not null default 0
);
create index on public.order_items (order_id);

create table public.order_item_customizations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  option_value_id uuid references public.item_option_values (id) on delete set null,
  option_name text not null,
  value_label text not null,
  price_delta numeric(10, 2) not null default 0,
  sort_order int not null default 0
);
create index on public.order_item_customizations (order_item_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null default 'payment' check (kind in ('payment', 'refund')),
  amount numeric(10, 2) not null check (amount > 0),
  method public.payment_method not null,
  reference text,
  received_at timestamptz not null default now(),
  voided_at timestamptz,
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.payments (order_id);

-- The order activity log shown on Order Detail.
create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  event text not null,
  from_status public.order_status,
  to_status public.order_status,
  actor uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.order_status_history (order_id, created_at desc);

-- Outbox for push/email/SMS. A delivery worker (not yet built) picks up 'queued'
-- rows, sends them and records the result; failed rows are retried up to max attempts.
create table public.notification_logs (
  id bigint generated always as identity primary key,
  customer_id uuid references public.customers (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  channel public.notification_channel not null,
  template text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index on public.notification_logs (status, created_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch before update on public.business_settings for each row execute function public.touch_updated_at();
create trigger touch before update on public.customers for each row execute function public.touch_updated_at();
create trigger touch before update on public.menu_items for each row execute function public.touch_updated_at();
create trigger touch before update on public.menus for each row execute function public.touch_updated_at();
create trigger touch before update on public.orders for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Notification helpers
-- ---------------------------------------------------------------------------
create function public.order_message(p_order public.orders, p_template text) returns text
language sql stable set search_path = public as $$
  select case p_template
    when 'order_placed' then format('We received your order #%s. Mama will confirm it shortly.', p_order.order_number)
    when 'confirmed' then format('Your order #%s is confirmed for %s.', p_order.order_number, to_char(p_order.pickup_date, 'FMDay, Mon FMDD'))
    when 'preparing' then format('Mama has started cooking your order #%s!', p_order.order_number)
    when 'ready' then format('Your Mama''s Kitchen order #%s is ready for pickup! Thank you for supporting us.', p_order.order_number)
    when 'completed' then format('Thanks for picking up order #%s. Enjoy!', p_order.order_number)
    when 'cancelled' then format('Your order #%s was cancelled.', p_order.order_number)
    when 'payment_received' then format('Payment received for order #%s. Thank you!', p_order.order_number)
    else format('Update on your Mama''s Kitchen order #%s.', p_order.order_number)
  end;
$$;

-- Queue one notification per channel the customer has turned on. Returns rows queued.
create function public.queue_order_notification(p_order_id uuid, p_template text) returns int
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  prefs public.notification_preferences;
  msg text;
  n int := 0;
begin
  select * into o from public.orders where id = p_order_id;
  select * into prefs from public.notification_preferences where customer_id = o.customer_id;
  msg := public.order_message(o, p_template);
  if coalesce(prefs.push, true) then
    insert into public.notification_logs (customer_id, order_id, channel, template, body)
    values (o.customer_id, o.id, 'push', p_template, msg);
    n := n + 1;
  end if;
  if coalesce(prefs.email, true) and o.customer_email is not null then
    insert into public.notification_logs (customer_id, order_id, channel, template, body)
    values (o.customer_id, o.id, 'email', p_template, msg);
    n := n + 1;
  end if;
  if coalesce(prefs.sms, false) then
    insert into public.notification_logs (customer_id, order_id, channel, template, body)
    values (o.customer_id, o.id, 'sms', p_template, msg);
    n := n + 1;
  end if;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Customer: place an order
-- ---------------------------------------------------------------------------
-- p jsonb:
-- {
--   "client_request_id": uuid, "menu_id": uuid,
--   "customer": {"name", "phone", "email"},
--   "fulfillment": "pickup"|"delivery", "pickup_slot", "delivery_address", "notes",
--   "payment_method": "cash"|"zelle"|"cashapp"|"card",
--   "notify": {"push", "email", "sms"}            (optional)
--   "items": [{"menu_item_id", "quantity", "option_value_ids": [uuid], "instructions"}]
-- }
-- Returns {"order_id", "order_number", "tracking_token"}.
create function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.business_settings;
  m public.menus;
  existing public.orders;
  v_customer_id uuid;
  v_order_id uuid;
  v_order public.orders;
  v_phone text := public.normalize_phone(p #>> '{customer,phone}');
  v_name text := nullif(trim(p #>> '{customer,name}'), '');
  v_email text := nullif(lower(trim(p #>> '{customer,email}')), '');
  v_fulfillment public.fulfillment_type := coalesce(p ->> 'fulfillment', 'pickup')::public.fulfillment_type;
  v_method public.payment_method := (p ->> 'payment_method')::public.payment_method;
  v_item jsonb;
  v_entry record;
  v_need record;
  v_value record;
  v_opt record;
  v_item_row public.menu_items;
  v_unit numeric(10, 2);
  v_qty int;
  v_subtotal numeric(10, 2) := 0;
  v_fee numeric(10, 2) := 0;
  v_tax numeric(10, 2) := 0;
  v_order_item_id uuid;
  v_value_ids uuid[];
  v_sort int := 0;
  v_count int;
begin
  if (p ->> 'client_request_id') is null then
    raise exception 'client_request_id is required' using errcode = '22023';
  end if;

  -- Idempotency: a retried submit returns the order that was already created.
  select * into existing from public.orders where client_request_id = (p ->> 'client_request_id')::uuid;
  if found then
    return jsonb_build_object('order_id', existing.id, 'order_number', existing.order_number,
                              'tracking_token', existing.tracking_token, 'duplicate', true);
  end if;

  select * into s from public.business_settings where id = 1;

  if v_name is null then raise exception 'Please enter your name.' using errcode = '22023'; end if;
  if v_phone is null or length(v_phone) < 10 then raise exception 'Please enter a valid phone number.' using errcode = '22023'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  if v_method is null or not (v_method = any (s.payment_methods)) then
    raise exception 'That payment method is not available.' using errcode = '22023';
  end if;
  if v_fulfillment = 'delivery' then
    if not s.delivery_enabled then raise exception 'Delivery is not available.' using errcode = '22023'; end if;
    if nullif(trim(p ->> 'delivery_address'), '') is null then
      raise exception 'Please enter a delivery address.' using errcode = '22023';
    end if;
    v_fee := s.delivery_fee;
  end if;

  select * into m from public.menus where id = (p ->> 'menu_id')::uuid;
  if not found or m.status <> 'published' then
    raise exception 'This menu is not available.' using errcode = 'P0001';
  end if;
  if not m.accepting_orders or now() >= m.order_deadline then
    raise exception 'Ordering for this menu has closed.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'Your order is empty.' using errcode = '22023';
  end if;
  if jsonb_array_length(p -> 'items') > 30 then
    raise exception 'Too many lines in one order.' using errcode = '22023';
  end if;

  -- Lock every menu entry this order touches, in a fixed order (avoids deadlocks),
  -- and check stock against the total quantity requested per dish.
  for v_need in
    select (i ->> 'menu_item_id')::uuid as menu_item_id, sum((i ->> 'quantity')::int) as qty
    from jsonb_array_elements(p -> 'items') i
    group by 1 order by 1
  loop
    select * into v_entry from public.menu_entries
      where menu_id = m.id and menu_item_id = v_need.menu_item_id for update;
    if not found then raise exception 'A dish in your order is not on this menu.' using errcode = 'P0001'; end if;
    select * into v_item_row from public.menu_items where id = v_need.menu_item_id;
    if v_entry.sold_out or v_item_row.is_hidden or v_item_row.archived_at is not null
       or (v_entry.max_quantity is not null and v_entry.sold_count + v_need.qty > v_entry.max_quantity) then
      raise exception '% is sold out or has fewer portions left than requested.', v_item_row.name using errcode = 'P0001';
    end if;
    update public.menu_entries set sold_count = sold_count + v_need.qty
      where menu_id = m.id and menu_item_id = v_need.menu_item_id;
  end loop;

  -- Customer record (keyed by phone).
  insert into public.customers (name, phone, email, user_id)
  values (v_name, v_phone, v_email, auth.uid())
  on conflict (phone) do update
    set name = excluded.name,
        email = coalesce(excluded.email, public.customers.email),
        user_id = coalesce(public.customers.user_id, excluded.user_id)
  returning id into v_customer_id;

  if p ? 'notify' then
    insert into public.notification_preferences (customer_id, push, email, sms)
    values (v_customer_id, coalesce((p #>> '{notify,push}')::boolean, true),
            coalesce((p #>> '{notify,email}')::boolean, true), coalesce((p #>> '{notify,sms}')::boolean, false))
    on conflict (customer_id) do update
      set push = excluded.push, email = excluded.email, sms = excluded.sms, updated_at = now();
  else
    insert into public.notification_preferences (customer_id) values (v_customer_id)
    on conflict (customer_id) do nothing;
  end if;

  insert into public.orders (client_request_id, menu_id, customer_id, customer_name, customer_phone, customer_email,
                             fulfillment, pickup_date, pickup_slot, delivery_address, notes,
                             subtotal, delivery_fee, tax, total, payment_method)
  values ((p ->> 'client_request_id')::uuid, m.id, v_customer_id, v_name, v_phone, v_email,
          v_fulfillment, m.pickup_date,
          case when v_fulfillment = 'pickup' then nullif(trim(p ->> 'pickup_slot'), '') end,
          case when v_fulfillment = 'delivery' then trim(p ->> 'delivery_address') end,
          nullif(trim(p ->> 'notes'), ''),
          0, v_fee, 0, 0, v_method)
  returning id into v_order_id;

  -- Price every line from the database, never from the client.
  for v_item in select * from jsonb_array_elements(p -> 'items')
  loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then
      raise exception 'Invalid quantity.' using errcode = '22023';
    end if;
    select mi.*, coalesce(me.price_override, mi.base_price) as price into v_entry
      from public.menu_items mi
      join public.menu_entries me on me.menu_item_id = mi.id and me.menu_id = m.id
      where mi.id = (v_item ->> 'menu_item_id')::uuid;

    select coalesce(array_agg(distinct x::uuid), '{}') into v_value_ids
      from jsonb_array_elements_text(coalesce(v_item -> 'option_value_ids', '[]'::jsonb)) x;

    -- Every chosen value must belong to this dish.
    select count(*) into v_count
      from public.item_option_values v join public.item_options o on o.id = v.option_id
      where v.id = any (v_value_ids) and o.menu_item_id = v_entry.id;
    if v_count <> coalesce(array_length(v_value_ids, 1), 0) then
      raise exception 'Invalid choice for %.', v_entry.name using errcode = '22023';
    end if;

    -- Required options need exactly one choice; single-choice options allow at most one.
    for v_opt in
      select o.name, o.kind, o.required,
             (select count(*) from public.item_option_values v where v.option_id = o.id and v.id = any (v_value_ids)) as picked
      from public.item_options o where o.menu_item_id = v_entry.id
    loop
      if v_opt.required and v_opt.picked = 0 then
        raise exception 'Please choose % for %.', lower(v_opt.name), v_entry.name using errcode = '22023';
      end if;
      if v_opt.kind = 'single' and v_opt.picked > 1 then
        raise exception 'Choose only one % for %.', lower(v_opt.name), v_entry.name using errcode = '22023';
      end if;
    end loop;

    select v_entry.price + coalesce(sum(v.price_delta), 0) into v_unit
      from public.item_option_values v where v.id = any (v_value_ids);

    v_sort := v_sort + 1;
    insert into public.order_items (order_id, menu_item_id, name, image_url, base_price, unit_price, quantity,
                                    line_total, instructions, sort_order)
    values (v_order_id, v_entry.id, v_entry.name, v_entry.image_url, v_entry.price, v_unit, v_qty,
            v_unit * v_qty, nullif(trim(left(v_item ->> 'instructions', 500)), ''), v_sort)
    returning id into v_order_item_id;

    insert into public.order_item_customizations (order_item_id, option_value_id, option_name, value_label, price_delta, sort_order)
    select v_order_item_id, v.id, o.name, v.label, v.price_delta, o.sort_order * 100 + v.sort_order
      from public.item_option_values v join public.item_options o on o.id = v.option_id
      where v.id = any (v_value_ids);

    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  v_tax := round(v_subtotal * s.tax_rate, 2);
  update public.orders set subtotal = v_subtotal, tax = v_tax, total = v_subtotal + v_tax + v_fee
    where id = v_order_id
    returning * into v_order;

  insert into public.order_status_history (order_id, event, to_status, actor)
  values (v_order_id, 'Order placed · ' || case v_method when 'cash' then 'Cash' when 'zelle' then 'Zelle'
                                                          when 'cashapp' then 'Cash App' else 'Card' end,
          'received', auth.uid());
  perform public.queue_order_notification(v_order_id, 'order_placed');

  return jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number,
                            'tracking_token', v_order.tracking_token, 'duplicate', false);
end $$;

-- ---------------------------------------------------------------------------
-- Customer: read an order by its tracking token
-- ---------------------------------------------------------------------------
create function public.get_order_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'tracking_token', o.tracking_token,
    'customer_name', o.customer_name, 'fulfillment', o.fulfillment, 'pickup_date', o.pickup_date,
    'pickup_slot', o.pickup_slot, 'delivery_address', o.delivery_address,
    'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee, 'tax', o.tax, 'total', o.total,
    'payment_method', o.payment_method, 'payment_status', o.payment_status,
    'amount_received', o.amount_received, 'status', o.status, 'created_at', o.created_at,
    'menu_title', mn.title,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', oi.name, 'image_url', oi.image_url, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
        'line_total', oi.line_total, 'instructions', oi.instructions,
        'customizations', coalesce((select jsonb_agg(jsonb_build_object('option_name', c.option_name,
                              'value_label', c.value_label, 'price_delta', c.price_delta) order by c.sort_order)
                            from public.order_item_customizations c where c.order_item_id = oi.id), '[]'::jsonb)
      ) order by oi.sort_order) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb),
    'status_times', coalesce((
      select jsonb_object_agg(h.to_status::text, h.created_at)
      from (select distinct on (to_status) to_status, created_at from public.order_status_history
            where order_id = o.id and to_status is not null order by to_status, created_at desc) h), '{}'::jsonb),
    'notify', (select jsonb_build_object('push', np.push, 'email', np.email, 'sms', np.sms,
                                         'new_menus', np.new_menus, 'holiday_menus', np.holiday_menus)
               from public.notification_preferences np where np.customer_id = o.customer_id)
  )
  from public.orders o join public.menus mn on mn.id = o.menu_id
  where o.tracking_token = p_token;
$$;

-- Customer: update notification preferences from the tracking screen.
create function public.set_notification_prefs_by_token(p_token uuid, p_prefs jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
begin
  select customer_id into v_customer from public.orders where tracking_token = p_token;
  if v_customer is null then raise exception 'Order not found.' using errcode = 'P0002'; end if;
  insert into public.notification_preferences (customer_id) values (v_customer) on conflict do nothing;
  update public.notification_preferences set
    push = coalesce((p_prefs ->> 'push')::boolean, push),
    email = coalesce((p_prefs ->> 'email')::boolean, email),
    sms = coalesce((p_prefs ->> 'sms')::boolean, sms),
    new_menus = coalesce((p_prefs ->> 'new_menus')::boolean, new_menus),
    holiday_menus = coalesce((p_prefs ->> 'holiday_menus')::boolean, holiday_menus),
    updated_at = now()
  where customer_id = v_customer;
  -- Opting in to menu announcements is the customer's marketing consent.
  update public.customers
    set marketing_opt_in = (select new_menus or holiday_menus from public.notification_preferences where customer_id = v_customer)
    where id = v_customer;
end $$;

-- ---------------------------------------------------------------------------
-- Chef actions
-- ---------------------------------------------------------------------------
create function public.require_staff() returns void
language plpgsql stable as $$
begin
  if not public.is_staff() then
    raise exception 'Only the chef and staff can do this.' using errcode = '42501';
  end if;
end $$;

create function public.method_label(p public.payment_method) returns text
language sql immutable as $$
  select case p when 'cash' then 'Cash' when 'zelle' then 'Zelle' when 'cashapp' then 'Cash App' else 'Card' end;
$$;

-- Record money the chef has actually received. p_amount null = the full outstanding balance.
create function public.chef_record_payment(p_order_id uuid, p_amount numeric default null, p_reference text default null)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_amount numeric(10, 2);
begin
  perform public.require_staff();
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.' using errcode = 'P0002'; end if;
  v_amount := coalesce(p_amount, o.total - o.amount_received);
  if v_amount <= 0 then raise exception 'Nothing left to collect on this order.' using errcode = '22023'; end if;

  insert into public.payments (order_id, amount, method, reference, recorded_by)
  values (o.id, v_amount, o.payment_method, nullif(trim(p_reference), ''), auth.uid());

  update public.orders set
    amount_received = amount_received + v_amount,
    payment_status = case when amount_received + v_amount >= total then 'paid' else 'partially_paid' end::public.payment_status
  where id = o.id returning * into o;

  insert into public.order_status_history (order_id, event, actor)
  values (o.id, format('Marked %s · %s $%s', case when o.payment_status = 'paid' then 'Paid' else 'Partially Paid' end,
                       public.method_label(o.payment_method), to_char(v_amount, 'FM999990.00')), auth.uid());
  if o.payment_status = 'paid' then
    perform public.queue_order_notification(o.id, 'payment_received');
  end if;
  return o;
end $$;

-- Undo recorded payments (e.g. marked paid by mistake). Payments are voided, not deleted.
create function public.chef_mark_unpaid(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  perform public.require_staff();
  update public.payments set voided_at = now()
    where order_id = p_order_id and kind = 'payment' and voided_at is null;
  update public.orders set amount_received = 0, payment_status = 'unpaid'
    where id = p_order_id returning * into o;
  if not found then raise exception 'Order not found.' using errcode = 'P0002'; end if;
  insert into public.order_status_history (order_id, event, actor) values (o.id, 'Marked Unpaid', auth.uid());
  return o;
end $$;

-- Move an order along Received → Confirmed → Preparing → Ready → Completed, or cancel it.
create function public.chef_set_order_status(p_order_id uuid, p_status public.order_status) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_from public.order_status;
  v_allowed boolean;
  v_event text;
begin
  perform public.require_staff();
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.' using errcode = 'P0002'; end if;
  v_from := o.status;
  v_allowed := case
    when p_status = 'cancelled' then v_from not in ('completed', 'cancelled')
    else (v_from, p_status) in (('received', 'confirmed'), ('confirmed', 'preparing'),
                                ('preparing', 'ready'), ('ready', 'completed'))
  end;
  if not v_allowed then
    raise exception 'Cannot change an order from % to %.', v_from, p_status using errcode = '22023';
  end if;

  if p_status = 'cancelled' then
    -- Put the portions back on the menu.
    update public.menu_entries me set sold_count = greatest(0, me.sold_count - x.qty)
      from (select menu_item_id, sum(quantity) as qty from public.order_items
            where order_id = o.id and menu_item_id is not null group by 1) x
      where me.menu_id = o.menu_id and me.menu_item_id = x.menu_item_id;
  end if;

  update public.orders set status = p_status where id = o.id returning * into o;
  v_event := case p_status
    when 'confirmed' then 'Order confirmed' when 'preparing' then 'Started preparing'
    when 'ready' then 'Marked Ready' when 'completed' then 'Order completed'
    else 'Order cancelled' end;
  insert into public.order_status_history (order_id, event, from_status, to_status, actor)
  values (o.id, v_event || ' · customer notified', v_from, p_status, auth.uid());
  perform public.queue_order_notification(o.id, p_status::text);
  return o;
end $$;

-- Re-send the message for the order's current status.
create function public.chef_notify_customer(p_order_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  n int;
  v_label text;
begin
  perform public.require_staff();
  select * into o from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found.' using errcode = 'P0002'; end if;
  n := public.queue_order_notification(o.id, case when o.status = 'received' then 'order_placed' else o.status::text end);
  v_label := case o.status when 'received' then 'new' when 'ready' then 'ready for pickup' else o.status::text end;
  insert into public.order_status_history (order_id, event, actor)
  values (o.id, 'Customer notified: ' || v_label, auth.uid());
  return n;
end $$;

-- Publish a menu; optionally queue an announcement to subscribed customers.
-- Returns the number of customers the announcement was queued for.
create function public.chef_publish_menu(p_menu_id uuid, p_notify boolean default true) returns int
language plpgsql security definer set search_path = public as $$
declare
  m public.menus;
  s public.business_settings;
  v_body text;
  n int := 0;
begin
  perform public.require_staff();
  select * into s from public.business_settings where id = 1;
  update public.menus set status = 'published', published_at = coalesce(published_at, now())
    where id = p_menu_id returning * into m;
  if not found then raise exception 'Menu not found.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.menu_entries where menu_id = m.id) then
    raise exception 'Add at least one dish before publishing.' using errcode = '22023';
  end if;
  if p_notify then
    v_body := format('%s: %s is up! Pickup %s. Order by %s.', s.business_name, m.title,
                     to_char(m.pickup_date, 'FMDay, Mon FMDD'),
                     to_char(m.order_deadline at time zone s.timezone, 'FMDay FMHH12:MI AM'));
    with subs as (
      select c.id, c.email, np.push, np.email as want_email, np.sms
      from public.customers c join public.notification_preferences np on np.customer_id = c.id
      where c.marketing_opt_in
        and case when m.type = 'weekly' then np.new_menus else np.holiday_menus end
    ), ins as (
      insert into public.notification_logs (customer_id, channel, template, body)
      select id, ch.channel, 'menu_published', v_body
      from subs cross join lateral (values ('push'::public.notification_channel, push),
                                           ('email'::public.notification_channel, want_email and email is not null),
                                           ('sms'::public.notification_channel, sms)) ch (channel, wanted)
      where ch.wanted
      returning customer_id
    )
    select count(distinct customer_id) into n from ins;
  end if;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Customer directory (chef only; security_invoker keeps the caller's RLS)
-- ---------------------------------------------------------------------------
create view public.customer_directory with (security_invoker = true) as
select
  c.id, c.name, c.phone, c.email, c.notes, c.marketing_opt_in, c.created_at,
  count(o.id) filter (where o.status <> 'cancelled') as order_count,
  coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as total_spent,
  coalesce(sum(o.total - o.amount_received) filter (where o.status <> 'cancelled' and o.payment_status <> 'paid'), 0)
    as unpaid_balance,
  max(o.created_at) as last_order_at,
  (select oi.name from public.order_items oi join public.orders o2 on o2.id = oi.order_id
    where o2.customer_id = c.id and o2.status <> 'cancelled'
    group by oi.name order by sum(oi.quantity) desc, oi.name limit 1) as favorite_dish
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.business_settings enable row level security;
alter table public.customers enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_options enable row level security;
alter table public.item_option_values enable row level security;
alter table public.menus enable row level security;
alter table public.menu_entries enable row level security;
alter table public.special_events enable row level security;
alter table public.catering_requests enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_customizations enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notification_logs enable row level security;

-- Staff can read and write everything operational.
create policy staff_all on public.business_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.customers for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.notification_preferences for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.push_tokens for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.menu_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.item_options for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.item_option_values for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.menus for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.menu_entries for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.special_events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_all on public.catering_requests for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_read on public.orders for select to authenticated using (public.is_staff());
create policy staff_read on public.order_items for select to authenticated using (public.is_staff());
create policy staff_read on public.order_item_customizations for select to authenticated using (public.is_staff());
create policy staff_read on public.payments for select to authenticated using (public.is_staff());
create policy staff_read on public.order_status_history for select to authenticated using (public.is_staff());
create policy staff_read on public.notification_logs for select to authenticated using (public.is_staff());
create policy staff_read on public.users for select to authenticated using (public.is_staff() or id = auth.uid());

-- Public (anonymous and signed-in customers): what the ordering site needs.
create policy public_read on public.business_settings for select to anon, authenticated using (true);
create policy public_read on public.menus for select to anon, authenticated using (status = 'published');
create policy public_read on public.menu_entries for select to anon, authenticated
  using (exists (select 1 from public.menus m where m.id = menu_id and m.status = 'published'));
create policy public_read on public.menu_items for select to anon, authenticated
  using (not is_hidden and archived_at is null);
create policy public_read on public.item_options for select to anon, authenticated using (true);
create policy public_read on public.item_option_values for select to anon, authenticated using (true);
create policy public_read on public.special_events for select to anon, authenticated using (is_published);
create policy public_insert on public.catering_requests for insert to anon, authenticated
  with check (status = 'new' and quote_amount is null and quoted_at is null);

-- Signed-in customers can read their own orders.
create policy own_read on public.customers for select to authenticated using (user_id = auth.uid());
create policy own_read on public.orders for select to authenticated
  using (customer_id in (select id from public.customers where user_id = auth.uid()));
create policy own_read on public.order_items for select to authenticated
  using (order_id in (select o.id from public.orders o join public.customers c on c.id = o.customer_id where c.user_id = auth.uid()));

-- Order tables are written only through the functions above.
revoke insert, update, delete on public.orders, public.order_items, public.order_item_customizations,
  public.payments, public.order_status_history, public.notification_logs from anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.place_order(jsonb), public.get_order_by_token(uuid),
  public.set_notification_prefs_by_token(uuid, jsonb), public.is_staff() to anon, authenticated;
grant execute on function public.chef_record_payment(uuid, numeric, text), public.chef_mark_unpaid(uuid),
  public.chef_set_order_status(uuid, public.order_status), public.chef_notify_customer(uuid),
  public.chef_publish_menu(uuid, boolean) to authenticated;
-- Helpers called from inside RLS policies, defaults and other functions.
grant execute on function public.normalize_phone(text), public.require_staff(), public.method_label(public.payment_method),
  public.order_message(public.orders, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Supabase-only setup (skipped when these schemas don't exist, e.g. plain Postgres in tests)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('food-photos', 'food-photos', true)
    on conflict (id) do nothing;
    execute $p$create policy "food photos are public" on storage.objects for select using (bucket_id = 'food-photos')$p$;
    execute $p$create policy "staff upload food photos" on storage.objects for insert to authenticated
               with check (bucket_id = 'food-photos' and public.is_staff())$p$;
    execute $p$create policy "staff update food photos" on storage.objects for update to authenticated
               using (bucket_id = 'food-photos' and public.is_staff())$p$;
    execute $p$create policy "staff delete food photos" on storage.objects for delete to authenticated
               using (bucket_id = 'food-photos' and public.is_staff())$p$;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.menu_entries;
  end if;
end $$;

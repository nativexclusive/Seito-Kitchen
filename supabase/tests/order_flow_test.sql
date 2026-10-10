-- Scenario tests for ordering, permissions and chef actions.
-- Run with: npm run db:test   (needs a local Postgres; see README)
-- Expects the shim, migrations and seed to be loaded. Everything runs in a transaction
-- that is rolled back, so the seed data is left untouched.
\set ON_ERROR_STOP 1
begin;

create function pg_temp.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error matching "%" but statement succeeded: %', p_like, p_sql;
exception when others then
  if sqlerrm not ilike p_like then
    raise exception 'expected error matching "%", got "%"', p_like, sqlerrm;
  end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

create function pg_temp.check(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok - %', p_what;
end $$;
grant execute on function pg_temp.check(boolean, text) to anon, authenticated;

-- A chef and a signed-in non-staff customer.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c1', 'chef@example.com'),
  ('00000000-0000-4000-8000-0000000000a1', 'someone@example.com');
insert into public.users (id, role, display_name) values ('00000000-0000-4000-8000-0000000000c1', 'chef', 'Mama');

-- ===================================================================== anon
set local role anon;
select pg_temp.check((select count(*) from public.menus) = 1, 'anon sees only the published menu');
select pg_temp.check((select count(*) from public.orders) = 0, 'anon cannot read orders');
select pg_temp.check((select count(*) from public.customers) = 0, 'anon cannot read customers');
select pg_temp.expect_error($$insert into public.orders (client_request_id, menu_id, customer_id, customer_name, customer_phone,
  pickup_date, subtotal, total, payment_method) values (gen_random_uuid(), '40000000-0000-4000-8000-000000000001',
  gen_random_uuid(), 'x', '1', current_date, 0, 0, 'cash')$$, '%permission denied%');
select pg_temp.expect_error($$select public.queue_order_notification(gen_random_uuid(), 'ready')$$, '%permission denied%');
select pg_temp.expect_error($$select public.chef_record_payment(gen_random_uuid())$$, '%permission denied%');
select pg_temp.expect_error($$update public.menu_entries set sold_out = true$$, '%permission denied%');

-- Price is computed on the server: Cassava Leaf 16 + Goat 4 + Large 4 + Extra Meat 5 = 29 × 2 = 58.
create temp table r as select public.place_order('{
  "client_request_id":"60000000-0000-4000-8000-000000000001","menu_id":"40000000-0000-4000-8000-000000000001",
  "customer":{"name":"Test Guest","phone":"(555) 555-0100","email":"Guest@Example.com"},"payment_method":"zelle",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000002","quantity":2,"unit_price":1,
            "option_value_ids":["30000000-0000-4000-8000-000000000003","30000000-0000-4000-8000-000000000006","30000000-0000-4000-8000-000000000008"]}]}'::jsonb) as res;
select pg_temp.check((select (public.get_order_by_token((res ->> 'tracking_token')::uuid) ->> 'total')::numeric = 58 from r),
  'server prices options and ignores client prices');
select pg_temp.check((select public.get_order_by_token((res ->> 'tracking_token')::uuid) ->> 'payment_status' = 'unpaid' from r),
  'Zelle orders start unpaid');
select pg_temp.check((select (public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000001"}'::jsonb) ->> 'duplicate')::boolean from r),
  'resubmitting the same request returns the existing order');
select pg_temp.check(public.get_order_by_token(gen_random_uuid()) is null, 'unknown tracking token returns nothing');

select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000002",
  "menu_id":"40000000-0000-4000-8000-000000000001","customer":{"name":"A","phone":"5555550101"},"payment_method":"zelle",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000002","quantity":1}]}'::jsonb)$$, '%choose protein%');
select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000003",
  "menu_id":"40000000-0000-4000-8000-000000000001","customer":{"name":"A","phone":"5555550101"},"payment_method":"zelle",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":1,"option_value_ids":["30000000-0000-4000-8000-000000000002"]}]}'::jsonb)$$,
  '%invalid choice%');
select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000004",
  "menu_id":"40000000-0000-4000-8000-000000000001","customer":{"name":"A","phone":"5555550101"},"payment_method":"zelle",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000005","quantity":1}]}'::jsonb)$$, '%sold out%');
-- Fufu has 12 portions, 2 sold: 6 + 5 across two lines is one too many.
select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000005",
  "menu_id":"40000000-0000-4000-8000-000000000001","customer":{"name":"A","phone":"5555550101"},"payment_method":"zelle",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000004","quantity":6},{"menu_item_id":"10000000-0000-4000-8000-000000000004","quantity":5}]}'::jsonb)$$,
  '%sold out%');
select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000006",
  "menu_id":"40000000-0000-4000-8000-000000000001","customer":{"name":"A","phone":"5555550101"},"payment_method":"card",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":1}]}'::jsonb)$$, '%payment method%');
select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000007",
  "menu_id":"40000000-0000-4000-8000-000000000002","customer":{"name":"A","phone":"5555550101"},"payment_method":"cash",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":1}]}'::jsonb)$$, '%not available%');

-- ===================================================== signed-in non-staff
reset role;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
select pg_temp.check((select count(*) from public.orders) = 0, 'non-staff user cannot read other people''s orders');
select pg_temp.expect_error($$select public.chef_record_payment((select id from public.orders limit 1))$$, '%only the chef%');
select pg_temp.expect_error($$select public.chef_set_order_status(gen_random_uuid(), 'ready')$$, '%only the chef%');

-- ===================================================================== chef
reset role;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
set local role authenticated;
select pg_temp.check((select count(*) from public.orders) = 7, 'chef reads all orders');
select pg_temp.check((select count(*) from public.menus) = 2, 'chef reads draft menus too');

create temp table o as select id from public.orders where client_request_id = '60000000-0000-4000-8000-000000000001';
select public.chef_record_payment((select id from o), 20, 'ZL-1');
select pg_temp.check((select payment_status = 'partially_paid' and amount_received = 20 from public.orders where id = (select id from o)),
  'partial payment recorded');
select public.chef_record_payment((select id from o));
select pg_temp.check((select payment_status = 'paid' and amount_received = 58 from public.orders where id = (select id from o)),
  'remaining balance recorded, order paid');
select pg_temp.expect_error($$select public.chef_record_payment((select id from o))$$, '%nothing left%');
select public.chef_mark_unpaid((select id from o));
select pg_temp.check((select payment_status = 'unpaid' and amount_received = 0 from public.orders where id = (select id from o)),
  'mark unpaid resets the balance');
select pg_temp.check((select count(*) = 2 from public.payments where order_id = (select id from o) and voided_at is not null),
  'payments are voided, not deleted');

select pg_temp.expect_error($$select public.chef_set_order_status((select id from o), 'ready')$$, '%cannot change%');
select public.chef_set_order_status((select id from o), 'confirmed');
select public.chef_set_order_status((select id from o), 'preparing');
select pg_temp.check((select sold_count from public.menu_entries where menu_item_id = '10000000-0000-4000-8000-000000000002') = 4,
  'inventory counts the new order');
select public.chef_set_order_status((select id from o), 'cancelled');
select pg_temp.check((select sold_count from public.menu_entries where menu_item_id = '10000000-0000-4000-8000-000000000002') = 2,
  'cancelling puts portions back');
select pg_temp.expect_error($$select public.chef_set_order_status((select id from o), 'cancelled')$$, '%cannot change%');
select pg_temp.check((select count(*) from public.order_status_history where order_id = (select id from o)) = 7,
  'every action is in the activity log');
select pg_temp.check((select count(*) from public.notification_logs where order_id = (select id from o) and channel = 'email') = 5,
  'email queued for placed, paid, confirmed, preparing, cancelled');

select pg_temp.check(public.chef_notify_customer((select id from o)) = 2, 'notify customer queues push + email');
select pg_temp.check(public.chef_publish_menu('40000000-0000-4000-8000-000000000001', true) = 5,
  'menu announcement queued for the 5 opted-in customers');
select pg_temp.check((select count(*) from public.customer_directory) = 7, 'customer directory lists everyone');
select pg_temp.check((select favorite_dish from public.customer_directory where phone = '2025550134') is not null,
  'directory computes a favorite dish');

-- Closing ordering early stops new orders.
update public.menus set accepting_orders = false where id = '40000000-0000-4000-8000-000000000001';
reset role;
set local role anon;
select pg_temp.expect_error($$select public.place_order('{"client_request_id":"60000000-0000-4000-8000-000000000008",
  "menu_id":"40000000-0000-4000-8000-000000000001","customer":{"name":"A","phone":"5555550101"},"payment_method":"cash",
  "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":1}]}'::jsonb)$$, '%closed%');

reset role;
rollback;
\echo ALL TESTS PASSED

-- Development seed: the dishes from the design handoff, a published weekly menu for the
-- coming Saturday, a draft holiday menu and a handful of sample orders.
-- Do not run this against production.

update public.business_settings set
  pickup_address = '[PICKUP ADDRESS]',
  zelle_contact = '[ZELLE CONTACT]',
  cashtag = '[CASHTAG]',
  contact_phone = null,
  delivery_enabled = true,
  delivery_fee = 0      -- [DELIVERY FEE]: set the real fee in business_settings
where id = 1;

-- Dishes -------------------------------------------------------------------
insert into public.menu_items (id, name, description, category, image_url, base_price, sort_order) values
  ('10000000-0000-4000-8000-000000000001', 'Jollof Rice & Chicken', 'Classic Liberian jollof with seasoned chicken.', 'Rice Dishes', 'asset:jollof', 15, 1),
  ('10000000-0000-4000-8000-000000000002', 'Cassava Leaf', 'Authentic Liberian cassava leaf slow-cooked with palm oil, spices and your choice of meat. Served with white rice.', 'Traditional Liberian Meals', 'asset:cassava', 16, 2),
  ('10000000-0000-4000-8000-000000000003', 'Pepper Soup', 'Spicy and flavorful. Choice of meat.', 'Soups & Stews', 'asset:pepper', 14, 3),
  ('10000000-0000-4000-8000-000000000004', 'Fufu & Soup', 'Traditional Liberian style with rich sauce.', 'Soups & Stews', 'asset:fufu', 15, 4),
  ('10000000-0000-4000-8000-000000000005', 'Palm Butter', 'Rich palm nut stew served with rice.', 'Traditional Liberian Meals', null, 16, 5),
  ('10000000-0000-4000-8000-000000000006', 'Fried Plantains', 'Sweet ripe plantains, fried golden.', 'Sides', null, 5, 6),
  ('10000000-0000-4000-8000-000000000007', 'Potato Greens', 'Potato leaves stewed with palm oil and smoked fish.', 'Traditional Liberian Meals', null, 16, 7),
  ('10000000-0000-4000-8000-000000000008', 'Dry Rice', 'Seasoned rice cooked with meat and vegetables.', 'Rice Dishes', null, 14, 8);

-- Cassava Leaf options (from the Item design) --------------------------------
insert into public.item_options (id, menu_item_id, name, kind, required, sort_order) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Protein', 'single', true, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Portion', 'single', true, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Add-ons', 'multi', false, 3);

insert into public.item_option_values (id, option_id, label, price_delta, is_default, sort_order) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Chicken', 0, true, 1),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Beef', 2, false, 2),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Goat', 4, false, 3),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Fish', 3, false, 4),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'Regular', 0, true, 1),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'Large', 4, false, 2),  -- +$4 is an assumption from the handoff
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'Extra Rice', 3, false, 1),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'Extra Meat', 5, false, 2),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'Extra Pepper', 0, false, 3);

-- This week's menu: coming Saturday, orders close Friday 8 PM local time --------
with d as (
  select current_date + case when extract(dow from current_date) = 6 then 7
                             else 6 - extract(dow from current_date)::int end as sat
)
insert into public.menus (id, type, title, pickup_date, order_deadline, status, published_at, share_slug)
select '40000000-0000-4000-8000-000000000001', 'weekly', 'Saturday Menu — ' || to_char(sat, 'Mon FMDD'), sat,
       ((sat - 1) + time '20:00') at time zone (select timezone from public.business_settings), 'published', now(), 'this-week'
from d;

insert into public.menu_entries (menu_id, menu_item_id, max_quantity, sold_out, sort_order) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 30, false, 1),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 20, false, 2),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 15, false, 3),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 12, false, 4),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 10, true, 5),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 40, false, 6);

-- Draft holiday menu + event ------------------------------------------------
insert into public.menus (id, type, title, description, cover_image_url, pickup_date, order_deadline, status) values
  ('40000000-0000-4000-8000-000000000002', 'holiday', 'Thanksgiving Specials', 'Family trays and plates with authentic Liberian flavors.',
   'asset:thanks', date '2026-11-26', timestamptz '2026-11-22 20:00 America/New_York', 'draft');
insert into public.special_events (menu_id, name, banner_image_url, description, event_date, order_deadline, max_capacity, is_published) values
  ('40000000-0000-4000-8000-000000000002', 'Thanksgiving Specials', 'asset:thanks', 'Family trays and plates with authentic Liberian flavors.',
   date '2026-11-26', timestamptz '2026-11-22 20:00 America/New_York', 40, true);

insert into public.catering_requests (customer_name, phone, event_date, event_type, guest_count, requested_dishes, budget) values
  ('Johnson family', '3015550111', 'Sat, Nov 7', 'Family Reunion', 60, 'Jollof rice, cassava leaf, fried plantains', '[CUSTOMER BUDGET]');

-- Sample orders (placed through the real ordering function) -------------------
select public.place_order(x::jsonb) from (values
  ('{"client_request_id":"50000000-0000-4000-8000-000000000001","menu_id":"40000000-0000-4000-8000-000000000001",
     "customer":{"name":"Moses W.","phone":"(202) 555-0148"},"payment_method":"cash","pickup_slot":"12:00 – 1:00 PM",
     "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000003","quantity":1},{"menu_item_id":"10000000-0000-4000-8000-000000000006","quantity":2}]}'),
  ('{"client_request_id":"50000000-0000-4000-8000-000000000002","menu_id":"40000000-0000-4000-8000-000000000001",
     "customer":{"name":"Angela B.","phone":"(571) 555-0167"},"payment_method":"zelle","pickup_slot":"1:00 – 2:00 PM",
     "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":2},{"menu_item_id":"10000000-0000-4000-8000-000000000004","quantity":2}]}'),
  ('{"client_request_id":"50000000-0000-4000-8000-000000000003","menu_id":"40000000-0000-4000-8000-000000000001",
     "customer":{"name":"David K.","phone":"(240) 555-0123"},"payment_method":"cashapp","pickup_slot":"12:00 – 1:00 PM",
     "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":2}]}'),
  ('{"client_request_id":"50000000-0000-4000-8000-000000000004","menu_id":"40000000-0000-4000-8000-000000000001",
     "customer":{"name":"Linda M.","phone":"(703) 555-0199","email":"linda@example.com"},"payment_method":"zelle","pickup_slot":"2:00 – 3:00 PM",
     "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000002","quantity":1,
               "option_value_ids":["30000000-0000-4000-8000-000000000001","30000000-0000-4000-8000-000000000005"]}]}'),
  ('{"client_request_id":"50000000-0000-4000-8000-000000000005","menu_id":"40000000-0000-4000-8000-000000000001",
     "customer":{"name":"James T.","phone":"(301) 555-0187"},"payment_method":"cash","pickup_slot":"1:00 – 2:00 PM",
     "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000003","quantity":2},{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":1},
              {"menu_item_id":"10000000-0000-4000-8000-000000000006","quantity":1}]}'),
  ('{"client_request_id":"50000000-0000-4000-8000-000000000006","menu_id":"40000000-0000-4000-8000-000000000001",
     "customer":{"name":"Sarah K.","phone":"(202) 555-0134","email":"sarah.k@example.com"},"payment_method":"zelle","pickup_slot":"12:00 – 1:00 PM",
     "items":[{"menu_item_id":"10000000-0000-4000-8000-000000000001","quantity":1,"instructions":"Extra pepper"},
              {"menu_item_id":"10000000-0000-4000-8000-000000000002","quantity":1,"instructions":"Less spice, extra sauce please.",
               "option_value_ids":["30000000-0000-4000-8000-000000000002","30000000-0000-4000-8000-000000000005"]}]}')
) v (x);

-- Move the sample orders along so every status shows up (seed runs as the DB owner).
update public.orders set status = 'completed', payment_status = 'paid', amount_received = total where client_request_id = '50000000-0000-4000-8000-000000000001';
update public.orders set status = 'confirmed', payment_status = 'partially_paid', amount_received = 20 where client_request_id = '50000000-0000-4000-8000-000000000002';
update public.orders set status = 'ready', payment_status = 'paid', amount_received = total where client_request_id = '50000000-0000-4000-8000-000000000004';
update public.orders set status = 'preparing' where client_request_id = '50000000-0000-4000-8000-000000000005';
insert into public.payments (order_id, amount, method, reference)
select id, amount_received, payment_method, 'seed' from public.orders where amount_received > 0;
insert into public.order_status_history (order_id, event, to_status)
select id, 'Status set by seed data', status from public.orders where status <> 'received';

update public.customers set marketing_opt_in = true where phone <> '2405550123';
insert into public.notification_preferences (customer_id, new_menus, holiday_menus)
select id, true, true from public.customers where marketing_opt_in
on conflict (customer_id) do update set new_menus = true, holiday_menus = true;
update public.customers set notes = 'Picks up for her church group' where phone = '5715550167';

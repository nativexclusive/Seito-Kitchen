# Mama's Kitchen

Ordering app for a home-based Liberian chef: the menu goes out on Thursday, customers preorder, and everything is cooked and picked up on Saturday. There are two apps in one codebase:

- **Customer app**: browse the menu, customize dishes, check out without an account, track the order.
- **Chef app** (`/chef`): dashboard, create, publish and share menus, mark dishes sold out, manage orders and payments, customer directory, events and catering.

It runs on iOS, Android and the web. The web build is the responsive ordering site that customers reach from the shared menu link.

Stack: Expo SDK 57 (React Native + TypeScript, Expo Router) and Supabase (Postgres, Auth, Storage, Realtime).

The product spec and approved designs are in [`docs/handoff/`](docs/handoff/README.md).

## What works today

| Area | Status |
|---|---|
| Customer: welcome, weekly menu, dish customization with live price, cart (identical lines merge), checkout as guest, confirmation, order tracking, notification preferences | ✅ |
| Shareable menu link `/m/<slug>` | ✅ |
| Server-side pricing, atomic inventory (no overselling), duplicate-submit protection | ✅ tested |
| Chef: sign in, dashboard (orders, expected, collected, outstanding, paid/unpaid, prep totals), live order updates | ✅ |
| Chef: create/edit/publish menus, sold-out toggles that apply immediately, portion caps, close ordering early, share by SMS / WhatsApp / email / copy link | ✅ |
| Chef: orders list with filters and search; order detail with Mark Paid (full or partial, with reference), Mark Unpaid, status flow, cancel with confirmation, activity log | ✅ |
| Saturday prep report (portions per dish, choice breakdown, special instructions, outstanding payments) | ✅ |
| Customer directory (orders, total spent, favorite dish, unpaid balance, call/text/email) | ✅ |
| Special events and catering requests; chef saves a quote and texts it to the customer | ✅ basic |
| Customer phone sign-in (SMS code) | ✅ needs an SMS provider in Supabase Auth |
| **Notifications**: every customer message is written to `notification_logs` as `queued` | ⚠️ nothing sends them yet. See below. |
| Card / Apple Pay (Stripe) | ⛔ not built. Shown as "Coming soon". |
| Dish photo upload, editing protein/portion/add-on choices in the app, settings screen, CSV/PDF export, analytics | ⛔ not built yet |

Payment rule: Zelle, Cash App and cash orders stay **Payment Pending** until the chef taps **Mark as Paid**. Nothing marks an order paid automatically.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema. Use either:
   - the Supabase CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - the SQL editor: paste and run [`supabase/migrations/20261010000000_init.sql`](supabase/migrations/20261010000000_init.sql).
3. Optional, for a development project only: run [`supabase/seed.sql`](supabase/seed.sql) to load the sample dishes, this week's menu and sample orders.

### 2. Add the chef account

In Supabase, go to **Authentication → Users → Add user** and create the chef with an email and password. Then run this in the SQL editor:

```sql
insert into public.users (id, role, display_name)
select id, 'chef', 'Mama' from auth.users where email = 'chef@example.com';
```

Staff members are added the same way with `role = 'staff'`. Only accounts listed in `public.users` can open `/chef`, and the database enforces the same rule.

### 3. Business settings

Edit the single row in `business_settings` (Table editor):

| Column | Placeholder from handoff |
|---|---|
| `pickup_address` | `[PICKUP ADDRESS]` |
| `zelle_contact` | `[ZELLE CONTACT]` |
| `cashtag` | `[CASHTAG]` |
| `delivery_enabled`, `delivery_fee` | `[DELIVERY FEE]` |
| `public_site_url` | URL where the web app is hosted, used in shared menu links |
| `timezone` | Defaults to `America/New_York`. Deadlines are entered and shown in this zone. |
| `pickup_slots`, `payment_methods`, `tax_rate`, `contact_phone` | |

### 4. Run the app

```bash
cp .env.example .env.local     # then fill in your project URL and anon key
npm install
npx expo start                 # press w for web, or scan the QR code with Expo Go
```

The chef app is at `/chef`. On a phone, use **Sign In → Chef & staff sign in**.

### Deploying

- **Web ordering site**: run `npx expo export -p web` and host `dist/` on any static host (Netlify, Vercel, Cloudflare Pages). Configure the host to send every path to `index.html`, so links like `/m/<slug>` work. Set `public_site_url` to the site's URL.
- **iOS / Android**: `npx eas-cli@latest build` and `eas submit`. See [Expo's EAS docs](https://docs.expo.dev/build/introduction/).

## Development

```bash
npm run typecheck     # TypeScript
npm run db:test       # applies migration + seed to a scratch local Postgres and runs the scenario tests
```

`db:test` needs a local PostgreSQL (16+) and must run as a user that can create databases (for example `sudo -u postgres npm run db:test`). It uses [`supabase/tests/supabase_shim.sql`](supabase/tests/supabase_shim.sql) to stand in for Supabase's `auth` schema and roles. The tests cover:

- server pricing that ignores client prices
- required and invalid options
- sold-out and over-quantity orders
- duplicate submits
- RLS: anonymous users can't read or write orders, and non-staff can't use chef actions
- payments: partial, full and undo
- status transitions, and inventory going back on cancel
- notification queueing

### Layout

```
src/app/            screens (Expo Router). /chef/* is the chef app, everything else is the customer app
src/components/     shared UI (ui.tsx holds the design-system primitives), MenuEditor
src/api/            Supabase queries: public.ts (customer), chef.ts (chef)
src/lib/            pricing, status labels, formatting, timezone helpers, share text
src/state/          cart + saved orders (persisted on device), auth, business settings
src/theme.ts        design tokens from the handoff
supabase/           migration, seed, SQL tests
docs/handoff/       original spec and screen designs
```

### How ordering stays correct

- The client sends only dish ids, option ids and quantities to `place_order()`. The database looks up prices, validates the choices, locks the menu rows (`FOR UPDATE`, in a fixed order) and increments `sold_count` in the same transaction. Two people can't buy the last portion.
- Every checkout carries a `client_request_id`. Retrying a submit after a dropped connection returns the original order instead of creating a second one.
- Orders store the dish name, option labels and prices at the time of purchase. Editing the menu later never changes past orders.
- Guests track orders with a random `tracking_token`. The app saves it on the device under My Orders.
- Chef actions are `chef_*` database functions. Each one checks `is_staff()`, writes an `order_status_history` entry and queues the customer notification.

### Notifications (next step)

Rows in `notification_logs` with `status = 'queued'` are the outbox. To make them real, add a Supabase Edge Function on a schedule that:

1. sends each row through Expo Push, an email provider (for example Resend or Postmark) or SMS (for example Twilio),
2. sets `status` to `sent` or `failed`, increments `attempts` and records `last_error`,
3. retries failed rows a few times.

Expo push tokens also need to be registered into `push_tokens`.

## Assumptions to confirm

- The Large portion costs +$4 (from the handoff).
- Business timezone is `America/New_York` (the sample phone numbers are DC-area).
- Customers are matched by phone number. A returning customer's latest name and email are kept.
- Menu announcements go only to customers who turned on "New Thursday menus" or "Holiday & event menus" on their tracking screen. That switch counts as their marketing consent.
- Food photos are the low-res placeholders from the handoff. Palm Butter, Fried Plantains, Potato Greens and Dry Rice have no photo yet.

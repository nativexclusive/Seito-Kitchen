# Mama's Kitchen — Design Handoff for Claude Code

Start here. This folder contains everything needed to build the Mama's Kitchen app.

| File / folder | What it is |
|---|---|
| `BUILD-PROMPT.md` | The full product spec: features, data model, tech stack, security rules. **This is the source of truth for functionality.** |
| `design/` | The approved screen designs (HTML). **This is the source of truth for look and layout.** |
| `design/Prototype.html` | The clickable prototype: all screens in one phone frame with shared state. Read its `<script>` block for the intended app behavior. |
| `images/` | Food photos used in the designs, plus `reference-mockup.png` (the original concept image). |

## Suggested first message to Claude Code

> Read README.md, then BUILD-PROMPT.md, then every file in design/. Build the app with Expo (React Native + TypeScript) and Supabase as described in BUILD-PROMPT.md. Match the visual design in design/ exactly — colors, type, spacing, radii, and component styles. Use design/Prototype.html as the reference for navigation and screen-to-screen behavior. Start with: Thursday menu sharing, Saturday order management, and paid/unpaid tracking. Ask me before choosing anything not covered here.

## About the design files

The `.html` files are written in a design-tool component format: a `<x-dc>` template with `{{ holes }}`, `<sc-if>` / `<sc-for>` blocks, and a `class Component extends DCLogic` script whose `renderVals()` feeds the template. They won't run as normal web pages. The `support.js` runtime is not included. **Read them as a precise spec**: all styling is inline, and all behavior is in the script block. Translate them into React Native components. Don't try to run them.

## Design tokens

| Token | Value | Use |
|---|---|---|
| Primary (gold) | `#F2AD32` | Main buttons, active chips, current step. Text on it: `#242424` |
| Forest green | `#123D2B` | Home and dashboard headers, selected options, secondary buttons |
| Cream | `#FFF9F0` | App background |
| Card | `#FFFFFF` with border `#EFE6D7` or shadow `0 2px 10px rgba(36,36,36,.06)` | |
| Input border | `#E6DCCB`, 1.5px | |
| Text | `#242424`; muted `#6B6259`; secondary `#4A433C` | |
| Success | `#16A365`; "Mark as Paid" button `#0E7A4C` (for white-text contrast) | |

**Status badges** (background / text):
- Paid `#DDF3E8 / #0E6B42`
- Unpaid `#FDE3E2 / #8A2A25`
- Payment Pending / Partially Paid / Ready `#FDEBC8 / #6B4700`
- Preparing `#E3ECF7 / #1F4E86`
- New / Confirmed `#E2ECE7 / #123D2B`
- Completed / Draft `#EFE6D7 / #4A433C`

**Type:**
- **Fonts:** Plus Jakarta Sans for all UI (400–800). Great Vibes for the "Mama's Kitchen" wordmark only.
- **Sizes:** screen titles 22–28/800, section headings 16–17/800, body 14, captions 12–13.

**Shape:** radius 12 (inputs, options), 14–16 (buttons, cards), 18–24 (hero cards), pills 999. Minimum touch target 44px. Phone width 390.

## Screens (`design/`)

**Customer:**
1. `Main` — Welcome
2. `Menu` — This Saturday's Menu
3. `Item` — Food details: protein, portion and add-ons, with live price
4. `Cart` — Cart and checkout: contact, pickup/delivery, payment method
5. `Confirm` — Order confirmation
6. `Tracking` — Status timeline, ready notification, notification preferences

**Chef:**

7. `Admin` — Dashboard
8. `MenuEdit` — Create/publish menu, sold-out toggles, sharing
9. `Events` — Holiday menus and catering requests
10. `Orders` — Filterable list
11. `OrderDetail` — Payment and status actions, activity log
12. `Customers` — Directory

The prototype also adds three screens: Sign In (phone code + Continue as Guest), customer Special Events, and a catering request form.

## Behavior rules shown in the prototype

- Customers can order without an account.
- Item price = base + protein + portion + add-ons, times quantity. Cart lines merge when they have identical options.
- Zelle, Cash App and cash orders are **Payment Pending** until the chef taps "Mark as Paid". Never auto-mark them paid. Card/Apple Pay goes through Stripe.
- Order status flow: Received (shown to the chef as "New") → Confirmed → Preparing → Ready for Pickup → Completed. Cancelled is also possible and requires confirmation.
- Payment status is tracked separately from preparation status.
- Each chef action adds an entry to the order's activity log and notifies the customer.
- When the chef marks a dish sold out, it shows "Sold Out" on the customer menu immediately.

## Placeholders to fill in

`[PICKUP ADDRESS]`, `[ZELLE CONTACT]`, `[CASHTAG]`, `[DELIVERY FEE]`, `[CUSTOMER BUDGET]`

Also:
- The Large portion price (+$4) is an assumption.
- Dashboard numbers, customers and orders are sample data.
- Food photos are low-resolution crops from the concept image. Replace them with real photography. Palm Butter and Fried Plantains need photos.

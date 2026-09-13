# Excel Bakery

A fully responsive, interactive cake-ordering website for **Excel Bakery**. Built with plain HTML, CSS and vanilla JavaScript — no frameworks, no build tools — backed by a Supabase database for orders.

## Features

- **Sticky header** with a cart icon (live item count badge) and an "Order Now" call to action.
- **Hero section** introducing the bakery with quick stats and calls to action.
- **Dynamic cake catalog** rendered entirely from a JavaScript array of cake objects (`id`, `name`, `desc`, `price`, `tint`) — nothing is hard-coded in the HTML. Each flavor gets its own color tint applied to a shared SVG cake illustration.
- **Shopping cart drawer** (slide-in panel) with three steps:
  1. **Cart** — line items with quantity +/- controls, remove, and a running subtotal/delivery fee/total.
  2. **Checkout** — delivery details form (name, phone, address, notes).
  3. **Confirmation** — a generated order reference (e.g. `EB-482913`) and a link to track the order later.
- **Cart persistence** — the cart survives a page refresh via `localStorage`.
- **Order submission** — placing an order saves it to a Supabase `orders` table, so it's visible from any device, not just the one that placed it. This powers the admin and order-tracking pages below.
- **"How It Works"** three-step explainer section.
- Fully responsive layout (mobile-first) with breakpoints at 560px and 960px.

## Project Structure

```
EXCEL BOOKING PLATFORM/
├── index.html                       # Customer-facing site: catalog, cart drawer, checkout
├── admin.html                       # Orders dashboard: view, filter, fulfill/cancel/delete orders
├── check-booking.html               # Public page: customers track their order status
├── css/
│   └── style.css                    # All styling, custom properties, responsive rules
├── js/
│   └── script.js                    # Cake data, catalog rendering, cart & checkout logic
└── README.md
```

## Tech Stack

- HTML5 (semantic elements: `header`, `main`, `section`, `footer`, `aside`)
- CSS3 (custom properties/theming, Flexbox, Grid, media queries)
- Vanilla JavaScript (ES6+: `const`/`let`, arrow functions, template literals)

No package manager, build step, or JS libraries anywhere in this project — `admin.html` and `check-booking.html` talk to Supabase using plain `fetch()` calls rather than an SDK.

## Running Locally

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge) — double-click it or use "Open with Browser".

That's it — there is no server or install step required.

## Deployment

Any static host works since this is plain HTML/CSS/JS — just point it at the repo root (Vercel, Netlify, GitHub Pages, etc.). Leave build settings empty (static site, no framework).

## Admin: Viewing Orders

Orders are saved to a **Supabase** project (a free hosted Postgres database with built-in authentication) and viewed on `/admin.html`, linked from the site footer. It's safe to leave that link public — the page is useless without a real Supabase admin login, and the database itself rejects unauthenticated reads (see Row Level Security below), not just the page's JavaScript.

### One-time Supabase setup (I can't do this part for you — it's tied to your account)

This reuses the same Supabase project that was already set up for this site (`SUPABASE_URL`/`SUPABASE_ANON_KEY` are already wired into `js/script.js`, `admin.html` and `check-booking.html`) — you just need to add the `orders` table and, if you haven't already, an admin login.

1. Open your project's SQL Editor at [supabase.com](https://supabase.com) and run:
   ```sql
   create table orders (
     id bigint generated always as identity primary key,
     ref text not null unique,
     name text not null,
     phone text not null,
     address text not null,
     notes text,
     items jsonb not null,
     subtotal numeric not null,
     delivery_fee numeric not null,
     total numeric not null,
     status text not null default 'new',
     placed_at timestamptz not null default now()
   );

   alter table orders enable row level security;

   -- Anyone (including customers who aren't logged in) can submit an order...
   create policy "Anyone can insert orders"
     on orders for insert
     to anon
     with check (true);

   -- ...but only a logged-in admin can read, update, or delete them.
   create policy "Authenticated users can view orders"
     on orders for select
     to authenticated
     using (true);

   create policy "Authenticated users can update orders"
     on orders for update
     to authenticated
     using (true)
     with check (true);

   create policy "Authenticated users can delete orders"
     on orders for delete
     to authenticated
     using (true);
   ```
2. **Add a secure customer lookup** — still in the SQL Editor:
   ```sql
   create or replace function get_order_status(p_ref text, p_phone text)
   returns table (
     ref text,
     status text,
     name text,
     address text,
     items jsonb,
     subtotal numeric,
     delivery_fee numeric,
     total numeric,
     placed_at timestamptz
   )
   language sql
   security definer
   set search_path = public
   as $$
     select ref, status, name, address, items, subtotal, delivery_fee, total, placed_at
     from orders
     where ref = p_ref
       and regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
   $$;

   grant execute on function get_order_status(text, text) to anon;
   ```
3. **Create your admin login** (skip if you already have one from before): Authentication → Users → **Add user** → enter your email + a strong password. Do this instead of letting people self-register, so only people you add can log in.
4. Visit `/admin.html` and log in with that email/password. There is no separate "admin credential" beyond this login — Supabase Auth *is* the credential.

The anon/publishable key is meant to be public — it's not a secret, since Supabase enforces who can read/write via the Row Level Security policies from step 1, not by hiding the key.

**Note on the newer key format:** Supabase's docs recommend sending the publishable/secret key only on the `apikey` header, not also as `Authorization: Bearer <key>` — some setups will try to parse it as a JWT and reject it. Separately, if you ever test inserts directly with `curl`, use `Prefer: return=minimal` (which the app's own code already does) rather than `return=representation` — asking Postgres to hand back the inserted row applies the table's SELECT policy too, so it fails for a role (like `anon`) that can insert but isn't allowed to read the table back.

### How it fits together

- **`index.html`** posts every placed order straight to the `orders` table (see `submitOrderToSupabase()` in `js/script.js`). If the request fails (e.g. offline, or the table above hasn't been created yet), checkout shows an inline error instead of a false confirmation.
- **`/admin.html`** shows a status badge per row, filter chips (All / New / Fulfilled / Cancelled), and Mark Fulfilled / Cancel / Delete actions — all backed by real `PATCH`/`DELETE` requests against Supabase.
- **`/check-booking.html`** ("Track My Order") lets a customer look up their own order later using their **order reference + phone number**, and print an invoice. The lookup runs through the `get_order_status` function rather than a direct table read, so it only ever returns a row when both match — nobody can browse anyone else's orders this way.

## Notes

- Colors, spacing and fonts are defined as CSS custom properties in `:root` in `css/style.css`, so the entire theme can be re-skinned from one place.
- The cake catalog (`CAKES` array in `js/script.js`) is the single source of truth for flavors, prices and descriptions — add or edit cakes there and the grid, cart, and invoices all update automatically.

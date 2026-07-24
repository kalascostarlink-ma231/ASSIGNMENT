# Excel Booking Center

A fully responsive, interactive service booking website for **Excel Booking Center**, a beauty, grooming and wellness business based in Monrovia, Liberia. Built with plain HTML, CSS and vanilla JavaScript — no frameworks, no build tools, no backend.

## Live Site

[https://excelspa.vercel.app](https://excelspa.vercel.app)

## Features

- **Sticky header & responsive nav** with a hamburger menu on screens under 768px, and smooth scrolling to every section.
- **Dynamic services grid** rendered entirely from a JavaScript array of service objects (`id`, `name`, `description`, `duration`, `price`, `category`) — nothing is hard-coded in the HTML.
- **Category filtering** (All / Beauty / Wellness / Grooming) that shows and hides cards instantly, no page reload.
- **Booking form** collecting name, phone, email, one or more services, date and a single start time, with an optional notes field.
- **Multi-service booking** — a customer can check several services in one visit (e.g. a facial and a manicure). They're automatically scheduled back-to-back in the order picked: the customer only chooses a start time for the first service, and the platform computes when each following service starts and ends from the running total of durations.
- **Real-time validation** on blur and on submit: inline error messages, red borders for invalid fields, green borders for valid fields, and instant clearing of errors as the user corrects them.
  - Full name: letters only, minimum 3 characters.
  - Phone: accepts Liberian formats such as `0886692124` or `+231886692124`.
  - Email: standard email format check.
  - Date: rejects any date before today.
  - Services: at least one must be checked.
  - Start time: 9:00 AM – 5:00 PM in 30-minute increments, rendered as buttons.
- **Conflict prevention** — a start time is disabled if the full multi-service duration would either overlap another booking already on the books for that date, or run past closing time (5:00 PM). Unchecking/checking services live-updates which times are still valid.
- **Live booking summary panel** that updates instantly as the form is filled in, showing the computed schedule (time range + price per service), date, total duration and running total.
- **Confirmation screen** replacing the form on successful submission, complete with a generated reference number (e.g. `EBC-2026-4821`), the full per-service schedule, and a "Make Another Booking" button that resets everything.
- **My Bookings** section listing every booking made in the current session — including all its services and its overall time span — each with a "Cancel" button that removes it and updates the list live. Shows an empty-state message when there are no bookings.
- **About & Contact** sections with business hours, address, and a separately validated contact form.
- **Toast notifications** for successful bookings, cancellations, and form errors.
- **Scroll-triggered fade-in animations** powered by the Intersection Observer API.
- Fully responsive layout (mobile-first) with breakpoints at 480px, 768px and 1024px; service cards reflow from 1 → 2 → 3 columns; no horizontal scrolling at any width; all tap targets are at least 44×44px.

## Project Structure

```
EXCEL BOOKING PLATFORM/
├── index.html                       # Customer-facing site: semantic markup for all sections
├── admin.html                       # Password-protected admin page: view bookings + confirm them
├── check-booking.html               # Public page: customers look up their booking + invoice
├── css/
│   └── style.css                    # All styling, custom properties, responsive rules
├── js/
│   └── script.js                    # Services data, rendering, validation, booking logic
└── README.md
```

## Tech Stack

- HTML5 (semantic elements: `header`, `nav`, `main`, `section`, `footer`)
- CSS3 (custom properties/theming, Flexbox, Grid, media queries)
- Vanilla JavaScript (ES6+: `const`/`let`, arrow functions, template literals, Intersection Observer)

No package manager, build step, or JS libraries anywhere in this project — including `admin.html`, which talks to Supabase using plain `fetch()` calls rather than an SDK. The one thing that needs actual deployment (not `file://`) to work is saving/reading bookings from Supabase (see **Admin: Viewing Bookings** below); everything else runs identically locally and deployed.

## Running Locally

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge) — double-click it or use "Open with Browser".

That's it — there is no server or install step required.

## Deployment

**Vercel (this project's host)**
1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → pick this repo.
2. Leave build settings empty (static site, no framework) and deploy.
3. Vercel redeploys automatically on every push to `main`.

Any other static host works too (GitHub Pages, Netlify, etc.) since this is plain HTML/CSS/JS — just point it at the repo root.

After deploying, verify the site on a real mobile device and update the **Live Site** link above.

## Admin: Viewing Bookings

Bookings are saved to a **Supabase** project (a free hosted Postgres database with built-in authentication) and viewed on `/admin.html`, linked from the site footer. It's safe to leave that link public — the page is useless without a real Supabase admin login, and the database itself rejects unauthenticated reads (see Row Level Security below), not just the page's JavaScript.

### One-time Supabase setup (I can't do this part for you — it's tied to your account)

1. **Create a project** at [supabase.com](https://supabase.com) (free tier).
2. **Create the `bookings` table** — open the SQL Editor and run:
   ```sql
   create table bookings (
     id bigint generated always as identity primary key,
     reference text not null,
     full_name text not null,
     phone text not null,
     email text not null,
     booking_date date not null,
     start_time text not null,
     services text not null,
     total_price numeric not null,
     notes text,
     created_at timestamptz not null default now()
   );

   alter table bookings enable row level security;

   -- Anyone (including customers who aren't logged in) can submit a booking...
   create policy "Anyone can insert bookings"
     on bookings for insert
     to anon
     with check (true);

   -- ...but only a logged-in admin can read the list back.
   create policy "Authenticated users can view bookings"
     on bookings for select
     to authenticated
     using (true);
   ```
3. **Create your admin login**: Authentication → Users → **Add user** → enter your email + a password (do this instead of letting people self-register, so only people you add can log in). — **already done**, using `contact@excelspa.com`. Please change that password to something stronger than `12345678` when you get a chance; it guards real customer data.
4. ~~Get your API keys and paste them into `js/script.js` / `admin.html`~~ — **already done.** `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable key) are wired in and verified working end-to-end against the live project.
5. **Add booking status + a secure customer lookup** — open the SQL Editor and run:
   ```sql
   alter table bookings add column status text not null default 'pending';

   create policy "Authenticated users can update bookings"
     on bookings for update
     to authenticated
     using (true)
     with check (true);

   create or replace function get_booking_status(p_reference text, p_phone text)
   returns table (
     reference text,
     status text,
     full_name text,
     booking_date date,
     start_time text,
     services text,
     total_price numeric,
     notes text
   )
   language sql
   security definer
   set search_path = public
   as $$
     select reference, status, full_name, booking_date, start_time, services, total_price, notes
     from bookings
     where reference = p_reference and phone = p_phone;
   $$;

   grant execute on function get_booking_status(text, text) to anon;
   ```
6. Visit `/admin.html` and log in with the email/password from step 3.

The anon/publishable key is meant to be public — it's not a secret, since Supabase enforces who can read/write via the Row Level Security policies from step 2, not by hiding the key.

**Note on the newer key format:** Supabase's docs recommend sending the publishable/secret key only on the `apikey` header, not also as `Authorization: Bearer <key>` — some setups will try to parse it as a JWT and reject it. Separately, if you ever test inserts directly with `curl`, use `Prefer: return=minimal` (which the app's own code already does) rather than `return=representation` — asking Postgres to hand back the inserted row applies the table's SELECT policy too, so it fails for a role (like `anon`) that can insert but isn't allowed to read the table back.

### Booking confirmation workflow

Every booking is saved with `status = 'pending'`. The customer still gets instant, on-page confirmation the moment they submit (that part hasn't changed) — `pending` vs `confirmed` is purely an internal tracking state for you:

- **`/admin.html`** now shows a status badge per row, filter tabs (All / Pending / Confirmed), and a **Confirm** button on pending rows — click it once you've verified you can actually staff that slot.
- **`/check-booking.html`** (linked from the site footer and from the confirmation screen) lets a customer look up their own booking later using their **reference number + phone number** together. It shows current status and a printable invoice (a "Print Invoice" button that uses the browser's own print dialog — no PDF library needed). The lookup runs through a Postgres function (`get_booking_status`) rather than a direct table read, so it only ever returns a row when both the reference and phone match — nobody can browse anyone else's bookings this way.

## Notes

- Each customer's own "My Bookings" list is stored in that browser's memory only and resets on reload — it's a personal session view. The admin list of record is the Supabase `bookings` table, described above.
- The double-booking check only looks at bookings made in the *same browser session* for live UI feedback (disabling taken time slots as you type) — it doesn't yet check Supabase for conflicts from other customers' devices. If double-bookings across devices become a real problem, the fix is to query Supabase for that date's existing bookings before rendering time slots.
- Colors, spacing and fonts are defined as CSS custom properties in `:root` in `css/style.css`, so the entire theme can be re-skinned from one place.

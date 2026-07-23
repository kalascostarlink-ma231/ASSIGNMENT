# Excel Booking Center

A fully responsive, interactive service booking website for **Excel Booking Center**, a beauty, grooming and wellness business based in Monrovia, Liberia. Built with plain HTML, CSS and vanilla JavaScript — no frameworks, no build tools, no backend.

## Live Site

[https://excelbooking.netlify.app](https://excelbooking.netlify.app)

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
├── admin.html                       # Password-protected admin page for viewing bookings
├── css/
│   └── style.css                    # All styling, custom properties, responsive rules
├── js/
│   └── script.js                    # Services data, rendering, validation, booking logic
├── netlify/
│   └── functions/
│       └── get-bookings.js          # Serverless function: returns bookings to logged-in admins only
├── netlify.toml                     # Tells Netlify where the functions folder is
└── README.md
```

## Tech Stack

- HTML5 (semantic elements: `header`, `nav`, `main`, `section`, `footer`)
- CSS3 (custom properties/theming, Flexbox, Grid, media queries)
- Vanilla JavaScript (ES6+: `const`/`let`, arrow functions, template literals, Intersection Observer)

The customer-facing site (`index.html`) has no external dependencies and needs no package manager or build step. `admin.html` is the one exception: it loads the Netlify Identity widget script and calls a Netlify serverless function, so it only works once deployed on Netlify (see **Admin: Viewing Bookings** below).

## Running Locally

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge) — double-click it or use "Open with Browser".

That's it — there is no server or install step required.

## Deployment

Any static host works since this is plain HTML/CSS/JS:

**GitHub Pages**
1. Push this folder to a GitHub repository.
2. Repository Settings → Pages → set source to the `main` branch (root).
3. Your site will be published at `https://<username>.github.io/<repo-name>/`.

**Netlify**
1. Drag and drop the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or connect the GitHub repo.
2. Netlify deploys automatically and gives you a live URL.

**Vercel**
1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Leave build settings empty (static site) and deploy.

After deploying, verify the site on a real mobile device and update the **Live Site** link above.

## Admin: Viewing Bookings

Bookings can be viewed two ways:

### 1. Netlify's own dashboard (already working, no setup)
Every confirmed booking is submitted to **Netlify Forms** in the background:
1. Log in to [app.netlify.com](https://app.netlify.com) and open the `excelbooking` site.
2. Go to **Forms** in the sidebar → click the **booking** form to see every submission, newest first.
3. **Forms → Form notifications → Add notification → Email notification** to get emailed the moment someone books.
4. Submissions can be exported to CSV from the same page.

This only works on the deployed Netlify site — there's no submission endpoint when opening `index.html` directly, so the site quietly skips that step during local testing (customers still get the on-page confirmation either way). Free accounts include 100 submissions/month.

### 2. A dedicated admin page on your own site (`/admin.html`)
An "Admin Login" link in the site footer takes anyone straight to this page — it's safe to leave public since it's useless without a Netlify Identity account you've invited (see step 2 below). For staff who shouldn't need a full Netlify account, `admin.html` is a password-protected page (via **Netlify Identity**) that lists bookings in a simple table. It calls a small serverless function (`netlify/functions/get-bookings.js`) that only returns data to a verified, logged-in user — the check happens on Netlify's servers, not in the page's JavaScript, so it's real authentication rather than a client-side password.

**One-time setup required in the Netlify dashboard (I can't do this part for you — it's tied to your account):**
1. **Site settings → Identity → Enable Identity.**
2. **Identity → Invite users** and invite yourself (and any staff) by email — registration is invite-only by default, which is what you want.
3. **User settings (top-right avatar) → Applications → Personal access tokens → New access token.** Copy the generated token.
4. **Site settings → Environment variables → Add a variable:**
   - `NETLIFY_API_TOKEN` = the token from step 3
   - `NETLIFY_SITE_ID` = this site's Site ID, found on **Site settings → General → Site details**
5. Redeploy the site once those variables are saved (Netlify only picks up new env vars on a fresh deploy).
6. Visit `https://excelbooking.netlify.app/admin.html`, click **Log In**, and sign in with the email you invited in step 2.

Without steps 1–5 done, `admin.html` will load but show a login/loading error — that's expected until the account owner completes the one-time Netlify configuration above.

## Notes

- Each customer's own "My Bookings" list is stored in that browser's memory only and resets on reload — it is a personal session view, not the admin list. The admin list of record is Netlify Forms, described above.
- Colors, spacing and fonts are defined as CSS custom properties in `:root` in `css/style.css`, so the entire theme can be re-skinned from one place.

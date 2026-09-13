# Excel Bakery

A fully responsive, interactive cake-ordering website for **Excel Bakery**. Built with plain HTML, CSS and vanilla JavaScript — no frameworks, no build tools, no backend.

## Features

- **Sticky header** with a cart icon (live item count badge) and an "Order Now" call to action.
- **Hero section** introducing the bakery with quick stats and calls to action.
- **Dynamic cake catalog** rendered entirely from a JavaScript array of cake objects (`id`, `name`, `desc`, `price`, `tint`) — nothing is hard-coded in the HTML. Each flavor gets its own color tint applied to a shared SVG cake illustration.
- **Shopping cart drawer** (slide-in panel) with three steps:
  1. **Cart** — line items with quantity +/- controls, remove, and a running subtotal/delivery fee/total.
  2. **Checkout** — delivery details form (name, phone, address, notes).
  3. **Confirmation** — a generated order reference (e.g. `EB-482913`) and a link to track the order later.
- **Cart persistence** — the cart survives a page refresh via `localStorage`.
- **Order history** — every placed order is saved to `localStorage` (`excelBakeryOrders`), which powers the admin and order-tracking pages below.
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

No package manager, build step, or JS libraries anywhere in this project.

## Running Locally

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge) — double-click it or use "Open with Browser".

That's it — there is no server or install step required.

## Deployment

Any static host works since this is plain HTML/CSS/JS — just point it at the repo root (Vercel, Netlify, GitHub Pages, etc.). Leave build settings empty (static site, no framework).

## Orders: Current State (No Backend)

There is currently no backend or database wired up. Every order placed on `index.html` is written to that browser's `localStorage` under the key `excelBakeryOrders`. This means:

- **`admin.html`** (linked from `index.html`'s footer as "Admin") reads that same `localStorage` key and shows a dashboard with summary stats, status filters (New / Fulfilled / Cancelled), and actions to mark an order fulfilled, cancel it, or delete it.
- **`check-booking.html`** ("Track My Order", linked from the footer and from the order-confirmation screen) lets a customer look up their own order later using their **order reference + phone number**, and print an invoice.
- Because everything lives in `localStorage`, **orders are only visible on the same device/browser that placed them** — an order placed on a customer's phone won't show up in `admin.html` opened on your laptop. This is a real limitation, not a bug.

### Wiring up a real backend

To make orders visible across devices (e.g. a customer orders from their phone, you see it on your laptop), replace the `localStorage` calls with a real API:

1. Pick a backend (Supabase, Firebase, or a custom API) with a table/collection for orders (`ref`, `name`, `phone`, `address`, `notes`, `items`, `subtotal`, `deliveryFee`, `total`, `status`, `placedAt`).
2. In `js/script.js`, replace the `TODO` inside the checkout form's `submit` handler with a `fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) })` call (or your backend's SDK).
3. In `admin.html`, replace `loadOrders()`/`saveOrders()` (currently reading/writing `localStorage`) with API calls to list and update orders.
4. In `check-booking.html`, replace `findOrder()` with a server-side lookup endpoint that matches on reference + phone (so customers can't browse each other's orders).
5. Add real authentication to `admin.html` if the orders endpoint contains customer PII and shouldn't be publicly readable.

## Notes

- Colors, spacing and fonts are defined as CSS custom properties in `:root` in `css/style.css`, so the entire theme can be re-skinned from one place.
- The cake catalog (`CAKES` array in `js/script.js`) is the single source of truth for flavors, prices and descriptions — add or edit cakes there and the grid, cart, and invoices all update automatically.

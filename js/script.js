// ============================================
// Excel Bakery — cart & checkout logic
// The cart itself persists in localStorage so it survives a refresh.
// Orders are submitted to Supabase (see README) so they're visible
// from any device on /admin.html, not just the browser that placed them.
// ============================================

// The anon/publishable key is meant to be public — Supabase enforces access with
// Row Level Security policies on the `orders` table (see README), not by hiding this key.
const SUPABASE_URL = 'https://btbykqususlhajdahrpg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pgAOYkhhIOALErwSJg1Hzw_p_-s2gHl';

// `photo` points at a real product photo. If the file isn't there yet (or fails to load),
// the catalog and cart both fall back to the tinted SVG illustration automatically — see
// cakeThumbMarkup() below. Drop real photos into images/cakes/ using these exact filenames.
// rating/reviews/popularity/bestSeller/trending/express are merchandising data —
// there's no review system yet, so these are seeded here until a real one exists.
const CAKES = [
  { id: 'vanilla', name: 'Classic Vanilla', desc: 'Vanilla sponge, silky buttercream', price: 25, originalPrice: 29, tint: 'vanilla', photo: 'images/cakes/vanilla.jpg', rating: 4.6, reviews: 128, popularity: 90, bestSeller: true, trending: false, express: true },
  { id: 'chocolate', name: 'Chocolate Fudge', desc: 'Rich cocoa layers, ganache drip', price: 30, originalPrice: 36, tint: 'chocolate', photo: 'images/cakes/chocolate.jpg', rating: 4.8, reviews: 214, popularity: 98, bestSeller: true, trending: true, express: true },
  { id: 'redvelvet', name: 'Red Velvet', desc: 'Cream cheese frosting', price: 28, originalPrice: 28, tint: 'redvelvet', photo: 'images/cakes/redvelvet.jpg', rating: 4.7, reviews: 176, popularity: 85, bestSeller: true, trending: false, express: false },
  { id: 'strawberry', name: 'Strawberry Delight', desc: 'Fresh strawberry layers', price: 32, originalPrice: 38, tint: 'strawberry', photo: 'images/cakes/strawberry.jpg', rating: 4.5, reviews: 94, popularity: 70, bestSeller: false, trending: true, express: true },
  { id: 'lemon', name: 'Lemon Zest', desc: 'Citrus glaze, light crumb', price: 27, originalPrice: 27, tint: 'lemon', photo: 'images/cakes/lemon.jpg', rating: 4.4, reviews: 61, popularity: 55, bestSeller: false, trending: false, express: false },
  { id: 'caramel', name: 'Caramel Macchiato', desc: 'Coffee sponge, caramel drizzle', price: 34, originalPrice: 40, tint: 'caramel', photo: 'images/cakes/caramel.jpg', rating: 4.9, reviews: 152, popularity: 88, bestSeller: false, trending: true, express: true },
];

const DELIVERY_FEE = 5;
const STORAGE_KEY = 'excelBakeryCart';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

let cart = loadCart(); // { cakeId: quantity }

// ---------- Rendering ----------

function cakeById(id) {
  return CAKES.find((c) => c.id === id);
}

function cartCount() {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

function cartSubtotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const cake = cakeById(id);
    return sum + (cake ? cake.price * qty : 0);
  }, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  const count = cartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function renderCartItems() {
  const body = document.getElementById('cart-items');
  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);

  if (entries.length === 0) {
    body.innerHTML = '<p class="empty-cart">Your cart is empty. Add a cake to get started 🎂</p>';
  } else {
    body.innerHTML = entries.map(([id, qty]) => {
      const cake = cakeById(id);
      return `
        <div class="cart-item" data-id="${id}">
          <div class="thumb tint-${cake.tint}">${cakeThumbMarkup(cake)}</div>
          <div class="info">
            <h4>${cake.name}</h4>
            <div class="item-price">$${(cake.price * qty).toFixed(2)}</div>
            <div class="qty-controls">
              <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
              <span>${qty}</span>
              <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button type="button" class="remove-item" data-action="remove">Remove</button>
        </div>`;
    }).join('');
  }

  const subtotal = cartSubtotal();
  const hasItems = entries.length > 0;
  const total = hasItems ? subtotal + DELIVERY_FEE : 0;

  document.getElementById('subtotal-value').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('delivery-value').textContent = hasItems ? `$${DELIVERY_FEE.toFixed(2)}` : '$0.00';
  document.getElementById('total-value').textContent = `$${total.toFixed(2)}`;
  document.getElementById('checkout-btn').disabled = !hasItems;
  document.getElementById('checkout-btn').style.opacity = hasItems ? '1' : '0.5';

  updateCartBadge();
}

// ---------- Cake catalog artwork ----------
// Shared tinted SVG illustration, used as the fallback when a cake has no real
// photo yet (or the photo file fails to load).

function cakeSVG() {
  return `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="60" cy="102" rx="46" ry="8" fill="currentColor" class="cake-shadow"/>
    <rect x="24" y="70" width="72" height="28" rx="6" class="cake-base"/>
    <rect x="30" y="46" width="60" height="28" rx="6" class="cake-mid"/>
    <rect x="36" y="24" width="48" height="26" rx="6" class="cake-top"/>
    <path d="M24 70 Q60 58 96 70 L96 76 Q60 64 24 76 Z" class="cake-icing"/>
    <path d="M30 46 Q60 36 90 46 L90 52 Q60 42 30 52 Z" class="cake-icing"/>
    <path d="M36 24 Q60 16 84 24 L84 29 Q60 21 36 29 Z" class="cake-icing"/>
    <circle cx="60" cy="18" r="6" class="cake-cherry"/>
  </svg>`;
}

// Renders the SVG fallback first, then a real photo stacked on top of it; if the photo
// 404s or hasn't been uploaded yet, onerror removes the <img> so the fallback shows through.
function cakeThumbMarkup(cake) {
  return `
    <div class="cake-fallback">${cakeSVG()}</div>
    <img src="${cake.photo}" alt="${cake.name}" class="cake-photo" loading="lazy"
         onerror="this.remove();">
  `;
}

// ---------- Catalog filters & sort ----------

const PRICE_BUCKETS = {
  under28: (c) => c.price < 28,
  '28-31': (c) => c.price >= 28 && c.price <= 31,
  '31-34': (c) => c.price > 31 && c.price <= 34,
  over34: (c) => c.price > 34,
};

const EXPRESS_FILTERS = {
  all: () => true,
  express: (c) => c.express,
  bestseller: (c) => c.bestSeller,
  trending: (c) => c.trending,
  under30: (c) => c.price < 30,
};

const SORTERS = {
  popularity: (a, b) => b.popularity - a.popularity,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  bestseller: (a, b) => (b.bestSeller - a.bestSeller) || (b.popularity - a.popularity),
  trending: (a, b) => (b.trending - a.trending) || (b.popularity - a.popularity),
};

let activeExpressFilter = 'all';
let activePriceBuckets = [];
let activeSort = 'popularity';

function getVisibleCakes() {
  return CAKES
    .filter(EXPRESS_FILTERS[activeExpressFilter])
    .filter((c) => activePriceBuckets.length === 0 || activePriceBuckets.some((b) => PRICE_BUCKETS[b](c)))
    .sort(SORTERS[activeSort]);
}

function starRatingMarkup(rating) {
  const fill = Math.max(0, Math.min(100, (rating / 5) * 100));
  return `<span class="stars" style="--fill:${fill}%" aria-hidden="true"></span>`;
}

function renderCatalog() {
  const grid = document.getElementById('cake-grid');
  const cakes = getVisibleCakes();
  const countEl = document.getElementById('result-count');
  const emptyEl = document.getElementById('no-results');

  if (countEl) countEl.textContent = `${cakes.length} cake${cakes.length === 1 ? '' : 's'}`;
  if (emptyEl) emptyEl.hidden = cakes.length !== 0;

  grid.innerHTML = cakes.map((cake) => {
    const discountPct = cake.originalPrice > cake.price
      ? Math.round((1 - cake.price / cake.originalPrice) * 100)
      : 0;
    return `
    <article class="cake-card">
      <div class="cake-thumb tint-${cake.tint}">
        ${cakeThumbMarkup(cake)}
        ${discountPct > 0 ? `<span class="discount-badge">${discountPct}% OFF</span>` : ''}
      </div>
      <div class="cake-card-body">
        <h3>${cake.name}</h3>
        <p class="desc">${cake.desc}</p>
        <div class="rating-row">
          ${starRatingMarkup(cake.rating)}
          <span class="rating-value">${cake.rating.toFixed(1)}</span>
          <span class="review-count">(${cake.reviews})</span>
        </div>
        <span class="delivery-tag">🚚 Earliest Delivery: ${cake.express ? 'Today' : 'Tomorrow'}</span>
        <div class="cake-card-footer">
          <div class="price-group">
            ${discountPct > 0 ? `<span class="price-old">$${cake.originalPrice.toFixed(2)}</span>` : ''}
            <span class="price">$${cake.price.toFixed(2)}</span>
          </div>
          <button type="button" class="add-btn" data-id="${cake.id}">Add to Cart</button>
        </div>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id);
      openCart();
    });
  });
}

document.querySelectorAll('.express-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    activeExpressFilter = chip.dataset.filter;
    document.querySelectorAll('.express-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    renderCatalog();
  });
});

document.querySelectorAll('.price-filter').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    activePriceBuckets = Array.from(document.querySelectorAll('.price-filter:checked')).map((cb) => cb.value);
    renderCatalog();
  });
});

document.getElementById('sort-select').addEventListener('change', (e) => {
  activeSort = e.target.value;
  renderCatalog();
});

// ---------- Cart mutations ----------

function addToCart(id, qty = 1) {
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
  renderCartItems();
}

function setQty(id, qty) {
  if (qty <= 0) {
    delete cart[id];
  } else {
    cart[id] = qty;
  }
  saveCart(cart);
  renderCartItems();
}

document.addEventListener('click', (e) => {
  const item = e.target.closest('.cart-item');
  if (!item) return;
  const id = item.dataset.id;
  const action = e.target.dataset.action;
  if (action === 'increase') setQty(id, (cart[id] || 0) + 1);
  if (action === 'decrease') setQty(id, (cart[id] || 0) - 1);
  if (action === 'remove') setQty(id, 0);
});

// ---------- Drawer open/close & steps ----------

const overlay = document.getElementById('overlay');
const drawer = document.getElementById('cart-drawer');

function openCart() {
  showStep('cart');
  overlay.classList.add('open');
  drawer.classList.add('open');
}

function closeCart() {
  overlay.classList.remove('open');
  drawer.classList.remove('open');
}

function showStep(step) {
  document.querySelectorAll('.cart-step').forEach((el) => el.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
}

document.getElementById('open-cart-btn').addEventListener('click', openCart);
document.getElementById('close-cart-btn').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

document.getElementById('checkout-btn').addEventListener('click', () => {
  if (cartCount() === 0) return;
  showStep('checkout');
});

document.getElementById('back-to-cart').addEventListener('click', () => showStep('cart'));

// ---------- Order submission ----------

// Saves the order to Supabase so it shows up on /admin.html regardless of which
// device the customer ordered from. Throws on failure so the caller can show an error.
async function submitOrderToSupabase(order) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      ref: order.ref,
      name: order.name,
      phone: order.phone,
      address: order.address,
      notes: order.notes,
      items: order.items,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      total: order.total,
      status: 'new',
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to place order.');
  }
}

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const statusEl = document.getElementById('checkout-status');
  const submitBtn = document.getElementById('checkout-submit-btn');

  const order = {
    ref: 'EB-' + Math.floor(100000 + Math.random() * 900000),
    name: document.getElementById('cust-name').value.trim(),
    phone: document.getElementById('cust-phone').value.trim(),
    address: document.getElementById('cust-address').value.trim(),
    notes: document.getElementById('cust-notes').value.trim(),
    items: Object.entries(cart).map(([id, qty]) => {
      const cake = cakeById(id);
      return { id, qty, name: cake.name, price: cake.price };
    }),
    subtotal: cartSubtotal(),
    deliveryFee: DELIVERY_FEE,
    total: cartSubtotal() + DELIVERY_FEE,
  };

  submitBtn.disabled = true;
  statusEl.textContent = 'Placing your order…';

  try {
    await submitOrderToSupabase(order);
  } catch (err) {
    statusEl.textContent = 'Could not place your order — please check your connection and try again.';
    submitBtn.disabled = false;
    return;
  }

  statusEl.textContent = '';
  submitBtn.disabled = false;
  document.getElementById('order-ref').textContent = order.ref;

  cart = {};
  saveCart(cart);
  renderCartItems();
  e.target.reset();
  showStep('confirm');
});

document.getElementById('new-order-btn').addEventListener('click', () => {
  closeCart();
  showStep('cart');
});

// ---------- Init ----------

renderCatalog();
renderCartItems();

// ============================================
// Excel Bakery — cart & checkout logic
// Cart persists in localStorage so it survives a refresh.
// No backend is wired up yet — "Place Order" writes the
// order to localStorage and shows a confirmation screen.
// Swap the placeOrder() body for a real API call later.
// ============================================

const CAKES = [
  { id: 'vanilla', name: 'Classic Vanilla', desc: 'Vanilla sponge, silky buttercream', price: 25, tint: 'vanilla' },
  { id: 'chocolate', name: 'Chocolate Fudge', desc: 'Rich cocoa layers, ganache drip', price: 30, tint: 'chocolate' },
  { id: 'redvelvet', name: 'Red Velvet', desc: 'Cream cheese frosting', price: 28, tint: 'redvelvet' },
  { id: 'strawberry', name: 'Strawberry Delight', desc: 'Fresh strawberry layers', price: 32, tint: 'strawberry' },
  { id: 'lemon', name: 'Lemon Zest', desc: 'Citrus glaze, light crumb', price: 27, tint: 'lemon' },
  { id: 'caramel', name: 'Caramel Macchiato', desc: 'Coffee sponge, caramel drizzle', price: 34, tint: 'caramel' },
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
          <div class="thumb tint-${cake.tint}">${cakeSVG()}</div>
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

// ---------- Cake catalog SVG (shared illustration, tinted per flavor via CSS) ----------

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

function renderCatalog() {
  const grid = document.getElementById('cake-grid');
  grid.innerHTML = CAKES.map((cake) => `
    <article class="cake-card">
      <div class="cake-thumb tint-${cake.tint}">${cakeSVG()}</div>
      <div class="cake-card-body">
        <h3>${cake.name}</h3>
        <p class="desc">${cake.desc}</p>
        <div class="cake-card-footer">
          <span class="price">$${cake.price.toFixed(2)}</span>
          <button type="button" class="add-btn" data-id="${cake.id}">Add to Cart</button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id);
      openCart();
    });
  });
}

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

document.getElementById('checkout-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const order = {
    ref: 'EB-' + Math.floor(100000 + Math.random() * 900000),
    name: document.getElementById('cust-name').value.trim(),
    phone: document.getElementById('cust-phone').value.trim(),
    address: document.getElementById('cust-address').value.trim(),
    notes: document.getElementById('cust-notes').value.trim(),
    items: Object.entries(cart).map(([id, qty]) => ({ id, qty, ...cakeById(id) })),
    subtotal: cartSubtotal(),
    deliveryFee: DELIVERY_FEE,
    total: cartSubtotal() + DELIVERY_FEE,
    placedAt: new Date().toISOString(),
  };

  // TODO: replace with a real API call, e.g.
  // fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) })
  const orders = JSON.parse(localStorage.getItem('excelBakeryOrders') || '[]');
  orders.push(order);
  localStorage.setItem('excelBakeryOrders', JSON.stringify(orders));

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

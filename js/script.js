'use strict';

/* =========================================================
   EXCEL BOOKING CENTER — APPLICATION SCRIPT
   Sections: Data, State, Utilities, Rendering, Validation,
   Live Summary, Booking Submission, My Bookings, Contact Form,
   Navigation, Animations, Init
   ========================================================= */

/* ---------- Backend config (Supabase) ---------- */
// The anon key is meant to be public — Supabase enforces access with Row Level Security
// policies on the `bookings` table (see README), not by keeping this key secret.
// Replace both placeholders with your project's values from Supabase Settings -> API.
const SUPABASE_URL = 'https://btbykqususlhajdahrpg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pgAOYkhhIOALErwSJg1Hzw_p_-s2gHl';

/* ---------- Data ---------- */
// Master list of services offered. Rendered dynamically — never hard-coded in HTML.
const services = [
  {
    id: 1,
    name: 'Hair Styling & Braiding',
    description: 'Expert braiding, weaving and styling tailored to your look.',
    duration: 90,
    price: 25,
    category: 'beauty',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 5h16v3H4z"/><path d="M6.5 8v11M10 8v11M13.5 8v11M17 8v11"/></svg>',
  },
  {
    id: 2,
    name: 'Barbing & Grooming',
    description: 'Sharp fades, clean lines and beard grooming for gentlemen.',
    duration: 45,
    price: 10,
    category: 'grooming',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><path d="M7.8 7.6 19 17M7.8 16.4 19 7"/></svg>',
  },
  {
    id: 3,
    name: 'Manicure & Pedicure',
    description: 'Complete nail care leaving your hands and feet refreshed.',
    duration: 60,
    price: 20,
    category: 'beauty',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21c-1.5 0-2.5-1.2-2.5-3 0-3 1-6 1-9a2.5 2.5 0 0 1 5 0c0 3 1 6 1 9 0 1.8-1 3-2.5 3z"/><path d="M12 3.5V2M9.5 4 8.8 2.7M14.5 4l.7-1.3"/></svg>',
  },
  {
    id: 4,
    name: 'Facial Treatment',
    description: 'Deep-cleansing facial to rejuvenate and brighten your skin.',
    duration: 60,
    price: 30,
    category: 'wellness',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="13" r="7"/><path d="M8.5 12h.01M13.5 12h.01M8.5 15.5c1 1 4 1 5 0"/><path d="M19 4l.8 1.8 1.7.7-1.7.8L19 9l-.8-1.7-1.7-.8 1.7-.7z"/></svg>',
  },
  {
    id: 5,
    name: 'Massage Therapy',
    description: 'Relaxing full-body massage to relieve stress and tension.',
    duration: 75,
    price: 40,
    category: 'wellness',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3"/><path d="M3 15c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3"/></svg>',
  },
  {
    id: 6,
    name: 'Makeup Session',
    description: 'Professional makeup application for any occasion.',
    duration: 60,
    price: 35,
    category: 'beauty',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3h4l1 4h-6z"/><path d="M9 7h6v9a3 3 0 0 1-3 3 3 3 0 0 1-3-3z"/></svg>',
  },
];

/* ---------- State ---------- */
// All bookings made during the current session (in-memory only).
const bookings = [];
// Ordered list of currently checked service IDs — order = the sequence they'll be scheduled in.
let selectedServiceIds = [];
// Minutes-from-midnight when the first selected service should start (null until chosen).
let selectedStartMinutes = null;

/* ---------- Utilities ---------- */

const OPENING_MINUTES = 9 * 60;
const CLOSING_MINUTES = 17 * 60;

// Converts minutes-from-midnight into a "9:00 AM" style label.
function formatMinutesToLabel(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute === 0 ? '00' : String(minute).padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

// Builds the list of bookable start-time slots from 9:00 AM to 5:00 PM in 30-minute steps.
function generateTimeSlots() {
  const slots = [];
  for (let minutes = OPENING_MINUTES; minutes <= CLOSING_MINUTES; minutes += 30) {
    slots.push({ minutes, label: formatMinutesToLabel(minutes) });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

// Builds the sequential schedule for a set of services starting at startMinutes: each service
// begins the moment the previous one ends, so picking a start time for the first service is
// enough to determine when every later service in the booking begins.
function computeSchedule(startMinutes, serviceIds) {
  let cursor = startMinutes;
  const rows = serviceIds.map((id) => {
    const service = services.find((s) => s.id === id);
    const row = {
      serviceId: id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      startMinutes: cursor,
      endMinutes: cursor + service.duration,
    };
    cursor += service.duration;
    return row;
  });
  return {
    rows,
    totalDuration: rows.reduce((sum, r) => sum + r.duration, 0),
    totalPrice: rows.reduce((sum, r) => sum + r.price, 0),
    endMinutes: cursor,
  };
}

// Returns true if starting a booking of the given duration at startMinutes would either run
// past closing time or overlap another booking already on the books for that date.
function isSlotUnavailable(startMinutes, duration, dateValue) {
  const endMinutes = startMinutes + duration;
  if (endMinutes > CLOSING_MINUTES) return true;
  return bookings.some((b) => b.date === dateValue && startMinutes < b.endMinutes && endMinutes > b.startMinutes);
}

// Formats a duration in minutes as a human-readable string, e.g. "1 hr 30 min".
function formatDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

// Formats a YYYY-MM-DD date string as a readable date, e.g. "Jul 23, 2026".
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Generates a booking reference like EBC-2026-0417.
function generateBookingReference() {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `EBC-${year}-${randomPart}`;
}

// Shows a temporary toast notification.
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ---------- Rendering: Services ---------- */

// Renders service cards into the grid, optionally filtered by category.
function renderServices(filter = 'all') {
  const grid = document.getElementById('serviceGrid');
  grid.innerHTML = '';

  services.forEach((service) => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.category = service.category;
    if (filter !== 'all' && service.category !== filter) {
      card.classList.add('is-hidden');
    }

    card.innerHTML = `
      <div class="service-icon-badge">${service.icon}</div>
      <span class="category-tag">${service.category}</span>
      <h3>${service.name}</h3>
      <p>${service.description}</p>
      <div class="service-meta">
        <span class="duration">${formatDuration(service.duration)}</span>
        <span class="price">$${service.price}</span>
      </div>
      <button type="button" class="btn btn-secondary select-service-btn" data-id="${service.id}">Select</button>
    `;
    grid.appendChild(card);
  });
}

// Renders the service checkbox list customers use to pick one or more services to book.
function renderServiceCheckboxList() {
  const container = document.getElementById('serviceCheckboxList');
  container.innerHTML = '';

  services.forEach((service) => {
    const label = document.createElement('label');
    label.className = 'service-checkbox';
    label.innerHTML = `
      <input type="checkbox" class="service-checkbox-input" value="${service.id}" />
      <span class="service-checkbox-name">${service.name}</span>
      <span class="service-checkbox-meta">${formatDuration(service.duration)} &middot; $${service.price}</span>
    `;

    const input = label.querySelector('input');
    input.addEventListener('change', () => {
      const id = service.id;
      if (input.checked) {
        selectedServiceIds.push(id);
        label.classList.add('checked');
      } else {
        selectedServiceIds = selectedServiceIds.filter((existingId) => existingId !== id);
        label.classList.remove('checked');
      }

      // Adding/removing a service changes the total duration, which can make the previously
      // chosen start time no longer fit (runs past closing, or now collides with another booking).
      const dateValue = document.getElementById('bookingDate').value;
      const totalDuration = selectedServiceIds.reduce((sum, sid) => sum + services.find((s) => s.id === sid).duration, 0);
      if (selectedStartMinutes !== null && isSlotUnavailable(selectedStartMinutes, totalDuration, dateValue)) {
        selectedStartMinutes = null;
      }

      validateField('services');
      renderTimeSlots();
      updateSummary();
    });

    container.appendChild(label);
  });
}

// Wires up the category filter buttons.
function initFilterBar() {
  const filterBar = document.getElementById('filterBar');
  filterBar.addEventListener('click', (event) => {
    const btn = event.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderServices(btn.dataset.category);
  });
}

// Clicking "Select" on a card jumps to the booking form and checks that service's box.
function initServiceSelection() {
  document.getElementById('serviceGrid').addEventListener('click', (event) => {
    const btn = event.target.closest('.select-service-btn');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const checkbox = document.querySelector(`.service-checkbox-input[value="${id}"]`);
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    }
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------- Rendering: Time Slots ---------- */

// Renders the start-time slot buttons, disabling any that would overlap an existing booking or
// run past closing time given however many services are currently checked.
function renderTimeSlots() {
  const container = document.getElementById('timeSlotGrid');
  const dateValue = document.getElementById('bookingDate').value;
  container.innerHTML = '';

  const totalDuration = selectedServiceIds.length
    ? selectedServiceIds.reduce((sum, sid) => sum + services.find((s) => s.id === sid).duration, 0)
    : 30;

  TIME_SLOTS.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot-btn';
    button.textContent = slot.label;

    const isTaken = !!dateValue && isSlotUnavailable(slot.minutes, totalDuration, dateValue);
    if (isTaken) {
      button.classList.add('taken');
      button.disabled = true;
    }
    if (selectedStartMinutes === slot.minutes && !isTaken) {
      button.classList.add('selected');
    }

    button.addEventListener('click', () => {
      selectedStartMinutes = slot.minutes;
      renderTimeSlots();
      validateField('timeSlot');
      updateSummary();
    });

    container.appendChild(button);
  });
}

/* ---------- Validation ---------- */

// Sets the visual valid/invalid state and error message for a field.
function setFieldState(inputEl, errorEl, isValid, message) {
  if (isValid) {
    inputEl.classList.add('valid');
    inputEl.classList.remove('invalid');
    errorEl.textContent = '';
  } else {
    inputEl.classList.add('invalid');
    inputEl.classList.remove('valid');
    errorEl.textContent = message;
  }
  return isValid;
}

// Validates a single named field and returns true/false. Also updates its UI state.
function validateField(fieldName) {
  switch (fieldName) {
    case 'fullName': {
      const input = document.getElementById('fullName');
      const errorEl = document.getElementById('err-fullName');
      const value = input.value.trim();
      const isValid = /^[A-Za-z\s'-]{3,}$/.test(value);
      return setFieldState(input, errorEl, isValid, 'Name must be at least 3 letters (letters only).');
    }
    case 'phone': {
      const input = document.getElementById('phone');
      const errorEl = document.getElementById('err-phone');
      const value = input.value.trim();
      const isValid = /^(?:\+231|0)\d{9}$/.test(value);
      return setFieldState(input, errorEl, isValid, 'Enter a valid Liberian number, e.g. 0886692124 or +231886692124.');
    }
    case 'email': {
      const input = document.getElementById('email');
      const errorEl = document.getElementById('err-email');
      const value = input.value.trim();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return setFieldState(input, errorEl, isValid, 'Enter a valid email address.');
    }
    case 'services': {
      const errorEl = document.getElementById('err-services');
      const isValid = selectedServiceIds.length > 0;
      errorEl.textContent = isValid ? '' : 'Please select at least one service.';
      return isValid;
    }
    case 'bookingDate': {
      const input = document.getElementById('bookingDate');
      const errorEl = document.getElementById('err-bookingDate');
      const value = input.value;
      if (!value) return setFieldState(input, errorEl, false, 'Please choose a date.');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(`${value}T00:00:00`);
      const isValid = chosen >= today;
      return setFieldState(input, errorEl, isValid, 'Date cannot be in the past.');
    }
    case 'timeSlot': {
      const errorEl = document.getElementById('err-timeSlot');
      const isValid = selectedStartMinutes !== null;
      if (isValid) {
        errorEl.textContent = '';
      } else {
        errorEl.textContent = 'Please select a start time.';
      }
      return isValid;
    }
    default:
      return true;
  }
}

// Validates every field in the booking form; used on submit.
function validateBookingForm() {
  const fields = ['fullName', 'phone', 'email', 'services', 'bookingDate', 'timeSlot'];
  const results = fields.map(validateField);
  return results.every(Boolean);
}

// Attaches blur + input listeners for real-time inline validation.
function initBookingValidation() {
  const fieldIds = ['fullName', 'phone', 'email', 'bookingDate'];
  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid')) validateField(id);
      updateSummary();
    });
    el.addEventListener('change', () => {
      if (id === 'bookingDate') {
        selectedStartMinutes = null;
        renderTimeSlots();
      }
      updateSummary();
    });
  });
}

/* ---------- Live Booking Summary ---------- */

// Renders a set of computed schedule rows (used by both the live summary and the confirmation card).
function renderScheduleRows(container, rows) {
  container.innerHTML = '';
  rows.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'schedule-row';
    rowEl.innerHTML = `
      <span class="schedule-time">${formatMinutesToLabel(row.startMinutes)} &ndash; ${formatMinutesToLabel(row.endMinutes)}</span>
      <span class="schedule-service">${row.name}</span>
      <span class="schedule-price">$${row.price}</span>
    `;
    container.appendChild(rowEl);
  });
}

// Recomputes and redisplays the live booking summary panel based on current form values.
function updateSummary() {
  const dateValue = document.getElementById('bookingDate').value;
  const scheduleContainer = document.getElementById('summarySchedule');

  if (!selectedServiceIds.length || selectedStartMinutes === null) {
    scheduleContainer.innerHTML = '<p class="empty-schedule" id="summaryEmpty">Select service(s) and a start time to see your schedule.</p>';
    document.getElementById('sum-date').textContent = dateValue ? formatDate(dateValue) : '—';
    document.getElementById('sum-duration').textContent = '—';
    document.getElementById('sum-total').textContent = '$0';
    return;
  }

  const schedule = computeSchedule(selectedStartMinutes, selectedServiceIds);
  renderScheduleRows(scheduleContainer, schedule.rows);
  document.getElementById('sum-date').textContent = dateValue ? formatDate(dateValue) : '—';
  document.getElementById('sum-duration').textContent = formatDuration(schedule.totalDuration);
  document.getElementById('sum-total').textContent = `$${schedule.totalPrice}`;
}

/* ---------- Booking Submission ---------- */

// Handles booking form submission: validates, checks conflicts, creates booking, shows confirmation.
function handleBookingSubmit(event) {
  event.preventDefault();

  const isFormValid = validateBookingForm();
  if (!isFormValid) {
    showToast('Please fix the highlighted errors before submitting.');
    return;
  }

  const dateValue = document.getElementById('bookingDate').value;
  const schedule = computeSchedule(selectedStartMinutes, selectedServiceIds);

  if (isSlotUnavailable(selectedStartMinutes, schedule.totalDuration, dateValue)) {
    document.getElementById('err-timeSlot').textContent =
      'That time no longer fits — it now overlaps another booking or runs past closing. Please choose another start time.';
    renderTimeSlots();
    return;
  }

  const booking = {
    reference: generateBookingReference(),
    name: document.getElementById('fullName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    date: dateValue,
    services: schedule.rows,
    startMinutes: selectedStartMinutes,
    endMinutes: schedule.endMinutes,
    totalDuration: schedule.totalDuration,
    totalPrice: schedule.totalPrice,
    notes: document.getElementById('notes').value.trim(),
  };

  bookings.push(booking);
  submitBookingToSupabase(booking);
  showConfirmation(booking);
  renderBookingsList();
  showToast(`Booking confirmed! Reference ${booking.reference}`);
}

// Builds a short human-readable line per service for the Supabase row / admin dashboard.
function buildScheduleSummaryText(booking) {
  return booking.services
    .map((row) => `${formatMinutesToLabel(row.startMinutes)}-${formatMinutesToLabel(row.endMinutes)} ${row.name} ($${row.price})`)
    .join('; ');
}

// Saves the booking to Supabase so the business owner can see it on the admin dashboard.
// Fails silently when Supabase hasn't been configured yet, or when testing locally via
// file:// — the in-memory booking flow above still works either way.
function submitBookingToSupabase(booking) {
  if (window.location.protocol === 'file:') return;
  if (SUPABASE_URL.includes('YOUR_SUPABASE') || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) return;

  fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      reference: booking.reference,
      full_name: booking.name,
      phone: booking.phone,
      email: booking.email,
      booking_date: booking.date,
      start_time: formatMinutesToLabel(booking.startMinutes),
      services: buildScheduleSummaryText(booking),
      total_price: booking.totalPrice,
      notes: booking.notes,
    }),
  }).catch(() => {
    /* Supabase unreachable/misconfigured — ignore, the local booking flow already succeeded. */
  });
}

// Displays the confirmation card in place of the booking form.
function showConfirmation(booking) {
  document.getElementById('bookingForm').classList.add('hidden');
  document.getElementById('bookingSummary').classList.add('hidden');

  document.getElementById('conf-ref').textContent = booking.reference;
  document.getElementById('conf-name').textContent = booking.name;
  document.getElementById('conf-date').textContent = formatDate(booking.date);
  document.getElementById('conf-phone').textContent = booking.phone;
  document.getElementById('conf-email').textContent = booking.email;
  document.getElementById('conf-total').textContent = `$${booking.totalPrice}`;

  renderScheduleRows(document.getElementById('confirmationSchedule'), booking.services);

  document.getElementById('confirmationCard').classList.remove('hidden');
}

// Resets the booking form and returns the user to a blank booking state.
function resetBookingForm() {
  const form = document.getElementById('bookingForm');
  form.reset();
  selectedServiceIds = [];
  selectedStartMinutes = null;

  form.querySelectorAll('.service-checkbox').forEach((label) => label.classList.remove('checked'));
  form.querySelectorAll('input, select, textarea').forEach((el) => {
    el.classList.remove('valid', 'invalid');
  });
  form.querySelectorAll('.error-msg').forEach((el) => { el.textContent = ''; });

  renderTimeSlots();
  updateSummary();

  document.getElementById('confirmationCard').classList.add('hidden');
  form.classList.remove('hidden');
  document.getElementById('bookingSummary').classList.remove('hidden');
}

/* ---------- My Bookings ---------- */

// Renders the "My Bookings" list from the in-memory bookings array.
function renderBookingsList() {
  const list = document.getElementById('bookingsList');
  const emptyState = document.getElementById('bookingsEmptyState');
  list.innerHTML = '';

  if (bookings.length === 0) {
    list.appendChild(emptyState);
    return;
  }

  bookings.forEach((booking) => {
    const item = document.createElement('div');
    item.className = 'booking-item';
    const serviceNames = booking.services.map((row) => row.name).join(', ');
    const timeRange = `${formatMinutesToLabel(booking.startMinutes)} – ${formatMinutesToLabel(booking.endMinutes)}`;
    item.innerHTML = `
      <div>
        <div class="booking-ref">${booking.reference}</div>
        <div class="booking-details">${serviceNames} &middot; ${formatDate(booking.date)} at ${timeRange} &middot; $${booking.totalPrice}</div>
      </div>
      <button type="button" class="cancel-btn" data-ref="${booking.reference}">Cancel</button>
    `;
    list.appendChild(item);
  });
}

// Cancels a booking by reference, removing it from state and re-rendering.
function cancelBooking(reference) {
  const index = bookings.findIndex((b) => b.reference === reference);
  if (index === -1) return;
  bookings.splice(index, 1);
  renderBookingsList();
  renderTimeSlots();
  showToast('Booking cancelled.');
}

function initBookingsList() {
  document.getElementById('bookingsList').addEventListener('click', (event) => {
    const btn = event.target.closest('.cancel-btn');
    if (!btn) return;
    cancelBooking(btn.dataset.ref);
  });
}

/* ---------- Contact Form ---------- */

// Validates a single contact-form field.
function validateContactField(fieldName) {
  switch (fieldName) {
    case 'contactName': {
      const input = document.getElementById('contactName');
      const errorEl = document.getElementById('err-contactName');
      const isValid = input.value.trim().length >= 2;
      return setFieldState(input, errorEl, isValid, 'Please enter your name.');
    }
    case 'contactEmail': {
      const input = document.getElementById('contactEmail');
      const errorEl = document.getElementById('err-contactEmail');
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      return setFieldState(input, errorEl, isValid, 'Enter a valid email address.');
    }
    case 'contactMessage': {
      const input = document.getElementById('contactMessage');
      const errorEl = document.getElementById('err-contactMessage');
      const isValid = input.value.trim().length >= 10;
      return setFieldState(input, errorEl, isValid, 'Message must be at least 10 characters.');
    }
    default:
      return true;
  }
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  const fieldIds = ['contactName', 'contactEmail', 'contactMessage'];

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validateContactField(id));
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid')) validateContactField(id);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const isValid = fieldIds.map(validateContactField).every(Boolean);
    if (!isValid) {
      showToast('Please fix the highlighted errors before sending.');
      return;
    }
    showToast('Message sent! We will get back to you soon.');
    form.reset();
    fieldIds.forEach((id) => document.getElementById(id).classList.remove('valid', 'invalid'));
  });
}

/* ---------- Navigation ---------- */

// Wires up the mobile hamburger menu toggle.
function initHamburgerMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('primaryNav');

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    hamburgerBtn.classList.toggle('open', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      hamburgerBtn.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// Hero "Book Now" button scrolls smoothly to the booking form.
function initHeroBookButton() {
  document.getElementById('heroBookBtn').addEventListener('click', () => {
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------- Scroll-triggered Animations ---------- */

// Observes elements with the .fade-in class and reveals them as they enter the viewport.
function initFadeInAnimations() {
  const targets = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach((target) => observer.observe(target));
}

/* ---------- Init ---------- */

// Sets the minimum selectable date on the date input to today (blocks past dates natively too).
function initDateInputMin() {
  const dateInput = document.getElementById('bookingDate');
  const today = new Date();
  const iso = today.toISOString().split('T')[0];
  dateInput.min = iso;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentYear').textContent = new Date().getFullYear();

  renderServices();
  renderServiceCheckboxList();
  renderTimeSlots();
  initDateInputMin();

  initFilterBar();
  initServiceSelection();
  initBookingValidation();
  initBookingsList();
  initContactForm();
  initHamburgerMenu();
  initHeroBookButton();
  initFadeInAnimations();

  document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
  document.getElementById('makeAnotherBtn').addEventListener('click', resetBookingForm);

  updateSummary();
});

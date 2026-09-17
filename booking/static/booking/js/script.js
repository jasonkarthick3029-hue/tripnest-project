// ============================================================
// TripNest - complete demo frontend
// Django JSON APIs + session authentication + booking flow
// ============================================================

const state = {
  activeTab: "flights",
  lastResults: [],
  lastType: "flights",
  loggedIn: false,
  userName: "",
  pendingBooking: null,
};

// -------------------- helpers --------------------
function getCookie(name) {
  const match = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return match ? match.pop() : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtMoney(value) {
  return "₹" + Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}-${m}-${y}`;
}

async function api(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    ...(method !== "GET" ? { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// -------------------- hero carousel --------------------
const heroSlides = document.querySelectorAll(".hero-slide");
if (heroSlides.length > 1) {
  let slideIndex = 0;
  setInterval(() => {
    heroSlides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % heroSlides.length;
    heroSlides[slideIndex].classList.add("active");
  }, 4000);
}

// -------------------- page sections --------------------
const heroSection = document.getElementById("heroSection");
const dealsSection = document.getElementById("dealsSection");
const resultsPage = document.getElementById("resultsPage");

function showResultsPage(summaryText) {
  heroSection.classList.add("hidden");
  dealsSection.classList.add("hidden");
  resultsPage.classList.remove("hidden");
  document.getElementById("resultsPageSummary").textContent = summaryText;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showSearchPage() {
  resultsPage.classList.add("hidden");
  heroSection.classList.remove("hidden");
  dealsSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.getElementById("backToSearchBtn").addEventListener("click", showSearchPage);

// -------------------- Schedule / Manage / Check-in / Status --------------------
document.querySelectorAll(".trip-tab").forEach((button) => {
  button.addEventListener("click", async () => {
    document.querySelectorAll(".trip-tab").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    const trip = button.dataset.trip;

    if (trip === "schedule") return;

    if (trip === "manage") {
      if (!state.loggedIn) {
        showAuthModal("login");
      } else {
        await loadBookings();
      }
      return;
    }

    if (trip === "checkin") {
      if (!state.loggedIn) {
        showAuthModal("login");
        return;
      }
      openInfoModal("checkin");
      return;
    }

    if (trip === "status") {
      openInfoModal("status");
    }
  });
});

// -------------------- nav --------------------
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

document.querySelector(".main-nav a:nth-child(3)")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (state.loggedIn) loadBookings();
  else showAuthModal("login");
});

// -------------------- service tabs --------------------
document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".search-form").forEach((form) => form.classList.add("hidden"));
    button.classList.add("active");
    state.activeTab = button.dataset.tab;
    document.getElementById(state.activeTab + "Form").classList.remove("hidden");

    // Visual-only service scene; search/API behavior remains unchanged.
    const hero = document.getElementById("heroSection");
    hero.classList.remove("service-flights", "service-hotels", "service-buses");
    hero.classList.add(`service-${state.activeTab}`);
    const badge = document.getElementById("heroServiceBadge");
    const labels = { flights: "FLIGHTS · FLY FARTHER", hotels: "HOTELS · STAY BEAUTIFULLY", buses: "BUSES · GO FURTHER" };
    if (badge) badge.textContent = labels[state.activeTab] || "TRAVEL · DISCOVER · EXPLORE";
  });
});

// Prevent past dates in demo search forms and keep checkout after check-in.
const todayISO = new Date().toISOString().slice(0, 10);
document.querySelectorAll('input[type="date"]').forEach((input) => {
  input.min = todayISO;
});
const hotelCheckin = document.querySelector('#hotelsForm input[name="checkin"]');
const hotelCheckout = document.querySelector('#hotelsForm input[name="checkout"]');
hotelCheckin?.addEventListener("change", () => {
  if (hotelCheckin.value) {
    hotelCheckout.min = hotelCheckin.value;
  }
});

// -------------------- search forms --------------------
document.getElementById("flightsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const origin = fd.get("origin").trim();
  const destination = fd.get("destination").trim();
  const travelDate = fd.get("travel_date");

  const params = new URLSearchParams({ origin, destination, travel_date: travelDate });
  await runSearch(
    "flights",
    `/api/search/flights?${params}`,
    `${origin} → ${destination} · ${formatDate(travelDate)}`
  );
});

document.getElementById("hotelsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const city = fd.get("city").trim();
  const checkin = fd.get("checkin");
  const checkout = fd.get("checkout");

  if (new Date(checkout) <= new Date(checkin)) {
    alert("Check-out must be after check-in.");
    return;
  }

  const params = new URLSearchParams({ city });
  await runSearch(
    "hotels",
    `/api/search/hotels?${params}`,
    `Hotels in ${city} · ${formatDate(checkin)} to ${formatDate(checkout)}`,
    { checkin, checkout }
  );
});

document.getElementById("busesForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const origin = fd.get("origin").trim();
  const destination = fd.get("destination").trim();
  const travelDate = fd.get("travel_date");

  const params = new URLSearchParams({ origin, destination, travel_date: travelDate });
  await runSearch(
    "buses",
    `/api/search/buses?${params}`,
    `${origin} → ${destination} · ${formatDate(travelDate)}`
  );
});

async function runSearch(type, url, summaryText, extra = {}) {
  showResultsPage(summaryText);

  const list = document.getElementById("resultsList");
  const header = document.getElementById("resultsHeader");
  list.innerHTML = "<p style='text-align:center;color:#667380;padding:30px'>Searching...</p>";
  header.classList.remove("hidden");

  try {
    const data = await api(url);
    state.lastResults = data;
    state.lastType = type;
    state.searchExtra = extra;

    document.getElementById("resultsTitle").textContent =
      type === "flights" ? "Flights" : type === "hotels" ? "Hotels" : "Buses";
    document.getElementById("resultsCount").textContent = `${data.length} result${data.length !== 1 ? "s" : ""} found`;
    renderResults(type, data);
  } catch (error) {
    list.innerHTML = `<p style='text-align:center;color:#E8532F;padding:30px'>${escapeHtml(error.message)}</p>`;
  }
}

function renderResults(type, items) {
  const list = document.getElementById("resultsList");

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">⌕</div>
        <h3>No ${type} found</h3>
        <p>Try another route, city or date.</p>
        <button class="btn-outline" onclick="document.getElementById('backToSearchBtn').click()">Start a new search</button>
      </div>`;
    return;
  }

  const flightImages = [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1517479149777-5f3e151e45a3?auto=format&fit=crop&w=900&q=85"
  ];
  const hotelImages = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=900&q=85"
  ];
  const busImages = [
    "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=85"
  ];
  const images = type === "flights" ? flightImages : type === "hotels" ? hotelImages : busImages;

  list.innerHTML = items.map((item, index) => {
    const image = images[index % images.length];

    if (type === "flights") {
      return `
        <div class="result-card result-card-rich flight-result">
          <div class="result-visual" style="background-image:linear-gradient(180deg,rgba(3,35,53,.05),rgba(3,35,53,.58)),url('${image}')">
            <span class="visual-chip">✈ FLIGHT</span>
          </div>
          <div class="result-main">
            <div class="result-title">${escapeHtml(item.airline)} · ${escapeHtml(item.flight_number)}</div>
            <div class="result-route"><strong>${escapeHtml(item.origin)}</strong> <span class="dot">✈</span> <strong>${escapeHtml(item.destination)}</strong></div>
            <div class="result-sub">${formatDate(item.travel_date)} · Departs ${item.departure_time} · Arrives ${item.arrival_time}</div>
            <div class="result-tags"><span class="tag">${item.seats_available} seats left</span><span class="tag">Direct</span></div>
          </div>
          <div class="result-side">
            <div class="result-price">${fmtMoney(item.price)}<br><small>per adult</small></div>
            <button class="btn-book book-option" data-type="flight" data-id="${item.id}" data-price="${item.price}" data-label="${escapeHtml(`${item.airline} ${item.flight_number} (${item.origin} → ${item.destination})`)}">Select</button>
          </div>
        </div>`;
    }

    if (type === "hotels") {
      return `
        <div class="result-card result-card-rich hotel-result">
          <div class="result-visual" style="background-image:linear-gradient(180deg,rgba(3,35,53,.02),rgba(3,35,53,.52)),url('${image}')">
            <span class="visual-chip">🏨 HOTEL</span>
          </div>
          <div class="result-main">
            <div class="result-title">${escapeHtml(item.name)}</div>
            <div class="result-sub">${escapeHtml(item.address)}, ${escapeHtml(item.city)}</div>
            <div class="result-tags"><span class="tag">★ ${item.rating}</span><span class="tag">${item.rooms_available} rooms left</span></div>
          </div>
          <div class="result-side">
            <div class="result-price">${fmtMoney(item.price_per_night)}<br><small>per night</small></div>
            <button class="btn-book book-option" data-type="hotel" data-id="${item.id}" data-price="${item.price_per_night}" data-label="${escapeHtml(`${item.name}, ${item.city}`)}">View &amp; Book</button>
          </div>
        </div>`;
    }

    return `
      <div class="result-card result-card-rich bus-result">
        <div class="result-visual" style="background-image:linear-gradient(180deg,rgba(3,35,53,.02),rgba(3,35,53,.55)),url('${image}')">
          <span class="visual-chip">🚌 BUS</span>
        </div>
        <div class="result-main">
          <div class="result-title">${escapeHtml(item.operator)} · ${escapeHtml(item.bus_type)}</div>
          <div class="result-route"><strong>${escapeHtml(item.origin)}</strong> <span class="dot">🚌</span> <strong>${escapeHtml(item.destination)}</strong></div>
          <div class="result-sub">${formatDate(item.travel_date)} · Departs ${item.departure_time} · Arrives ${item.arrival_time}</div>
          <div class="result-tags"><span class="tag">${item.seats_available} seats left</span></div>
        </div>
        <div class="result-side">
          <div class="result-price">${fmtMoney(item.price)}<br><small>per seat</small></div>
          <button class="btn-book book-option" data-type="bus" data-id="${item.id}" data-price="${item.price}" data-label="${escapeHtml(`${item.operator} (${item.origin} → ${item.destination})`)}">Select</button>
        </div>
      </div>`;
  }).join("");

  document.querySelectorAll(".book-option").forEach((button) => {
    button.addEventListener("click", () => {
      openBooking(
        button.dataset.type,
        Number(button.dataset.id),
        Number(button.dataset.price),
        button.dataset.label
      );
    });
  });
}

// -------------------- deals --------------------
document.querySelectorAll(".deal-card").forEach((card) => {
  card.querySelector(".btn-deal")?.addEventListener("click", () => {
    document.querySelector('.tab[data-tab="flights"]').click();
    const destination = document.querySelector('#flightsForm input[name="destination"]');
    destination.value = card.dataset.city;
    document.getElementById("heroSection").scrollIntoView({ behavior: "smooth" });
    destination.focus();
  });
});

// -------------------- authentication --------------------
const authModal = document.getElementById("authModal");

document.getElementById("loginBtn").addEventListener("click", () => showAuthModal("login"));
document.getElementById("signupBtn").addEventListener("click", () => showAuthModal("signup"));
document.getElementById("closeAuthModal").addEventListener("click", () => authModal.classList.add("hidden"));

document.querySelectorAll(".modal-tab").forEach((button) => {
  button.addEventListener("click", () => showAuthModal(button.dataset.mtab));
});

function showAuthModal(tab) {
  authModal.classList.remove("hidden");
  document.querySelectorAll(".modal-tab").forEach((b) => b.classList.toggle("active", b.dataset.mtab === tab));
  document.getElementById("loginForm").classList.toggle("hidden", tab !== "login");
  document.getElementById("signupForm").classList.toggle("hidden", tab !== "signup");
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const msg = document.getElementById("loginMsg");
  msg.className = "form-msg";

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    setLoggedIn(data.name);
    authModal.classList.add("hidden");
    event.target.reset();
  } catch (error) {
    msg.className = "form-msg error";
    msg.textContent = error.message;
  }
});

document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const msg = document.getElementById("signupMsg");
  msg.className = "form-msg";

  try {
    const data = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        password: fd.get("password"),
      }),
    });
    setLoggedIn(data.name);
    authModal.classList.add("hidden");
    event.target.reset();
  } catch (error) {
    msg.className = "form-msg error";
    msg.textContent = error.message;
  }
});

function setLoggedIn(name) {
  state.loggedIn = true;
  state.userName = name;
  document.getElementById("userGreeting").classList.remove("hidden");
  document.getElementById("userNameLabel").textContent = name;
  const avatar = document.getElementById("dashboardAvatar");
  if (avatar) avatar.textContent = String(name || "TN").split(/\s+/).map(x => x[0]).join("").slice(0,2).toUpperCase();
  document.getElementById("logoutBtn").classList.remove("hidden");
  document.getElementById("myBookingsBtn").classList.remove("hidden");
  document.getElementById("loginBtn").classList.add("hidden");
  document.getElementById("signupBtn").classList.add("hidden");
}

function setLoggedOut() {
  state.loggedIn = false;
  state.userName = "";
  document.getElementById("userGreeting").classList.add("hidden");
  document.getElementById("logoutBtn").classList.add("hidden");
  document.getElementById("myBookingsBtn").classList.add("hidden");
  document.getElementById("loginBtn").classList.remove("hidden");
  document.getElementById("signupBtn").classList.remove("hidden");
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
  } finally {
    setLoggedOut();
    const screen = document.getElementById("logoutScreen");
    screen?.classList.remove("hidden");
    setTimeout(() => screen?.classList.add("hidden"), 1500);
  }
});

(async function checkSession() {
  try {
    const data = await api("/api/me");
    if (data.logged_in) setLoggedIn(data.name);
  } catch (_) {}
})();

// -------------------- booking --------------------
const bookModal = document.getElementById("bookModal");

document.getElementById("closeBookModal").addEventListener("click", () => {
  bookModal.classList.add("hidden");
  document.getElementById("bookingEntryView").classList.remove("hidden");
  document.getElementById("bookingSuccessView").classList.add("hidden");
});
document.getElementById("ticketDoneBtn")?.addEventListener("click", () => {
  bookModal.classList.add("hidden");
  document.getElementById("bookingEntryView").classList.remove("hidden");
  document.getElementById("bookingSuccessView").classList.add("hidden");
});
document.getElementById("ticketBookingsBtn")?.addEventListener("click", async () => {
  bookModal.classList.add("hidden");
  document.getElementById("bookingEntryView").classList.remove("hidden");
  document.getElementById("bookingSuccessView").classList.add("hidden");
  await loadBookings();
});

window.openBooking = function (type, id, price, label) {
  if (!state.loggedIn) {
    showAuthModal("login");
    return;
  }

  state.pendingBooking = {
    type,
    item_id: id,
    price,
    label,
    checkin: state.searchExtra?.checkin || "",
    checkout: state.searchExtra?.checkout || "",
  };

  const summary = document.getElementById("bookSummary");
  summary.innerHTML = `<strong>${escapeHtml(label)}</strong><br>${fmtMoney(price)} ${type === "hotel" ? "per night" : ""}`;

  if (type === "hotel") {
    summary.innerHTML += `<br><small>${formatDate(state.pendingBooking.checkin)} → ${formatDate(state.pendingBooking.checkout)}</small>`;
  }

  document.getElementById("bookMsg").textContent = "";
  document.getElementById("bookMsg").className = "form-msg";
  document.getElementById("bookingEntryView").classList.remove("hidden");
  document.getElementById("bookingSuccessView").classList.add("hidden");
  bookModal.classList.remove("hidden");
};

document.getElementById("bookForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const msg = document.getElementById("bookMsg");
  const pending = state.pendingBooking;

  if (!pending) return;

  msg.className = "form-msg";
  msg.textContent = "Processing booking...";

  try {
    const payload = {
      type: pending.type,
      item_id: pending.item_id,
      passenger_name: fd.get("passenger_name"),
    };

    if (pending.type === "hotel") {
      payload.checkin = pending.checkin;
      payload.checkout = pending.checkout;
    }

    const data = await api("/api/book", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    msg.textContent = "";
    event.target.reset();

    const pendingLabel = pending.label || "TripNest journey";
    document.getElementById("bookingEntryView").classList.add("hidden");
    document.getElementById("bookingSuccessView").classList.remove("hidden");
    document.getElementById("ticketRef").textContent = data.booking_ref || "Confirmed";
    document.getElementById("ticketPassenger").textContent = fd.get("passenger_name") || "Passenger";
    document.getElementById("ticketPrice").textContent = fmtMoney(data.total_price);
    document.getElementById("ticketRoute").textContent = pendingLabel;

    let ticketDate = "Travel date";
    if (pending.type === "hotel" && pending.checkin) {
      ticketDate = `${formatDate(pending.checkin)} → ${formatDate(pending.checkout)}`;
    } else if (state.lastResults?.length) {
      const match = state.lastResults.find(x => Number(x.id) === Number(pending.item_id));
      if (match?.travel_date) ticketDate = formatDate(match.travel_date);
    }
    document.getElementById("ticketDate").textContent = ticketDate;
    state.pendingBooking = null;
  } catch (error) {
    msg.className = "form-msg error";
    msg.textContent = error.message;
  }
});

// -------------------- My bookings / cancellation --------------------
const bookingsModal = document.getElementById("bookingsModal");
document.getElementById("myBookingsBtn").addEventListener("click", loadBookings);
document.getElementById("closeBookingsModal").addEventListener("click", () => bookingsModal.classList.add("hidden"));

async function loadBookings() {
  if (!state.loggedIn) {
    showAuthModal("login");
    return;
  }

  bookingsModal.classList.remove("hidden");
  const list = document.getElementById("bookingsList");
  list.innerHTML = "<p>Loading...</p>";

  try {
    const data = await api("/api/my-bookings");
    if (!data.length) {
      list.innerHTML = "<p style='color:#667380'>No bookings yet.</p>";
      return;
    }

    list.innerHTML = data.map((booking) => {
      const type = String(booking.booking_type || "").toLowerCase();
      const icon = type === "flight" ? "✈" : type === "hotel" ? "🏨" : "🚌";
      const statusClass = booking.status === "confirmed" ? "confirmed" : "cancelled";
      return `
      <div class="booking-row dashboard-booking-card">
        <div class="booking-type-icon ${type}">${icon}</div>
        <div class="booking-row-main">
          <div class="booking-card-top"><span class="ref">${escapeHtml(booking.booking_ref)}</span><span class="booking-status ${statusClass}">${escapeHtml(booking.status)}</span></div>
          <div class="booking-item">${escapeHtml(booking.item_name)}</div>
          <div class="booking-meta">${escapeHtml(booking.passenger_name)} · ${escapeHtml(type.toUpperCase())}</div>
          ${booking.start_date ? `<div class="booking-meta">${formatDate(booking.start_date)}${booking.end_date ? ` → ${formatDate(booking.end_date)}` : ""}</div>` : ""}
          ${booking.checked_in ? `<div class="checked-badge">✓ Checked in</div>` : ""}
        </div>
        <div class="booking-row-side">
          <div class="booking-total">${fmtMoney(booking.total_price)}</div>
          ${booking.status === "confirmed" ? `<button class="btn-cancel cancel-booking" data-ref="${escapeHtml(booking.booking_ref)}">Cancel booking</button>` : ""}
        </div>
      </div>`;
    }).join("");

    document.querySelectorAll(".cancel-booking").forEach((button) => {
      button.addEventListener("click", () => cancelBooking(button.dataset.ref));
    });
  } catch (error) {
    list.innerHTML = `<p style='color:#E8532F'>${escapeHtml(error.message)}</p>`;
  }
}

async function cancelBooking(bookingRef) {
  if (!confirm(`Cancel booking ${bookingRef}?`)) return;

  try {
    await api("/api/cancel-booking", {
      method: "POST",
      body: JSON.stringify({ booking_ref: bookingRef }),
    });
    await loadBookings();
  } catch (error) {
    alert(error.message);
  }
}

// -------------------- Check-in / Flight status --------------------
const infoModal = document.getElementById("infoModal");
const checkinPanel = document.getElementById("checkinPanel");
const statusPanel = document.getElementById("statusPanel");

document.getElementById("closeInfoModal").addEventListener("click", () => infoModal.classList.add("hidden"));

function openInfoModal(mode) {
  infoModal.classList.remove("hidden");
  checkinPanel.classList.toggle("hidden", mode !== "checkin");
  statusPanel.classList.toggle("hidden", mode !== "status");
  document.getElementById("checkinMsg").textContent = "";
  document.getElementById("statusMsg").textContent = "";
  document.getElementById("statusResult").classList.add("hidden");
}

document.getElementById("checkinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const msg = document.getElementById("checkinMsg");
  msg.className = "form-msg";

  try {
    const data = await api("/api/check-in", {
      method: "POST",
      body: JSON.stringify({ booking_ref: fd.get("booking_ref") }),
    });
    msg.className = "form-msg success";
    msg.textContent = data.message;
    event.target.reset();
  } catch (error) {
    msg.className = "form-msg error";
    msg.textContent = error.message;
  }
});

document.getElementById("statusForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const msg = document.getElementById("statusMsg");
  const result = document.getElementById("statusResult");
  msg.className = "form-msg";
  result.classList.add("hidden");

  const params = new URLSearchParams({ flight_number: fd.get("flight_number") });
  if (fd.get("travel_date")) params.set("travel_date", fd.get("travel_date"));

  try {
    const data = await api(`/api/flight-status?${params}`);
    result.classList.remove("hidden");
    result.innerHTML = `
      <strong>${escapeHtml(data.airline)} ${escapeHtml(data.flight_number)}</strong>
      <span class="status-badge">${escapeHtml(data.status)}</span>
      <div>${escapeHtml(data.origin)} → ${escapeHtml(data.destination)}</div>
      <div>${formatDate(data.travel_date)} · ${data.departure_time} → ${data.arrival_time}</div>`;
  } catch (error) {
    msg.className = "form-msg error";
    msg.textContent = error.message;
  }
});

// -------------------- close modals on backdrop --------------------
[authModal, bookModal, bookingsModal, infoModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.add("hidden");
  });
});

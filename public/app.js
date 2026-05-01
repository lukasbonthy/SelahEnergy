
const state = {
  products: [],
  config: {},
  cart: JSON.parse(localStorage.getItem("selahEnergyCart") || "[]"),
  activeProduct: "preachin-peach"
};

const $ = (selector) => document.querySelector(selector);

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function saveCart() {
  localStorage.setItem("selahEnergyCart", JSON.stringify(state.cart));
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
}

function productById(id) {
  return state.products.find((p) => p.id === id);
}

function packById(product, packId) {
  return product.packs.find((p) => p.id === packId);
}

function setHero(productId) {
  const product = productById(productId);
  if (!product) return;

  state.activeProduct = productId;
  $("#heroImage").src = product.frontBackImage;
  $("#heroImage").alt = product.name;
  $("#heroName").textContent = product.name;
  $("#heroVerse").textContent = product.verse;
  $("#heroTaste").textContent = product.taste || product.vibe;
  document.documentElement.style.setProperty("--active-glow", product.glow || product.accent);
}

function addToCart(productId, packId, qty = 1) {
  const product = productById(productId);
  const pack = packById(product, packId);
  const existing = state.cart.find((i) => i.productId === productId && i.packId === packId);

  if (existing) existing.qty += qty;
  else state.cart.push({ productId, packId, qty });

  saveCart();
  renderCart();
  setHero(productId);
  toast(`${pack.label} ${product.short || product.name} added`);
}

function quickBundle(type) {
  if (!state.products.length) return;

  if (type === "sampler") {
    state.products.forEach((p) => addToCart(p.id, "single", 1));
    toast("3-can flavor flight added");
  }

  if (type === "share") {
    addToCart("preachin-peach", "six", 1);
    toast("6-pack share drop added");
  }

  if (type === "case") {
    addToCart(state.activeProduct || "preachin-peach", "twelve", 1);
    toast("12-pack case added");
  }

  openCart();
}

function changeQty(productId, packId, delta) {
  const item = state.cart.find((i) => i.productId === productId && i.packId === packId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((i) => !(i.productId === productId && i.packId === packId));
  }
  saveCart();
  renderCart();
}

function cartTotals() {
  let subtotal = 0;
  let cans = 0;

  for (const item of state.cart) {
    const product = productById(item.productId);
    if (!product) continue;
    const pack = packById(product, item.packId);
    if (!pack) continue;
    subtotal += pack.price * item.qty;
    cans += pack.cans * item.qty;
  }

  const method = $("#deliveryMethod")?.value || "pickup";
  const deliveryFee = method === "pickup" || subtotal === 0 || subtotal >= (state.config.freeDeliveryAt || 4800)
    ? 0
    : (state.config.deliveryFee || 500);

  return { subtotal, deliveryFee, total: subtotal + deliveryFee, cans };
}

function renderProducts() {
  const grid = $("#productGrid");
  grid.innerHTML = "";

  state.products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card p-4";
    card.style.setProperty("--accent", product.accent);

    card.innerHTML = `
      <div class="relative z-10">
        <button class="product-image-wrap block w-full" type="button" data-hero="${product.id}">
          <img src="${product.canImage}" alt="${product.name}" class="aspect-square w-full object-cover" />
          <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <span class="rounded-full bg-white px-3 py-1 text-xs font-black text-black">${product.badge}</span>
            <span class="rounded-full bg-black/50 px-3 py-1 text-xs font-black text-white backdrop-blur-xl">${product.verse}</span>
          </div>
        </button>

        <div class="p-2 pt-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[.18em] text-white/45">${product.taste}</p>
              <h3 class="mt-1 text-3xl font-black tracking-[-.05em]">${product.name}</h3>
            </div>
            <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-black">12oz</span>
          </div>

          <p class="mt-3 min-h-[56px] text-sm leading-6 text-white/58">${product.vibe}</p>

          <div class="mt-5 grid gap-2" data-pack-group="${product.id}">
            ${product.packs.map((pack, packIndex) => `
              <button class="pack-btn ${packIndex === 0 ? "active" : ""}" type="button" data-product="${product.id}" data-pack="${pack.id}">
                <span class="flex items-center justify-between gap-3">
                  <span>
                    <span class="block text-sm font-black">${pack.label}</span>
                    <span class="block text-xs text-white/42">${pack.cans} can${pack.cans > 1 ? "s" : ""} • ${pack.tag || ""}</span>
                  </span>
                  <span class="text-right">
                    <span class="block text-lg font-black">${money(pack.price)}</span>
                    ${pack.compareAt ? `<span class="block text-xs text-white/35 line-through">${money(pack.compareAt)}</span>` : ""}
                  </span>
                </span>
              </button>
            `).join("")}
          </div>

          <button class="mt-4 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[.16em] text-black transition hover:scale-[1.01]" data-add="${product.id}">
            Add to cart
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  document.querySelectorAll(".pack-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest("[data-pack-group]");
      group.querySelectorAll(".pack-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setHero(btn.dataset.product);
    });
  });

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const productId = btn.dataset.add;
      const selected = document.querySelector(`[data-pack-group="${productId}"] .pack-btn.active`);
      addToCart(productId, selected.dataset.pack, 1);
      openCart();
    });
  });

  document.querySelectorAll("[data-hero]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setHero(btn.dataset.hero);
      toast(`${productById(btn.dataset.hero).name} previewed`);
    });
  });
}

function cartLineHtml(item) {
  const product = productById(item.productId);
  if (!product) return "";
  const pack = packById(product, item.packId);
  if (!pack) return "";

  return `
    <div class="cart-line">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="font-black">${product.name}</div>
          <div class="mt-1 text-sm text-white/48">${pack.label} • ${money(pack.price)} each</div>
        </div>
        <div class="text-right font-black">${money(pack.price * item.qty)}</div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <div class="text-xs text-white/42">${pack.cans * item.qty} total can${pack.cans * item.qty === 1 ? "" : "s"}</div>
        <div class="flex items-center gap-2">
          <button class="qty-btn" onclick="changeQty('${item.productId}', '${item.packId}', -1)">−</button>
          <span class="w-7 text-center font-black">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.productId}', '${item.packId}', 1)">+</button>
        </div>
      </div>
    </div>
  `;
}

function renderCart() {
  const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const totals = cartTotals();

  $("#cartCount").textContent = count;
  $("#drawerSubtotal").textContent = money(totals.subtotal);
  $("#drawerTotal").textContent = money(totals.total);
  $("#checkoutSubtotal").textContent = money(totals.subtotal);
  $("#checkoutDelivery").textContent = money(totals.deliveryFee);
  $("#checkoutTotal").textContent = money(totals.total);

  const freeAt = state.config.freeDeliveryAt || 4800;
  const remaining = Math.max(0, freeAt - totals.subtotal);
  const hint = $("#freeDeliveryHint");
  if (hint) {
    hint.textContent = totals.subtotal === 0
      ? "Add something to start your drop."
      : remaining > 0
        ? `${money(remaining)} away from free local delivery.`
        : "Free local delivery unlocked.";
  }

  const empty = `<div class="rounded-2xl border border-white/10 bg-white/[.05] p-5 text-white/50">Your cart is empty. Add a flavor above.</div>`;
  $("#drawerItems").innerHTML = state.cart.length ? state.cart.map(cartLineHtml).join("") : empty;
  $("#checkoutCart").innerHTML = state.cart.length ? state.cart.map(cartLineHtml).join("") : empty;
}

function openCart() {
  $("#cartDrawer").classList.remove("translate-x-full");
}

function closeCart() {
  $("#cartDrawer").classList.add("translate-x-full");
}

function startCountdown() {
  const key = "boldDropCountdownEnd";
  let end = Number(localStorage.getItem(key));
  const hours = state.config?.promo?.endsInHours || 36;

  if (!end || end < Date.now()) {
    end = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem(key, String(end));
  }

  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const h = String(Math.floor(left / 3600000)).padStart(2, "0");
    const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    const el = $("#countdown");
    if (el) el.textContent = `${h}:${m}:${s}`;
  };

  tick();
  setInterval(tick, 1000);
}


function showOrderTicket(data) {
  const existing = document.querySelector("#orderTicketModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "orderTicketModal";
  modal.className = "fixed inset-0 z-[120] grid place-items-center bg-black/80 px-4 backdrop-blur-xl";
  modal.innerHTML = `
    <div class="max-h-[92vh] w-full max-w-lg overflow-auto rounded-[2rem] border border-white/10 bg-[#09090d] p-5 shadow-2xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-black uppercase tracking-[.2em] text-orange-200/70">Pickup ticket</p>
          <h2 class="mt-1 text-3xl font-black tracking-[-.04em]">Order saved ✅</h2>
        </div>
        <button class="rounded-full border border-white/10 px-3 py-1 text-sm text-white/60" onclick="document.querySelector('#orderTicketModal').remove()">Close</button>
      </div>

      <div class="mt-5 rounded-3xl bg-white p-4">
        <img src="${data.qrDataUrl}" alt="Pickup QR code" class="mx-auto w-64 max-w-full" />
      </div>

      <div class="mt-5 rounded-3xl border border-white/10 bg-white/[.06] p-4">
        <div class="text-sm text-white/50">Order code</div>
        <div class="mt-1 select-all text-2xl font-black">${data.orderId}</div>
      </div>

      <div class="mt-4 rounded-3xl border border-orange-300/20 bg-orange-300/10 p-4 text-sm leading-6 text-white/75">
        Send <strong>${data.totals.displayTotal}</strong> on Cash App and put this exact order code in the note:
        <strong class="select-all">${data.cashappNote}</strong>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        ${data.paymentLinks.cashapp ? `<a href="${data.paymentLinks.cashapp}" target="_blank" rel="noopener noreferrer" class="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black uppercase tracking-[.16em] text-black">Open Cash App</a>` : ""}
        <a href="${data.pickupUrl}" target="_blank" rel="noopener noreferrer" class="rounded-2xl border border-white/10 bg-white/[.08] px-4 py-3 text-center text-sm font-black uppercase tracking-[.16em] text-white">Open ticket</a>
      </div>

      <p class="mt-4 text-xs leading-5 text-white/40">
        Bring this QR code to pickup. After it is scanned and marked delivered, it cannot be reused.
      </p>
    </div>
  `;
  document.body.appendChild(modal);
}

async function submitOrder(event) {
  event.preventDefault();

  if (!state.cart.length) {
    toast("Add at least one item first.");
    return;
  }

  const form = new FormData(event.currentTarget);
  const payload = {
    customer: {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      deliveryMethod: form.get("deliveryMethod"),
      address: form.get("address") || "",
      city: form.get("city") || "",
      state: form.get("state") || "",
      zip: form.get("zip") || "",
      notes: form.get("notes") || ""
    },
    paymentMethod: form.get("paymentMethod"),
    items: state.cart
  };

  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Submitting...";

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Order failed.");

    state.cart = [];
    saveCart();
    renderCart();
    event.currentTarget.reset();

    showOrderTicket(data);
    toast(`Order ${data.orderId} saved.`);
  } catch (err) {
    toast(err.message || "Something went wrong.");
  } finally {
    button.disabled = false;
    button.textContent = "Submit order";
  }
}

async function init() {
  const res = await fetch("/api/products");
  const data = await res.json();
  state.products = data.products;
  state.config = data.config;

  $("#year").textContent = new Date().getFullYear();

  renderProducts();
  setHero(state.products[0]?.id);
  renderCart();
  startCountdown();

  $("#deliveryMethod").addEventListener("change", (event) => {
    const show = event.target.value !== "pickup";
    $("#addressFields").classList.toggle("hidden", !show);
    renderCart();
  });

  $("#orderForm").addEventListener("submit", submitOrder);
}

init();

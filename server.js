require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const Database = require("better-sqlite3");
const { nanoid } = require("nanoid");
const { z } = require("zod");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

const db = new Database(path.join(__dirname, "data", "orders.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  payment_method TEXT NOT NULL,
  items TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);
`);

const products = [
  {
    id: "preachin-peach",
    name: "Preachin' Peach",
    short: "Peach",
    verse: "Romans 10:14",
    badge: "Smooth seller",
    vibe: "Bright peach with a clean, easy finish. The safest first pick for most people.",
    taste: "Sweet peach · soft citrus · smooth finish",
    accent: "#ff7a55",
    glow: "rgba(255,122,85,.42)",
    darkAccent: "#9d3a21",
    canImage: "/img/preachin-peach-fruit.jpg",
    frontBackImage: "/img/preachin-peach-front-back.jpg",
    packs: [
      { id: "single", label: "1 can", cans: 1, price: 300, compareAt: 399, tag: "Try it" },
      { id: "six", label: "6-pack", cans: 6, price: 1700, compareAt: 2394, tag: "Save $1" },
      { id: "twelve", label: "12-pack case", cans: 12, price: 3200, compareAt: 4788, tag: "Best stock-up" }
    ]
  },
  {
    id: "mighty-mango",
    name: "Mighty Mango",
    short: "Mango",
    verse: "Philippians 4:13",
    badge: "Tropical",
    vibe: "Bold mango flavor with a tropical feel and bright orange look.",
    taste: "Mango · tropical fruit · bold finish",
    accent: "#ff9a22",
    glow: "rgba(255,154,34,.42)",
    darkAccent: "#9c4b00",
    canImage: "/img/mighty-mango-fruit.jpg",
    frontBackImage: "/img/mighty-mango-front-back.webp",
    packs: [
      { id: "single", label: "1 can", cans: 1, price: 300, compareAt: 399, tag: "Try it" },
      { id: "six", label: "6-pack", cans: 6, price: 1700, compareAt: 2394, tag: "Save $1" },
      { id: "twelve", label: "12-pack case", cans: 12, price: 3200, compareAt: 4788, tag: "Best stock-up" }
    ]
  },
  {
    id: "blessed-berry",
    name: "Blessed Berry",
    short: "Berry",
    verse: "Matthew 5:8",
    badge: "Fan favorite",
    vibe: "A purple-blue berry wave that feels the most unique in the lineup.",
    taste: "Mixed berry · cool finish · purple wave",
    accent: "#8f5cff",
    glow: "rgba(143,92,255,.42)",
    darkAccent: "#3d1c83",
    canImage: "/img/blessed-berry-front-back.webp",
    frontBackImage: "/img/blessed-berry-front-back.webp",
    packs: [
      { id: "single", label: "1 can", cans: 1, price: 300, compareAt: 399, tag: "Try it" },
      { id: "six", label: "6-pack", cans: 6, price: 1700, compareAt: 2394, tag: "Save $1" },
      { id: "twelve", label: "12-pack case", cans: 12, price: 3200, compareAt: 4788, tag: "Best stock-up" }
    ]
  }
];

const config = {
  storeName: "Bold Drop",
  officialDisclaimer: "Independent reseller. Not the official Agape Energy website.",
  pickupText: "Local pickup + delivery available. Shipping available after confirmation.",
  cashapp: process.env.CASHAPP_LINK || "",
  venmo: process.env.VENMO_LINK || "",
  stripe: process.env.STRIPE_PAYMENT_LINK || "",
  deliveryFee: 500,
  freeDeliveryAt: 4800,
  caffeineNotice: "Energy drinks may contain caffeine. Check the product label before drinking. Not recommended for kids, pregnancy, or caffeine-sensitive people.",
  promo: {
    title: "Launch Drop",
    detail: "Singles at $3. Six-packs and cases save more.",
    endsInHours: 36
  }
};

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function findPack(productId, packId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  const pack = product.packs.find((p) => p.id === packId);
  if (!pack) return null;
  return { product, pack };
}

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/products", (req, res) => {
  res.json({ products, config });
});

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email().max(120),
    phone: z.string().min(7).max(30),
    deliveryMethod: z.enum(["pickup", "local-delivery", "shipping"]),
    address: z.string().max(160).optional().default(""),
    city: z.string().max(80).optional().default(""),
    state: z.string().max(30).optional().default(""),
    zip: z.string().max(20).optional().default(""),
    notes: z.string().max(500).optional().default("")
  }),
  paymentMethod: z.enum(["cashapp", "venmo", "cash", "card-later"]),
  items: z.array(z.object({
    productId: z.string(),
    packId: z.string(),
    qty: z.number().int().min(1).max(99)
  })).min(1)
});

app.post("/api/orders", (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please check the order form.", details: parsed.error.flatten() });
  }

  const { customer, items, paymentMethod } = parsed.data;

  let subtotal = 0;
  let totalCans = 0;
  const normalizedItems = [];

  for (const item of items) {
    const match = findPack(item.productId, item.packId);
    if (!match) {
      return res.status(400).json({ error: "One of the selected products is unavailable." });
    }
    const lineTotal = match.pack.price * item.qty;
    subtotal += lineTotal;
    totalCans += match.pack.cans * item.qty;
    normalizedItems.push({
      productId: match.product.id,
      productName: match.product.name,
      packId: match.pack.id,
      packLabel: match.pack.label,
      cans: match.pack.cans,
      qty: item.qty,
      unitPrice: match.pack.price,
      lineTotal
    });
  }

  const deliveryFee = customer.deliveryMethod === "pickup" || subtotal >= config.freeDeliveryAt ? 0 : config.deliveryFee;
  const total = subtotal + deliveryFee;
  const id = `BD-${nanoid(8).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO orders (
      id, created_at, customer_name, email, phone, delivery_method,
      address, city, state, zip, notes, payment_method, items,
      subtotal, delivery_fee, total, status
    ) VALUES (
      @id, @createdAt, @name, @email, @phone, @deliveryMethod,
      @address, @city, @state, @zip, @notes, @paymentMethod, @items,
      @subtotal, @deliveryFee, @total, 'new'
    )
  `).run({
    id,
    createdAt,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    deliveryMethod: customer.deliveryMethod,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    notes: customer.notes,
    paymentMethod,
    items: JSON.stringify(normalizedItems),
    subtotal,
    deliveryFee,
    total
  });

  const paymentLinks = {
    cashapp: config.cashapp,
    venmo: config.venmo,
    card: config.stripe
  };

  res.status(201).json({
    ok: true,
    orderId: id,
    totals: {
      subtotal,
      deliveryFee,
      total,
      totalCans,
      displaySubtotal: money(subtotal),
      displayDeliveryFee: money(deliveryFee),
      displayTotal: money(total)
    },
    paymentLinks,
    message: "Order saved. Confirm payment or delivery with the customer."
  });
});

app.get("/api/admin/orders", (req, res) => {
  if (req.query.pin !== ADMIN_PIN) {
    return res.status(401).json({ error: "Wrong admin PIN." });
  }

  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 250").all();
  res.json({
    orders: rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items),
      displaySubtotal: money(row.subtotal),
      displayDeliveryFee: money(row.delivery_fee),
      displayTotal: money(row.total)
    }))
  });
});

app.patch("/api/admin/orders/:id", (req, res) => {
  if (req.query.pin !== ADMIN_PIN) {
    return res.status(401).json({ error: "Wrong admin PIN." });
  }

  const status = String(req.body.status || "");
  const allowed = ["new", "confirmed", "packed", "delivered", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true, changed: result.changes });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Bold Drop running on http://localhost:${PORT}`);
});

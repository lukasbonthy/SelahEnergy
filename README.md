# Bold Drop — Independent Reseller Website

This is a premium Node.js + Express storefront for selling/reselling Agape Energy-style cans.

Important: this site is written as an independent reseller page, not an official brand site. Only use Agape names/photos/logos if you have permission or reseller/affiliate approval.

## Features

- High-converting mobile-first landing page
- Flavor cards for Preachin' Peach, Mighty Mango, and Blessed Berry
- Cart with singles, 6-packs, and 12-pack cases
- Pickup, local delivery, or shipping request
- Order form saves to SQLite
- Admin page to view/update orders
- Cash App, Venmo, or card-link placeholders

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

```txt
http://localhost:3000
```

Admin:

```txt
http://localhost:3000/admin.html?pin=1234
```

Change `ADMIN_PIN` inside `.env`.

## Change prices

Open `server.js` and edit the `products` array. Prices are in cents.

Example:

```js
{ id: "single", label: "1 can", cans: 1, price: 300 }
```

`300` = `$3.00`.

## Payment links

Inside `.env`, add:

```txt
CASHAPP_LINK=https://cash.app/$YourCashTag
VENMO_LINK=https://venmo.com/u/YourVenmo
STRIPE_PAYMENT_LINK=https://buy.stripe.com/your-link
```

## Deploy to Render

1. Upload this project to GitHub.
2. Create a new Render Web Service.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `.env.example`.

SQLite works for small local/simple use. For a serious store, use Postgres and real Stripe Checkout.


## V2 polish added

This version was redesigned to feel more like a premium drink drop page:

- Better hero section with phone-style product preview
- Animated launch strip and countdown
- Product cards with flavor badges and compare-at pricing
- Bundle builder for faster buying decisions
- Free-delivery progress hint
- Mobile sticky order bar
- Reviews/social proof section
- FAQ section to reduce DMs
- Clear caffeine/reseller disclaimer

Good inspiration style to look at later:
- Liquid Death: bold attitude + simple product focus
- Prime / Celsius style pages: bright product visuals + quick bundles
- Apple-style landing pages: big spacing, huge type, premium motion
- Shopify drink brands: sticky cart, simple packs, clear CTA

Keep it accurate: do not claim to be official Agape unless they approve it.

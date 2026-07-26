# Nari's Wear — Online Boutique

Women's fashion boutique in Algiers, selling online with WhatsApp checkout and cash/card on delivery.

**Live site:** https://nari-s-wear-online-boutique.onrender.com

---

## ✨ Features

- **Bilingual storefront** — French and Arabic, with full right-to-left layout when Arabic is selected
- **Product catalog** — categories, search, sort, color variants with per-color (and optional per-size) stock, automatic gallery switching per color
- **Delivery cost calculator** — home delivery vs. Yalidine stopdesk pricing, calculated live for all 58 wilayas
- **WhatsApp checkout** — no online payment integration needed; orders are confirmed as a pre-filled WhatsApp message, and cash/card on delivery is handled in person
- **Order storage** — every order is also saved to Supabase, independent of WhatsApp, so nothing is lost if a customer doesn't send the message
- **Secure admin dashboard** (`/admin`) — manage products, stock, photos, and orders; protected by Supabase Authentication *and* a database-level admin allowlist, so knowing the URL alone grants no access
- **FAQ accordion** — delivery times, exchange policy, payment, store location
- **Embedded store map** — with an animated pin and a direct "Open in Google Maps" link
- **Customer reviews, Instagram gallery, and light/dark theme toggle**
- **Mobile-first, responsive** throughout

## 🧱 Tech stack

- Plain HTML, CSS, and JavaScript — no framework, no build step
- [Supabase](https://supabase.com) for the database, authentication, and image storage
- Hosted on [Render](https://render.com) as a static site (GitHub Pages also works, see below)

## 📂 Project structure

```
index.html                       Storefront (catalog, cart-free checkout, FAQ, map, reviews...)
admin.html                       Redirects to /admin/ (kept for old bookmarks/links)
admin/index.html                 Admin dashboard (products, stock, orders)
config.js                        Supabase project URL, public API key, WhatsApp number
assets/                          Logo, favicon, hero and brand images
supabase-setup.sql               Core schema: products & orders tables, public read/insert policies
supabase-admin-policies.sql      Lets an authenticated admin manage products and see orders
product-variants-migration.sql   Adds per-color variants (stock, images, optional per-size stock)
admin-security-migration.sql     Restricts admin access to an explicit allowlist (admin_users table)
```

## 🚀 Setup (Supabase)

Run the SQL files in **this exact order**, in the Supabase SQL Editor:

1. `supabase-setup.sql` — creates the core tables
2. `supabase-admin-policies.sql` — grants admin permissions to logged-in users
3. `product-variants-migration.sql` — adds color/size variant support
4. `admin-security-migration.sql` — **open this file first and replace `YOUR_ADMIN_EMAIL@example.com`** with the real admin email, *then* run it

Then, still in Supabase:

- **Authentication → Users → Add user** — create the admin's email + password (this is the dashboard login, separate from any Supabase account login)
- **Authentication → Sign In / Providers → Email** — turn **off** "Allow new users to sign up," so no one else can self-register
- **Settings → API Keys** — copy the **Project URL** and the **Publishable** (anon) key into `config.js`:

```js
window.NARIS_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabaseAnonKey: "YOUR-PUBLISHABLE-KEY",
  whatsapp: "213XXXXXXXXX"
};
```

The publishable/anon key is safe to commit — it only allows what the SQL policies above explicitly permit.

## 🌐 Deployment

**Render (current host):**
- New → Static Site → connect this repo
- Build Command: *(leave empty)*
- Publish Directory: `./`
- Add a custom domain under Settings → Custom Domains once ready

**GitHub Pages (alternative):**
- Settings → Pages → Deploy from branch `main`, folder `/ (root)`

Either way, no build step is required — it's static files served as-is.

## 🔐 Admin dashboard

- URL: `/admin/` (visiting the old `/admin.html` redirects here automatically)
- Access requires **two** independent checks: a valid Supabase Authentication login, *and* that user's ID being present in the `admin_users` table with role `admin`. The database enforces this directly (Row Level Security), so it can't be bypassed from the frontend even by someone who finds the URL.

## 📦 Delivery pricing

Yalidine home/stopdesk rates for all 58 wilayas are defined directly in `index.html`. If rates change, update the `SHIPPING` table near the top of the script section — no database migration needed for that.

## 📝 License

MIT — see `LICENSE`.

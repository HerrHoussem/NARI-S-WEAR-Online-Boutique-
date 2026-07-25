# NARI'S WEAR — Admin v3 setup

## New admin URL

After publishing to GitHub Pages:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/admin/`

The old `/admin.html` address redirects automatically to `/admin/`.

## Required security setup

1. In Supabase, open **Authentication → Users** and create your admin account.
2. Open `admin-security-migration.sql`.
3. Replace `YOUR_ADMIN_EMAIL@example.com` with the exact email of that account.
4. Paste the complete SQL into **Supabase SQL Editor** and run it.
5. In **Authentication → Providers → Email**, disable public user sign-up.

The dashboard now performs two checks:

- The visitor must successfully log in through Supabase Authentication.
- Their user ID must also exist in `admin_users` with role `admin`.

Knowing the `/admin/` URL is not enough to access products, stock, photos, or customer orders. Database Row Level Security independently blocks unauthorized accounts.

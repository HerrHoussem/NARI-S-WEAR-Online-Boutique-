# Admin dashboard repair

The repository now uses only the original root dashboard:

`/admin.html`

Fixes applied:

- Removed the conflicting `/admin/` folder
- Kept `admin.html` at repository root
- Corrected `config.js` path to `config.js`
- Corrected favicon path to `assets/favicon.svg`
- Corrected the Supabase CDN filename from `db.min.js` to `supabase.min.js`
- Avoided redeclaring the global `supabase` variable
- Added a website link pointing to `./admin.html`

Dashboard URL:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/admin.html`

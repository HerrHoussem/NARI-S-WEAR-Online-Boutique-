# Security Policy

## Reporting a vulnerability

Please do not disclose security vulnerabilities publicly. Contact the repository
owner privately with:

- the affected page or feature;
- clear reproduction steps;
- the expected and actual behavior;
- screenshots or logs with secrets removed.

## Secrets

Only the Supabase project URL and **publishable/anon key** may appear in
`config.js`. Never commit:

- Supabase secret or `service_role` keys;
- Telegram bot tokens or chat IDs;
- database passwords;
- private API keys;
- administrator passwords.

Store backend credentials in Supabase Edge Function secrets. If a secret is
ever committed, rotate it immediately—removing it from the latest commit is
not enough because Git history may still contain it.

## Access control

Database access is protected with Supabase Row Level Security. Administrative
permissions must use the `admin_users` allowlist created by
`supabase-admin-policies.sql`.

## Supported version

Security updates apply to the latest production version only.

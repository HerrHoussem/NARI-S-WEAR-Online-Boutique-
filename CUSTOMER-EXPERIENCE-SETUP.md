# NARI'S WEAR – Customer Experience Suite

## Required setup
1. Open Supabase → SQL Editor.
2. Run `customer-experience-migration.sql` once.
3. Replace the updated `index.html` and `admin/index.html` in the repository.

## Included
- Customers also liked recommendations
- Advanced visual filters (color, size, availability, maximum price)
- Photo reviews with admin approval
- Trending / Best Seller / New / Low-stock badges
- Promo codes managed from the admin dashboard
- Browser notifications for new orders while the admin dashboard is open
- Smart size and product assistant (local recommendation engine; no paid AI API required)
- Live support messages plus direct WhatsApp chat

## Browser notifications
The admin must press **Activer les notifications** and allow notifications. Notifications use Supabase Realtime and work while the admin dashboard is open. True background push when the site is fully closed requires a separate push provider and service worker backend.

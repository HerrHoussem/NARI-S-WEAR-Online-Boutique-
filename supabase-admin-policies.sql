-- ============================================================
-- NARI'S WEAR — Admin access patch (matches this repo's schema)
-- Run this in SQL Editor AFTER supabase-setup.sql has already been run.
-- Lets a logged-in (authenticated) admin manage products and orders.
-- Public site visitors still cannot do any of this.
-- ============================================================

-- PRODUCTS: authenticated user can create, edit, delete
drop policy if exists "authenticated can insert products" on public.products;
create policy "authenticated can insert products"
  on public.products for insert to authenticated
  with check (true);

drop policy if exists "authenticated can update products" on public.products;
create policy "authenticated can update products"
  on public.products for update to authenticated
  using (true);

drop policy if exists "authenticated can delete products" on public.products;
create policy "authenticated can delete products"
  on public.products for delete to authenticated
  using (true);

-- ORDERS: authenticated user can read all orders and update their status
drop policy if exists "authenticated can read orders" on public.orders;
create policy "authenticated can read orders"
  on public.orders for select to authenticated
  using (true);

drop policy if exists "authenticated can update orders" on public.orders;
create policy "authenticated can update orders"
  on public.orders for update to authenticated
  using (true);

-- STORAGE: authenticated user can upload/delete product photos
drop policy if exists "authenticated can upload product images" on storage.objects;
create policy "authenticated can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "authenticated can delete product images" on storage.objects;
create policy "authenticated can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images');

-- ============================================================
-- After running this, do two things manually in the dashboard:
--
-- 1. Create the admin account:
--    Authentication → Users → Add user → enter an email + password
--    (this is the login used for admin.html)
--
-- 2. Turn off public sign-ups so no one else can create an account:
--    Authentication → Sign In / Providers → Email → toggle OFF
--    "Allow new users to sign up"
-- ============================================================

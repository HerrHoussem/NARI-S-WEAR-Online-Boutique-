-- NARI'S WEAR — TRUE ADMIN-ONLY SECURITY
-- IMPORTANT: replace YOUR_ADMIN_EMAIL@example.com below with the exact email
-- of the Supabase Authentication user you created, then run the whole script.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin can read own role" on public.admin_users;
create policy "admin can read own role"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

-- Register your admin account. Change the email before running.
insert into public.admin_users (user_id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
on conflict (user_id) do update set email = excluded.email, role = 'admin';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
      and a.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Remove broad authenticated policies from older versions.
drop policy if exists "authenticated can insert products" on public.products;
drop policy if exists "authenticated can update products" on public.products;
drop policy if exists "authenticated can delete products" on public.products;
drop policy if exists "authenticated can read orders" on public.orders;
drop policy if exists "authenticated can update orders" on public.orders;
drop policy if exists "authenticated can upload product images" on storage.objects;
drop policy if exists "authenticated can delete product images" on storage.objects;

-- Products: only approved admins can create, update, or delete.
drop policy if exists "admins insert products" on public.products;
create policy "admins insert products"
on public.products for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins update products" on public.products;
create policy "admins update products"
on public.products for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete products" on public.products;
create policy "admins delete products"
on public.products for delete to authenticated
using (public.is_admin());

-- Orders: only approved admins can inspect or update orders.
drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders"
on public.orders for select to authenticated
using (public.is_admin());

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders"
on public.orders for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Product images: only approved admins can upload, update, or delete.
drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

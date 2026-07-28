-- NARI'S WEAR customer experience migration
create table if not exists public.product_reviews (
 id uuid primary key default gen_random_uuid(), product_id uuid null references public.products(id) on delete set null,
 customer_name text not null, rating int not null check (rating between 1 and 5), comment text not null,
 photo_url text, is_approved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.promo_codes (
 id uuid primary key default gen_random_uuid(), code text not null unique, discount_type text not null check(discount_type in ('percent','fixed')),
 discount_value numeric not null check(discount_value>0), min_order numeric not null default 0, is_active boolean not null default true,
 expires_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(), customer_name text not null, customer_phone text, message text not null,
 status text not null default 'new', created_at timestamptz not null default now()
);
alter table public.product_reviews enable row level security; alter table public.promo_codes enable row level security; alter table public.support_messages enable row level security;
drop policy if exists "public submit reviews" on public.product_reviews; create policy "public submit reviews" on public.product_reviews for insert to anon,authenticated with check (is_approved=false);
drop policy if exists "public read approved reviews" on public.product_reviews; create policy "public read approved reviews" on public.product_reviews for select to anon,authenticated using (is_approved=true or auth.uid() in (select user_id from public.admin_users where role='admin'));
drop policy if exists "admin manage reviews" on public.product_reviews; create policy "admin manage reviews" on public.product_reviews for all to authenticated using (auth.uid() in (select user_id from public.admin_users where role='admin')) with check (auth.uid() in (select user_id from public.admin_users where role='admin'));
drop policy if exists "public read active promos" on public.promo_codes; create policy "public read active promos" on public.promo_codes for select to anon,authenticated using (is_active=true);
drop policy if exists "admin manage promos" on public.promo_codes; create policy "admin manage promos" on public.promo_codes for all to authenticated using (auth.uid() in (select user_id from public.admin_users where role='admin')) with check (auth.uid() in (select user_id from public.admin_users where role='admin'));
drop policy if exists "public send support" on public.support_messages; create policy "public send support" on public.support_messages for insert to anon,authenticated with check (status='new');
drop policy if exists "admin manage support" on public.support_messages; create policy "admin manage support" on public.support_messages for all to authenticated using (auth.uid() in (select user_id from public.admin_users where role='admin')) with check (auth.uid() in (select user_id from public.admin_users where role='admin'));
insert into storage.buckets (id,name,public) values ('review-images','review-images',true) on conflict(id) do update set public=true;
drop policy if exists "public upload review images" on storage.objects; create policy "public upload review images" on storage.objects for insert to anon,authenticated with check (bucket_id='review-images');
drop policy if exists "public read review images" on storage.objects; create policy "public read review images" on storage.objects for select to public using (bucket_id='review-images');

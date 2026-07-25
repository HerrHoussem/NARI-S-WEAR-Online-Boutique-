-- NARI'S WEAR — enhanced Supabase setup (safe to re-run)
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  description text,
  sizes text[] not null default array['S','M','L','XL'],
  colors text[] not null default array['Noir'],
  variants jsonb not null default '[]'::jsonb,
  images text[] not null default array[]::text[],
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric(12,2) not null check (price >= 0),
  size text,
  color text,
  quantity integer not null default 1 check (quantity between 1 and 20),
  customer_name text not null,
  customer_phone text not null,
  wilaya text not null,
  status text not null default 'nouvelle'
    check (status in ('nouvelle','confirmee','expediee','livree','annulee')),
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists quantity integer not null default 1;

create index if not exists products_active_created_idx on public.products (is_active,created_at desc);
create index if not exists products_category_idx on public.products (category);
create index if not exists orders_status_created_idx on public.orders (status,created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products" on public.products
for select to anon,authenticated using (is_active=true);

drop policy if exists "public can insert orders" on public.orders;
create policy "public can insert orders" on public.orders
for insert to anon,authenticated with check (
  quantity between 1 and 20 and
  char_length(customer_name) between 2 and 120 and
  char_length(customer_phone) between 9 and 24
);

insert into storage.buckets(id,name,public)
values('product-images','product-images',true)
on conflict(id) do update set public=excluded.public;

drop policy if exists "public can view product images" on storage.objects;
create policy "public can view product images" on storage.objects
for select to anon,authenticated using(bucket_id='product-images');

insert into public.products(name,category,price,sizes,colors,images,featured,stock)
select * from (values
 ('Robe Ambre','robe',4500::numeric,array['S','M','L'],array['Noir','Beige'],array[]::text[],true,8),
 ('Tailleur Nuit','ensemble',6200::numeric,array['S','M','L','XL'],array['Noir'],array[]::text[],false,5),
 ('Abaya Lueur','abaya',5800::numeric,array['S','M','L','XL'],array['Noir','Bordeaux'],array[]::text[],true,6),
 ('Soie Dorée','chemisier',2900::numeric,array['S','M','L'],array['Beige','Bordeaux'],array[]::text[],false,10),
 ('Jupe Plissée','jupe',3400::numeric,array['S','M','L'],array['Noir','Beige'],array[]::text[],false,7),
 ('Manteau Sable','manteau',7500::numeric,array['M','L','XL'],array['Beige'],array[]::text[],true,4)
) seed(name,category,price,sizes,colors,images,featured,stock)
where not exists(select 1 from public.products);

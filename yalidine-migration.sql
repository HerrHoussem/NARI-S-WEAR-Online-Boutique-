-- NARI'S WEAR — Yalidine integration migration
-- Run this once in Supabase SQL Editor.

alter table public.orders add column if not exists commune text;
alter table public.orders add column if not exists address text;
alter table public.orders add column if not exists delivery_method text not null default 'home'
  check (delivery_method in ('home','stopdesk'));
alter table public.orders add column if not exists shipping_price numeric(12,2);
alter table public.orders add column if not exists stopdesk_id text;
alter table public.orders add column if not exists stopdesk_name text;
alter table public.orders add column if not exists yalidine_tracking text;
alter table public.orders add column if not exists yalidine_status text;
alter table public.orders add column if not exists yalidine_response jsonb;
alter table public.orders add column if not exists shipped_at timestamptz;

create index if not exists orders_yalidine_tracking_idx
on public.orders (yalidine_tracking)
where yalidine_tracking is not null;

-- Replace the public order insert policy so the new checkout fields are accepted safely.
drop policy if exists "public can insert orders" on public.orders;
create policy "public can insert orders"
on public.orders
for insert
to anon, authenticated
with check (
  quantity between 1 and 20
  and char_length(customer_name) between 2 and 120
  and char_length(customer_phone) between 9 and 24
  and char_length(wilaya) between 3 and 120
  and (commune is null or char_length(commune) between 2 and 120)
  and delivery_method in ('home','stopdesk')
  and (shipping_price is null or shipping_price >= 0)
);

-- NARI'S WEAR — product colors, per-color stock and image galleries
-- Run once in Supabase SQL Editor before using the new admin form.

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

comment on column public.products.variants is
'Array of product color variants: [{id,name,hex,stock,images,is_default}]';

-- Convert existing products into one or more variants without losing data.
update public.products p
set variants = coalesce((
  select jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', c.color_name,
    'hex', case lower(c.color_name)
      when 'noir' then '#000000'
      when 'blanc' then '#ffffff'
      when 'beige' then '#d8c3a5'
      when 'bordeaux' then '#6e1f31'
      when 'jaune' then '#e9c94c'
      else '#c9a15a' end,
    'stock', case when c.ordinality = 1 then p.stock else 0 end,
    'images', case when c.ordinality = 1 then to_jsonb(p.images) else '[]'::jsonb end,
    'is_default', c.ordinality = 1
  ) order by c.ordinality)
  from unnest(case when cardinality(p.colors)>0 then p.colors else array['Noir'] end)
       with ordinality as c(color_name, ordinality)
), '[]'::jsonb)
where jsonb_array_length(p.variants)=0;

-- Basic structure validation. Admin-only update policies still control who may edit.
alter table public.products drop constraint if exists products_variants_is_array;
alter table public.products add constraint products_variants_is_array
check (jsonb_typeof(variants)='array');

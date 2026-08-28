-- Radar Competitivo centrado en el producto propio.

create table if not exists business_competitive_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name varchar(180) not null,
  sku varchar(100),
  brand varchar(120),
  category varchar(120),
  description text,
  own_price numeric(14,2),
  currency varchar(12) not null default 'COP',
  unit_of_measure varchar(40) not null default 'unidad',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_competitive_products_name_check check (length(trim(name)) >= 2),
  constraint business_competitive_products_own_price_check check (own_price is null or own_price >= 0)
);

create unique index if not exists idx_business_competitive_products_business_id_id_unique
  on business_competitive_products(business_id, id);
create unique index if not exists idx_business_competitive_products_active_name_unique
  on business_competitive_products(business_id, lower(trim(name)))
  where is_active = true;
create unique index if not exists idx_business_competitive_products_active_sku_unique
  on business_competitive_products(business_id, lower(trim(sku)))
  where is_active = true and sku is not null and trim(sku) <> '';
create index if not exists idx_business_competitive_products_catalog
  on business_competitive_products(business_id, is_active, category, name);

alter table business_competitor_products
  add column if not exists competitive_product_id uuid;

with historical_products as (
  select distinct on (p.business_id, lower(trim(coalesce(nullif(p.own_product_name, ''), p.product_name))))
         p.business_id,
         trim(coalesce(nullif(p.own_product_name, ''), p.product_name)) as name,
         p.category,
         p.our_price,
         coalesce(nullif(p.currency, ''), 'COP') as currency,
         coalesce(nullif(p.unit_of_measure, ''), 'unidad') as unit_of_measure,
         p.created_by_user_id
  from business_competitor_products p
  where p.competitive_product_id is null
    and trim(coalesce(nullif(p.own_product_name, ''), p.product_name)) <> ''
  order by p.business_id,
           lower(trim(coalesce(nullif(p.own_product_name, ''), p.product_name))),
           p.updated_at desc
)
insert into business_competitive_products
  (business_id, name, category, own_price, currency, unit_of_measure, created_by_user_id, metadata)
select business_id, name, category, our_price, currency, unit_of_measure, created_by_user_id,
       jsonb_build_object('source', 'competitive_radar_product_center_backfill')
from historical_products
on conflict do nothing;

update business_competitor_products observation
set competitive_product_id = product.id,
    own_product_name = product.name,
    our_price = product.own_price,
    updated_at = now()
from business_competitive_products product
where observation.business_id = product.business_id
  and observation.competitive_product_id is null
  and lower(trim(coalesce(nullif(observation.own_product_name, ''), observation.product_name))) = lower(trim(product.name));

alter table business_competitor_products
  alter column competitive_product_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_products_business_product_fkey') then
    alter table business_competitor_products
      add constraint business_competitor_products_business_product_fkey
      foreign key (business_id, competitive_product_id)
      references business_competitive_products(business_id, id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_business_competitor_products_product_observations
  on business_competitor_products(business_id, competitive_product_id, is_active, observed_at desc);
create index if not exists idx_business_competitor_products_product_provider
  on business_competitor_products(business_id, competitive_product_id, competitor_id, observed_at desc);

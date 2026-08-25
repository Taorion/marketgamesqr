-- Product catalog taxonomy and pricing contract.
-- Internal IDs are scoped by business, while UUIDs remain implementation details.

create table if not exists business_product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  name text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_product_categories_name_check check (char_length(trim(name)) >= 2),
  constraint business_product_categories_internal_id_check check (char_length(trim(internal_id)) >= 2)
);

create unique index if not exists business_product_categories_business_internal_id_uidx
  on business_product_categories (business_id, lower(internal_id));

create unique index if not exists business_product_categories_business_name_uidx
  on business_product_categories (business_id, lower(name));

create index if not exists business_product_categories_business_name_idx
  on business_product_categories (business_id, name);

create table if not exists business_product_subcategories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references business_product_categories(id) on delete restrict,
  internal_id text not null,
  name text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_product_subcategories_name_check check (char_length(trim(name)) >= 2),
  constraint business_product_subcategories_internal_id_check check (char_length(trim(internal_id)) >= 2)
);

create unique index if not exists business_product_subcategories_business_internal_id_uidx
  on business_product_subcategories (business_id, lower(internal_id));

create unique index if not exists business_product_subcategories_business_category_name_uidx
  on business_product_subcategories (business_id, category_id, lower(name));

create index if not exists business_product_subcategories_business_category_idx
  on business_product_subcategories (business_id, category_id, name);

alter table business_inventory_products
  add column if not exists internal_id text,
  add column if not exists category_id uuid references business_product_categories(id) on delete restrict,
  add column if not exists subcategory_id uuid references business_product_subcategories(id) on delete restrict,
  add column if not exists tax_classification text,
  add column if not exists price_before_tax numeric(14, 2);

-- Existing records remain operable. Their pre-tax price is their historical sale price,
-- because they were created before tax was modelled separately.
update business_inventory_products
   set internal_id = coalesce(nullif(trim(internal_id), ''), 'PRD-' || replace(id::text, '-', '')),
       tax_classification = coalesce(nullif(tax_classification, ''), 'EXEMPT'),
       price_before_tax = coalesce(price_before_tax, unit_price, 0);

insert into business_product_categories (business_id, internal_id, name)
select distinct on (business_id, lower(trim(category)))
       business_id,
       'CAT-' || upper(substr(md5(business_id::text || '|' || lower(trim(category))), 1, 12)),
       trim(category)
  from business_inventory_products
 where nullif(trim(category), '') is not null
 order by business_id, lower(trim(category)), updated_at asc
on conflict do nothing;

update business_inventory_products product
   set category_id = category.id
  from business_product_categories category
 where product.business_id = category.business_id
   and product.category_id is null
   and lower(trim(coalesce(product.category, ''))) = lower(trim(category.name));

alter table business_inventory_products
  alter column internal_id set not null,
  alter column tax_classification set default 'EXEMPT',
  alter column tax_classification set not null,
  alter column price_before_tax set default 0,
  alter column price_before_tax set not null;

alter table business_inventory_products
  drop constraint if exists business_inventory_products_tax_classification_check;

alter table business_inventory_products
  add constraint business_inventory_products_tax_classification_check
  check (tax_classification in ('EXEMPT', 'VAT_0', 'VAT_5', 'VAT_11', 'VAT_19'));

create unique index if not exists business_inventory_products_business_internal_id_uidx
  on business_inventory_products (business_id, lower(internal_id));

create index if not exists business_inventory_products_business_category_status_idx
  on business_inventory_products (business_id, category_id, status, updated_at desc);

create index if not exists business_inventory_products_business_subcategory_status_idx
  on business_inventory_products (business_id, subcategory_id, status, updated_at desc);

drop trigger if exists trg_business_product_categories_updated_at on business_product_categories;
create trigger trg_business_product_categories_updated_at
before update on business_product_categories
for each row execute function set_updated_at();

drop trigger if exists trg_business_product_subcategories_updated_at on business_product_subcategories;
create trigger trg_business_product_subcategories_updated_at
before update on business_product_subcategories
for each row execute function set_updated_at();

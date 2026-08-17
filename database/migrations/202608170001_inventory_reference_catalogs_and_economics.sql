-- Product reference catalogs and commercial economics.
-- All records are tenant-scoped; products retain their user-provided internal ID.

create table if not exists business_product_brands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  name text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_product_brands_name_check check (char_length(trim(name)) >= 2),
  constraint business_product_brands_internal_id_check check (char_length(trim(internal_id)) >= 2)
);

create table if not exists business_product_units (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  name text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_product_units_name_check check (char_length(trim(name)) >= 2),
  constraint business_product_units_internal_id_check check (char_length(trim(internal_id)) >= 2)
);

create table if not exists business_product_tax_bases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  name text not null,
  rate numeric(7,4) not null default 0 check (rate between 0 and 1),
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_product_tax_bases_name_check check (char_length(trim(name)) >= 2),
  constraint business_product_tax_bases_internal_id_check check (char_length(trim(internal_id)) >= 2)
);

create table if not exists business_product_healthy_taxes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  name text not null,
  rate numeric(7,4) not null default 0 check (rate between 0 and 1),
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_product_healthy_taxes_name_check check (char_length(trim(name)) >= 2),
  constraint business_product_healthy_taxes_internal_id_check check (char_length(trim(internal_id)) >= 2)
);

create unique index if not exists business_product_brands_business_internal_id_uidx on business_product_brands (business_id, lower(internal_id));
create unique index if not exists business_product_brands_business_name_uidx on business_product_brands (business_id, lower(name));
create unique index if not exists business_product_units_business_internal_id_uidx on business_product_units (business_id, lower(internal_id));
create unique index if not exists business_product_units_business_name_uidx on business_product_units (business_id, lower(name));
create unique index if not exists business_product_tax_bases_business_internal_id_uidx on business_product_tax_bases (business_id, lower(internal_id));
create unique index if not exists business_product_tax_bases_business_name_uidx on business_product_tax_bases (business_id, lower(name));
create unique index if not exists business_product_healthy_taxes_business_internal_id_uidx on business_product_healthy_taxes (business_id, lower(internal_id));
create unique index if not exists business_product_healthy_taxes_business_name_uidx on business_product_healthy_taxes (business_id, lower(name));

alter table business_inventory_products
  add column if not exists brand_id uuid references business_product_brands(id) on delete restrict,
  add column if not exists unit_id uuid references business_product_units(id) on delete restrict,
  add column if not exists tax_base_id uuid references business_product_tax_bases(id) on delete restrict,
  add column if not exists healthy_tax_id uuid references business_product_healthy_taxes(id) on delete restrict;

-- Keep legacy tax codes valid for historical products, while new product creation only exposes the requested options.
alter table business_inventory_products drop constraint if exists business_inventory_products_tax_classification_check;
alter table business_inventory_products add constraint business_inventory_products_tax_classification_check
  check (tax_classification in ('EXEMPT', 'EXCLUDED', 'VAT_0', 'VAT_5', 'VAT_8', 'VAT_11', 'VAT_19'));

insert into business_product_units (business_id, internal_id, name)
select business.id, unit.internal_id, unit.name
from businesses business
cross join (values ('METRO', 'Metro'), ('KG', 'Kg'), ('LITRO', 'Litro'), ('UNIDAD', 'Unidad')) as unit(internal_id, name)
on conflict do nothing;

insert into business_product_tax_bases (business_id, internal_id, name, rate)
select business.id, tax.internal_id, tax.name, tax.rate
from businesses business
cross join (values
  ('EXENTO_0', 'Exento/0%', 0::numeric),
  ('EXCLUIDO', 'Excluido', 0::numeric),
  ('IVA_5', '5%', 0.05::numeric),
  ('IVA_8', '8%', 0.08::numeric),
  ('IVA_19', '19%', 0.19::numeric)
) as tax(internal_id, name, rate)
on conflict do nothing;

insert into business_product_healthy_taxes (business_id, internal_id, name, rate)
select business.id, tax.internal_id, tax.name, tax.rate
from businesses business
cross join (values ('NO_APLICA', 'No Aplica', 0::numeric), ('IMPUESTO_20', '20%', 0.20::numeric)) as tax(internal_id, name, rate)
on conflict do nothing;

drop trigger if exists trg_business_product_brands_updated_at on business_product_brands;
create trigger trg_business_product_brands_updated_at before update on business_product_brands for each row execute function set_updated_at();
drop trigger if exists trg_business_product_units_updated_at on business_product_units;
create trigger trg_business_product_units_updated_at before update on business_product_units for each row execute function set_updated_at();
drop trigger if exists trg_business_product_tax_bases_updated_at on business_product_tax_bases;
create trigger trg_business_product_tax_bases_updated_at before update on business_product_tax_bases for each row execute function set_updated_at();
drop trigger if exists trg_business_product_healthy_taxes_updated_at on business_product_healthy_taxes;
create trigger trg_business_product_healthy_taxes_updated_at before update on business_product_healthy_taxes for each row execute function set_updated_at();

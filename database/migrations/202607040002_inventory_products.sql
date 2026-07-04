create table if not exists business_inventory_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sku text,
  barcode text,
  name text not null,
  description text,
  category text,
  brand text,
  unit_price numeric(14, 2) not null default 0,
  cost_price numeric(14, 2),
  currency text not null default 'COP',
  stock_quantity numeric(14, 2) not null default 0,
  min_stock_quantity numeric(14, 2) not null default 0,
  unit_label text not null default 'unidad',
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku),
  unique (business_id, barcode)
);

create index if not exists idx_business_inventory_products_business_status
  on business_inventory_products(business_id, status, updated_at desc);

create index if not exists idx_business_inventory_products_search
  on business_inventory_products using gin (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(barcode, '') || ' ' || coalesce(category, '') || ' ' || coalesce(brand, ''))
  );

drop trigger if exists trg_business_inventory_products_updated_at on business_inventory_products;
create trigger trg_business_inventory_products_updated_at
before update on business_inventory_products
for each row execute function set_updated_at();

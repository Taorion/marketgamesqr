create table if not exists business_competitor_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  competitor_name text not null,
  product_name text not null,
  category text,
  competitor_price numeric(14, 2) not null default 0,
  our_price numeric(14, 2),
  currency text not null default 'COP',
  channel text,
  source_url text,
  observed_at timestamptz not null default now(),
  notes text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_competitor_products_business_active
  on business_competitor_products(business_id, is_active, observed_at desc);

create index if not exists idx_business_competitor_products_competitor
  on business_competitor_products(business_id, lower(competitor_name));

create index if not exists idx_business_competitor_products_search
  on business_competitor_products using gin (
    to_tsvector('simple', coalesce(competitor_name, '') || ' ' || coalesce(product_name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(channel, ''))
  );

drop trigger if exists trg_business_competitor_products_updated_at on business_competitor_products;
create trigger trg_business_competitor_products_updated_at
before update on business_competitor_products
for each row execute function set_updated_at();

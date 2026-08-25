create table if not exists business_storage_addon_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  addon_code text not null,
  addon_name text not null,
  storage_bytes bigint not null check (storage_bytes > 0),
  price_cop integer not null check (price_cop > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  external_reference text not null unique,
  mercado_pago_preference_id text,
  mercado_pago_payment_id text,
  checkout_url text,
  sandbox_checkout_url text,
  payment_payload jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_storage_addon_orders_business_status_idx
  on business_storage_addon_orders (business_id, status, created_at desc);

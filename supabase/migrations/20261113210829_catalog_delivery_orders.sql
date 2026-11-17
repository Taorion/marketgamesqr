-- Additive, server-only data. Existing catalogs, contacts and sales stay canonical.
create table if not exists catalog_order_settings (
  catalog_id uuid primary key references smart_catalogs(id),
  business_id uuid not null references businesses(id),
  config jsonb not null,
  revision integer not null default 1,
  updated_by uuid references app_users(id),
  updated_at timestamptz not null default now()
);
create index if not exists catalog_order_settings_business_idx on catalog_order_settings(business_id);
create table if not exists catalog_orders (
  id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
  business_id uuid not null references businesses(id), catalog_id uuid not null references smart_catalogs(id),
  request_id uuid not null unique, fingerprint text not null, access_hash text not null unique, session_id uuid not null,
  customer_name text not null, customer_phone text not null, address text not null, delivery_references text not null default '', notes text not null default '',
  snapshot jsonb not null, delivery_fee numeric(14,2), total numeric(14,2), proposed_fee numeric(14,2), proposal_version integer not null default 0,
  status text not null default 'NEW' check(status in ('NEW','PENDING','ACCEPTED','PREPARING','READY','ON_THE_WAY','DELIVERED','REJECTED','CANCELLED')),
  payment_status text not null default 'UNPAID' check(payment_status in ('UNPAID','PAID','REFUNDED')),
  sale_id uuid unique references business_sales(id), lead_id uuid references business_manual_leads(id),
  inventory_applied boolean not null default false, marketing_consent boolean not null default false,
  priority integer not null default 0 check(priority between 0 and 3), agreed_at timestamptz, driver text, reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,business_id),
  check(delivery_fee is null or delivery_fee>=0), check(total is null or total>=0), check(proposed_fee is null or proposed_fee>=0)
);
create index if not exists catalog_orders_queue_idx on catalog_orders(business_id,status,created_at);
create index if not exists catalog_orders_business_created_idx on catalog_orders(business_id,created_at);
create index if not exists catalog_orders_catalog_idx on catalog_orders(catalog_id,created_at);
create index if not exists catalog_orders_lead_idx on catalog_orders(lead_id);
create table if not exists catalog_order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null, business_id uuid not null,
  event_type text not null, actor_id uuid references app_users(id), details jsonb not null default '{}', created_at timestamptz not null default now(),
  foreign key(order_id,business_id) references catalog_orders(id,business_id)
);
create index if not exists catalog_order_events_scope_idx on catalog_order_events(business_id,order_id,created_at);
-- Keep optional CRM/operator references compatible with existing cleanup workflows.
alter table catalog_orders drop constraint if exists catalog_orders_lead_id_fkey;
alter table catalog_orders add constraint catalog_orders_lead_id_fkey foreign key(lead_id) references business_manual_leads(id) on delete set null;
alter table catalog_order_settings drop constraint if exists catalog_order_settings_updated_by_fkey;
alter table catalog_order_settings add constraint catalog_order_settings_updated_by_fkey foreign key(updated_by) references app_users(id) on delete set null;
alter table catalog_order_events drop constraint if exists catalog_order_events_actor_id_fkey;
alter table catalog_order_events add constraint catalog_order_events_actor_id_fkey foreign key(actor_id) references app_users(id) on delete set null;
-- No client-side Supabase access. The authenticated Express server applies tenant authorization.
alter table catalog_order_settings enable row level security;
alter table catalog_orders enable row level security;
alter table catalog_order_events enable row level security;
revoke all on catalog_order_settings,catalog_orders,catalog_order_events from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke all on catalog_order_settings,catalog_orders,catalog_order_events from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke all on catalog_order_settings,catalog_orders,catalog_order_events from authenticated;
  end if;
end $$;

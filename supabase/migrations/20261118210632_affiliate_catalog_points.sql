-- Immutable point-redemption snapshots. Balances and QR status remain canonical.
create table if not exists affiliate_catalog_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  catalog_id uuid not null references smart_catalogs(id),
  affiliate_id uuid not null references affiliates(id),
  qr_code_id uuid not null unique references qr_codes(id),
  customer_id uuid references customer_accounts(id) on delete set null,
  request_id uuid not null,
  fingerprint text not null,
  total_points integer not null check (total_points > 0),
  snapshot jsonb not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, affiliate_id, request_id)
);
create index if not exists affiliate_catalog_tickets_owner on affiliate_catalog_tickets(business_id,affiliate_id,created_at desc);
create index if not exists affiliate_catalog_tickets_catalog on affiliate_catalog_tickets(catalog_id);
create index if not exists affiliate_catalog_tickets_customer on affiliate_catalog_tickets(customer_id) where customer_id is not null;
alter table affiliate_catalog_tickets enable row level security;
revoke all on affiliate_catalog_tickets from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then revoke all on affiliate_catalog_tickets from anon; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on affiliate_catalog_tickets from authenticated; end if;
end $$;

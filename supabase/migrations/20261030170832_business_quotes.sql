create table if not exists business_quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  number bigint generated always as identity unique,
  created_by uuid references app_users(id) on delete set null,
  request_id uuid not null,
  contact_id uuid,
  contact_source text check (contact_source in ('PLAYER','MANUAL','AFFILIATE')),
  activation_id uuid references interactive_activations(id) on delete set null,
  public_token text not null unique default encode(gen_random_bytes(32),'hex'),
  status text not null default 'DRAFT' check (status in ('DRAFT','SENT','ACCEPTED','DECLINED','CANCELLED','CONVERTED')),
  snapshot jsonb not null,
  valid_until timestamptz not null,
  sale_id uuid references business_sales(id) on delete restrict,
  issued_at timestamptz,
  accepted_at timestamptz,
  first_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,request_id),
  check ((contact_id is null) = (contact_source is null)),
  check ((status='CONVERTED') = (sale_id is not null))
);
create index if not exists business_quotes_business_created on business_quotes(business_id,created_at desc,id desc);
create index if not exists business_quotes_contact on business_quotes(business_id,contact_source,contact_id) where contact_id is not null;
create index if not exists business_quotes_activation on business_quotes(activation_id) where activation_id is not null;
create index if not exists business_quotes_creator on business_quotes(created_by) where created_by is not null;
create unique index if not exists business_quotes_sale on business_quotes(sale_id) where sale_id is not null;
alter table business_quotes enable row level security;
revoke all on business_quotes from public;
revoke all on sequence business_quotes_number_seq from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke all on business_quotes from anon;
    revoke all on sequence business_quotes_number_seq from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke all on business_quotes from authenticated;
    revoke all on sequence business_quotes_number_seq from authenticated;
  end if;
end $$;

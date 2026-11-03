-- Personal identities are deliberately separate from enterprise app_users.
create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check(email=lower(email)),
  full_name text not null default '',
  public_id uuid not null unique default gen_random_uuid(),
  currency text not null default 'COP',
  timezone text not null default 'America/Bogota',
  preferences jsonb not null default '{"notifications":{"purchases":true,"benefits":true,"budget":true,"summary":true}}',
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.customer_challenges (
  id uuid primary key default gen_random_uuid(), email text not null,
  code_hash text not null, attempts integer not null default 0,
  expires_at timestamptz not null, consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index customer_challenges_email on public.customer_challenges(email,created_at desc);
create table public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  token_hash text not null unique, device_name text not null default 'Dispositivo',
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index customer_sessions_owner on public.customer_sessions(customer_id);
create table public.customer_relationships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_key text not null check(length(document_key) between 3 and 80),
  state text not null default 'PENDING' check(state in ('PENDING','ACCEPTED','REJECTED','REVOKED')),
  proposed_by uuid references public.app_users(id),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 day',
  accepted_at timestamptz, include_history boolean not null default false,
  unique(customer_id,business_id,document_key)
);
create unique index customer_relationships_identity on public.customer_relationships(business_id,document_key) where state='ACCEPTED';
create index customer_relationships_owner on public.customer_relationships(customer_id,state);
create index customer_sales_document on public.business_sales(business_id,(regexp_replace(lower(customer_document_id),'[^a-z0-9]','','g')),created_at);
create table public.customer_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  request_id uuid not null, kind text not null default 'EXPENSE' check(kind in ('EXPENSE','INCOME')),
  amount numeric(14,2) not null check(amount>0), currency text not null,
  occurred_at timestamptz not null, merchant text not null,
  category text not null default 'otros', priority text not null default 'UNSET' check(priority in ('UNSET','ESSENTIAL','FLEXIBLE')),
  note text not null default '', payment_method text not null default '',
  products jsonb not null default '[]', splits jsonb not null default '[]', tags jsonb not null default '[]',
  linked_sale_id uuid references public.business_sales(id), deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(customer_id,request_id)
);
create unique index customer_entries_link on public.customer_entries(customer_id,linked_sale_id) where linked_sale_id is not null and deleted_at is null;
create index customer_entries_owner_date on public.customer_entries(customer_id,occurred_at desc) where deleted_at is null;
create table public.customer_sale_notes (
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  sale_id uuid not null references public.business_sales(id) on delete cascade,
  category text not null default 'otros', priority text not null default 'UNSET', note text not null default '',
  reported_at timestamptz, report_reason text, updated_at timestamptz not null default now(),
  primary key(customer_id,sale_id)
);
create table public.customer_receipts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  entry_id uuid not null references public.customer_entries(id) on delete cascade,
  filename text not null, mime_type text not null check(mime_type in ('image/jpeg','image/png','application/pdf')),
  bytes bytea not null check(octet_length(bytes) between 1 and 5242880), created_at timestamptz not null default now()
);
create index customer_receipts_owner on public.customer_receipts(customer_id,entry_id);
create table public.customer_budgets (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  category text not null default 'ALL', period text not null check(period in ('week','month')),
  currency text not null, amount numeric(14,2) not null check(amount>0), threshold integer not null default 80 check(threshold between 1 and 100),
  unique(customer_id,category,period,currency)
);
create table public.customer_goals (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  name text not null, currency text not null, target numeric(14,2) not null check(target>0),
  recorded_amount numeric(14,2) not null default 0 check(recorded_amount>=0), created_at timestamptz not null default now()
);
create index customer_goals_owner on public.customer_goals(customer_id);
create table public.customer_recurring (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  name text not null, amount numeric(14,2) not null check(amount>0), currency text not null,
  kind text not null check(kind in ('EXPENSE','INCOME')), category text not null default 'otros',
  next_date date not null, frequency text not null check(frequency in ('week','month','year'))
);
create index customer_recurring_owner on public.customer_recurring(customer_id);
create table public.customer_directory (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  published boolean not null default false, category text not null default '', city text not null default '',
  address text not null default '', description text not null default '',
  latitude double precision, longitude double precision, updated_at timestamptz not null default now()
);
create table public.customer_favorites (
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  primary key(customer_id,business_id)
);
create table public.customer_place_requests (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  name text not null, city text not null, address text not null default '',
  business_id uuid references public.businesses(id), created_at timestamptz not null default now()
);
create unique index customer_place_requests_dedupe on public.customer_place_requests(customer_id,lower(name),lower(city),lower(address));
create table public.customer_insight_dismissals (
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  insight_key text not null, primary key(customer_id,insight_key)
);
create table public.customer_sale_adjustments (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.business_sales(id),
  business_id uuid not null references public.businesses(id), actor_id uuid not null references public.app_users(id),
  request_id uuid not null, amount numeric(14,2) not null check(amount>0), reason text not null,
  created_at timestamptz not null default now(), unique(business_id,request_id)
);
create index customer_adjustments_sale on public.customer_sale_adjustments(sale_id);
-- No Data API grants: access is through the server, with owner predicates on every operation.
do $$ declare t text; r text; begin
  foreach t in array array['customer_accounts','customer_challenges','customer_sessions','customer_relationships','customer_entries',
    'customer_sale_notes','customer_receipts','customer_budgets','customer_goals','customer_recurring','customer_directory',
    'customer_favorites','customer_place_requests','customer_insight_dismissals','customer_sale_adjustments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public',t);
    foreach r in array array['anon','authenticated'] loop
      if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
    end loop;
  end loop;
end $$;

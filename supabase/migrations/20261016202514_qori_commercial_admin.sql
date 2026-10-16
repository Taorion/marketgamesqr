-- Internal sales authorization. Access is through the authenticated server, never the Data API.
alter type user_role add value if not exists 'QORI_SUPERADMIN';
alter type user_role add value if not exists 'QORI_SELLER';
alter table app_users add column if not exists platform_role text check(platform_role in ('QORI_SUPERADMIN'));

create table if not exists qori_sales_profiles (
  user_id uuid primary key references app_users(id),
  phone text not null default '',
  created_by uuid not null references app_users(id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists qori_sales_accounts (
  business_id uuid primary key references businesses(id),
  seller_id uuid references app_users(id),
  assigned_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists qori_sales_prospects (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references app_users(id),
  business_id uuid references businesses(id),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null default '',
  notes text not null default '',
  stage text not null default 'NEW' check(stage in ('NEW','CONTACTED','NEGOTIATING','WON','LOST')),
  next_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists qori_commercial_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seller_id uuid references app_users(id),
  plan_codes text[] not null,
  max_discount_percent numeric(5,2) not null check(max_discount_percent between 0 and 90),
  max_discount_months integer not null check(max_discount_months between 0 and 24),
  max_trial_days integer not null check(max_trial_days between 0 and 365),
  max_bonus_tickets integer not null check(max_bonus_tickets between 0 and 100000),
  allowed_modules text[] not null default '{}',
  max_benefit_days integer not null check(max_benefit_days between 0 and 730),
  max_limits jsonb not null default '{}',
  expires_at timestamptz not null,
  is_active boolean not null default true,
  version integer not null default 1,
  approved_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists qori_commercial_deals (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references qori_sales_prospects(id),
  business_id uuid references businesses(id),
  seller_id uuid not null references app_users(id),
  policy_id uuid references qori_commercial_policies(id),
  policy_version integer,
  terms jsonb not null,
  reason text not null,
  status text not null check(status in ('PENDING','APPROVED','REJECTED','CANCELLED','APPLIED')),
  approval_source text check(approval_source in ('POLICY','SUPERADMIN')),
  approved_by uuid references app_users(id),
  approved_at timestamptz,
  decision_reason text,
  valid_until timestamptz,
  applied_at timestamptz,
  applied_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(prospect_id is not null or business_id is not null),
  check(status not in ('APPROVED','APPLIED') or (approved_by is not null and valid_until is not null))
);
create table if not exists qori_commercial_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references app_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists qori_sales_profiles_creator_idx on qori_sales_profiles(created_by);
create index if not exists qori_sales_accounts_seller_idx on qori_sales_accounts(seller_id,business_id);
create index if not exists qori_sales_accounts_assigner_idx on qori_sales_accounts(assigned_by);
create index if not exists qori_sales_prospects_seller_idx on qori_sales_prospects(seller_id,created_at desc,id);
create index if not exists qori_sales_prospects_business_idx on qori_sales_prospects(business_id);
create index if not exists qori_commercial_policies_seller_idx on qori_commercial_policies(seller_id);
create index if not exists qori_commercial_policies_approver_idx on qori_commercial_policies(approved_by);
create index if not exists qori_commercial_deals_seller_idx on qori_commercial_deals(seller_id,created_at desc,id);
create index if not exists qori_commercial_deals_prospect_idx on qori_commercial_deals(prospect_id);
create index if not exists qori_commercial_deals_business_idx on qori_commercial_deals(business_id);
create index if not exists qori_commercial_deals_policy_idx on qori_commercial_deals(policy_id);
create index if not exists qori_commercial_deals_approver_idx on qori_commercial_deals(approved_by);
create index if not exists qori_commercial_deals_applier_idx on qori_commercial_deals(applied_by);
create index if not exists qori_commercial_deals_pending_idx on qori_commercial_deals(created_at desc,id) where status='PENDING';
create index if not exists qori_commercial_audit_actor_idx on qori_commercial_audit(actor_id,created_at desc);
create index if not exists qori_commercial_audit_date_idx on qori_commercial_audit(created_at desc,id);

do $$
declare t text; r text;
begin
  -- app_users now holds a platform privilege. Only the server may read/write it.
  foreach t in array array['app_users','qori_sales_profiles','qori_sales_accounts','qori_sales_prospects','qori_commercial_policies','qori_commercial_deals','qori_commercial_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public',t);
    foreach r in array array['anon','authenticated'] loop
      if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
    end loop;
  end loop;
end $$;

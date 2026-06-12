create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('ADMIN', 'BUSINESS_OWNER', 'VALIDATOR');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type user_role add value if not exists 'ADMIN_MARKET_GAMES';
exception when duplicate_object then null;
end $$;

do $$ begin
  create type qr_status as enum ('ACTIVE', 'REDEEMED', 'EXPIRED', 'INVALID');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type qr_status add value if not exists 'UNCLAIMED';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type qr_status add value if not exists 'CLAIMED';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type qr_status add value if not exists 'CANCELLED';
exception when duplicate_object then null;
end $$;

do $$ begin
  create type qr_origin_type as enum (
    'CAMPAIGN_GAME',
    'CAMPAIGN_FORM',
    'POST_SALE',
    'PRODUCT_LABEL',
    'BULK_PACKAGE',
    'MANUAL_BENEFIT',
    'LOYALTY',
    'SURPRISE_REWARD',
    'AFFILIATE_REFERRAL'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type qr_origin_type add value if not exists 'AFFILIATE_REFERRAL';
exception when duplicate_object then null;
end $$;

do $$ begin
  create type benefit_type as enum (
    'PERCENT_DISCOUNT',
    'FIXED_AMOUNT_DISCOUNT',
    'FREE_GIFT',
    'FREE_SAMPLE',
    'UPGRADE',
    'VIP_ACCESS',
    'RAFFLE_ENTRY',
    'BUY_X_GET_Y',
    'CUSTOM'
  );
exception when duplicate_object then null;
end $$;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}',
  plan_code text not null default 'PREPAID_QR',
  subscription_status text not null default 'ACTIVE',
  subscription_started_at timestamptz,
  subscription_current_period_ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table businesses add column if not exists plan_code text not null default 'PREPAID_QR';
alter table businesses add column if not exists subscription_status text not null default 'ACTIVE';
alter table businesses add column if not exists subscription_started_at timestamptz;
alter table businesses add column if not exists subscription_current_period_ends_at timestamptz;
update businesses
set plan_code = coalesce(nullif(plan_code, ''), settings->'subscription'->>'plan_code', settings->>'plan_code', 'PREPAID_QR');

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  slug text not null,
  api_key_hash text,
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete set null,
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  role user_role not null,
  can_redeem_cross_business boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscription_usage_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  full_name text not null,
  document_id text,
  phone text,
  email text,
  photo_data_url text,
  qr_token text not null unique,
  points_total integer not null default 0,
  status text not null default 'ACTIVE',
  notes text,
  card_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_point_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  amount numeric(14, 2) not null default 0,
  points_awarded integer not null default 0,
  reason text not null default 'PURCHASE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  external_id text,
  name text,
  email text,
  phone text,
  document_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists questionnaires (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  display_in_validator text,
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  game_id uuid references games(id) on delete set null,
  reward_id uuid references rewards(id) on delete set null,
  name text not null,
  type text not null default 'FORM',
  status text not null default 'ACTIVE',
  public_slug text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  max_qr_total integer,
  max_redemptions_total integer,
  max_qr_per_person integer not null default 1,
  qr_expires_after_hours integer,
  requires_document_check boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, public_slug)
);

alter table campaigns add column if not exists slug text;
alter table campaigns add column if not exists objective text;
alter table campaigns add column if not exists strategy_summary text;
alter table campaigns add column if not exists budget_total numeric(14, 2) not null default 0;
alter table campaigns add column if not exists expected_sales_goal numeric(14, 2);
alter table campaigns add column if not exists expected_leads_goal numeric(14, 2);
alter table campaigns add column if not exists expected_redemptions_goal numeric(14, 2);
alter table campaigns add column if not exists launch_channels jsonb not null default '[]'::jsonb;
alter table campaigns add column if not exists client_notes text;
alter table campaigns add column if not exists activated_at timestamptz;
alter table campaigns add column if not exists client_setup_completed_at timestamptz;
alter table campaigns add column if not exists delivered_assets jsonb not null default '{}'::jsonb;
alter table campaigns add column if not exists created_by_admin_id uuid references app_users(id) on delete set null;
update campaigns set slug = public_slug where slug is null;

create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  reward_id uuid references rewards(id) on delete restrict,
  questionnaire_id uuid references questionnaires(id) on delete set null,
  token text not null unique,
  status qr_status not null default 'ACTIVE',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references app_users(id) on delete set null
);

create table if not exists business_qr_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  current_package_size integer not null default 0,
  qr_balance integer not null default 0,
  qr_purchased_total integer not null default 0,
  qr_used_total integer not null default 0,
  public_label text,
  internal_unit_price_cop integer not null default 1000,
  last_purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_qr_credit_accounts_non_negative check (
    qr_balance >= 0 and qr_purchased_total >= 0 and qr_used_total >= 0
  )
);

create table if not exists business_qr_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  account_id uuid references business_qr_credit_accounts(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  entry_type text not null check (entry_type in ('PACKAGE_PURCHASE', 'QR_CONSUMED', 'SUBSCRIPTION_INCLUDED', 'MANUAL_ADJUSTMENT')),
  package_size integer,
  delta_qr integer not null,
  balance_after integer not null,
  internal_unit_price_cop integer,
  internal_total_cop integer,
  public_label text,
  notes text,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table business_qr_credit_ledger drop constraint if exists business_qr_credit_ledger_entry_type_check;
alter table business_qr_credit_ledger
  add constraint business_qr_credit_ledger_entry_type_check
  check (entry_type in ('PACKAGE_PURCHASE', 'QR_CONSUMED', 'SUBSCRIPTION_INCLUDED', 'MANUAL_ADJUSTMENT'));

create table if not exists qr_credit_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  package_code text not null,
  package_size integer not null,
  package_title text not null,
  price_cop integer not null,
  currency text not null default 'COP',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'ERROR')),
  mercado_pago_preference_id text,
  mercado_pago_payment_id text unique,
  checkout_url text,
  sandbox_checkout_url text,
  external_reference text not null unique,
  credited_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  payment_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists package_sales_requests (
  id uuid primary key default gen_random_uuid(),
  package_code text not null,
  package_size integer not null,
  package_title text not null,
  price_cop integer not null,
  payment_url text not null,
  nit text,
  contact_name text not null,
  company_name text not null,
  email text not null,
  phone text not null,
  website text,
  city text,
  address text,
  seller_name text,
  notes text,
  payment_confirmed boolean not null default false,
  service_assigned boolean not null default false,
  assigned_business_id uuid references businesses(id) on delete set null,
  assigned_by_user_id uuid references app_users(id) on delete set null,
  assigned_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  game_id uuid references games(id) on delete cascade,
  qr_code_id uuid not null unique references qr_codes(id) on delete restrict,
  reward_id uuid references rewards(id) on delete restrict,
  player_id uuid references players(id) on delete restrict,
  redeemed_by_user_id uuid references app_users(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create table if not exists qr_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  reward_id uuid references rewards(id) on delete set null,
  name text not null,
  description text,
  quantity integer not null check (quantity > 0),
  qr_origin_type qr_origin_type not null,
  benefit_type benefit_type not null,
  benefit_value jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  expiration_days integer,
  channel_use text,
  status text not null default 'ACTIVE',
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists business_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_document_id text,
  product_name text,
  sale_amount numeric(14, 2) not null default 0,
  currency text not null default 'COP',
  seller_user_id uuid references app_users(id) on delete set null,
  branch_id uuid,
  acquisition_source text,
  acquisition_channel text,
  referred_affiliate_id uuid references affiliates(id) on delete set null,
  referral_points_awarded integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists qr_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  qr_code_id uuid not null unique references qr_codes(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  source text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists qr_event_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  batch_id uuid references qr_batches(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  user_id uuid references app_users(id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  slug text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create table if not exists attributed_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  qr_code_id uuid not null references qr_codes(id) on delete restrict,
  redemption_id uuid not null references redemptions(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  sale_amount numeric(14, 2) not null default 0,
  currency text not null default 'COP',
  sale_confirmed_by_user_id uuid references app_users(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  payment_method text,
  product_or_service text,
  notes text,
  created_at timestamptz not null default now(),
  unique (redemption_id)
);

alter table app_users add column if not exists branch_id uuid references branches(id) on delete set null;
alter table redemptions add column if not exists branch_id uuid references branches(id) on delete set null;
alter table attributed_sales add column if not exists sale_type text not null default 'DIRECT_REDEMPTION';
do $$ begin
  alter table business_sales
    add constraint business_sales_branch_id_fkey
    foreign key (branch_id) references branches(id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists validation_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete set null,
  game_id uuid references games(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  user_id uuid references app_users(id) on delete set null,
  token_preview text,
  result text not null,
  message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table players add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table questionnaires add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table qr_codes add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table redemptions add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table validation_logs add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table players alter column game_id drop not null;
alter table qr_codes alter column game_id drop not null;
alter table qr_codes alter column player_id drop not null;
alter table qr_codes alter column reward_id drop not null;
alter table redemptions alter column game_id drop not null;
alter table redemptions alter column reward_id drop not null;
alter table redemptions alter column player_id drop not null;
alter table qr_codes add column if not exists batch_id uuid references qr_batches(id) on delete set null;
alter table qr_codes add column if not exists origin_type qr_origin_type not null default 'CAMPAIGN_GAME';
alter table qr_codes add column if not exists benefit_type benefit_type;
alter table qr_codes add column if not exists benefit_value jsonb not null default '{}'::jsonb;
alter table qr_codes add column if not exists sale_id uuid references business_sales(id) on delete set null;
alter table qr_codes add column if not exists claim_required boolean not null default false;
alter table qr_codes add column if not exists claimed_at timestamptz;
alter table qr_codes add column if not exists claimed_by_player_id uuid references players(id) on delete set null;
alter table qr_codes add column if not exists affiliate_id uuid references affiliates(id) on delete set null;
alter table business_sales add column if not exists qr_code_id uuid references qr_codes(id) on delete set null;
alter table business_sales add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table business_sales add column if not exists customer_document_id text;
alter table business_sales add column if not exists acquisition_source text;
alter table business_sales add column if not exists acquisition_channel text;
alter table business_sales add column if not exists referred_affiliate_id uuid references affiliates(id) on delete set null;
alter table business_sales add column if not exists referral_points_awarded integer not null default 0;

create table if not exists campaign_sales_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  period_type text not null,
  start_date date not null,
  end_date date not null,
  total_sales_amount numeric(14, 2) not null default 0,
  total_orders integer not null default 0,
  notes text,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_games_business_id on games(business_id);
create index if not exists idx_businesses_plan_code on businesses(plan_code);
create index if not exists idx_subscription_usage_business_type_created on subscription_usage_events(business_id, event_type, created_at desc);
create index if not exists idx_users_business_id on app_users(business_id);
create index if not exists idx_players_business_game on players(business_id, game_id);
create index if not exists idx_questionnaires_player on questionnaires(player_id);
create index if not exists idx_rewards_business_id on rewards(business_id);
create index if not exists idx_qr_codes_token on qr_codes(token);
create index if not exists idx_qr_codes_business_status on qr_codes(business_id, status);
create index if not exists idx_qr_codes_campaign_status on qr_codes(campaign_id, status);
create index if not exists idx_qr_codes_origin_status on qr_codes(origin_type, status);
create index if not exists idx_qr_codes_batch_id on qr_codes(batch_id);
create index if not exists idx_qr_codes_affiliate_status on qr_codes(affiliate_id, status, created_at desc);
create unique index if not exists idx_business_sales_qr_code_unique on business_sales(qr_code_id) where qr_code_id is not null;
create index if not exists idx_business_qr_credit_ledger_business_created on business_qr_credit_ledger(business_id, created_at desc);
create index if not exists idx_qr_credit_purchase_orders_business_created on qr_credit_purchase_orders(business_id, created_at desc);
create index if not exists idx_qr_credit_purchase_orders_status on qr_credit_purchase_orders(status, created_at desc);
create index if not exists idx_qr_credit_purchase_orders_preference on qr_credit_purchase_orders(mercado_pago_preference_id);
create index if not exists idx_package_sales_requests_created on package_sales_requests(created_at desc);
create index if not exists idx_package_sales_requests_assignment on package_sales_requests(payment_confirmed, service_assigned);
create index if not exists idx_redemptions_business_date on redemptions(business_id, redeemed_at desc);
create index if not exists idx_redemptions_campaign_date on redemptions(campaign_id, redeemed_at desc);
create index if not exists idx_validation_logs_business_date on validation_logs(business_id, created_at desc);
create index if not exists idx_campaigns_business_status on campaigns(business_id, status);
create index if not exists idx_campaigns_business_slug on campaigns(business_id, slug);
create index if not exists idx_affiliates_business_created on affiliates(business_id, created_at desc);
create index if not exists idx_affiliate_point_ledger_affiliate_created on affiliate_point_ledger(affiliate_id, created_at desc);
create index if not exists idx_attributed_sales_business_date on attributed_sales(business_id, created_at desc);
create index if not exists idx_attributed_sales_campaign_date on attributed_sales(campaign_id, created_at desc);
create index if not exists idx_branches_business_active on branches(business_id, is_active);
create index if not exists idx_campaign_sales_snapshots_campaign_period on campaign_sales_snapshots(campaign_id, period_type, start_date);
create index if not exists idx_qr_batches_business_created on qr_batches(business_id, created_at desc);
create index if not exists idx_qr_claims_business_claimed on qr_claims(business_id, claimed_at desc);
create index if not exists idx_business_sales_business_created on business_sales(business_id, created_at desc);
create index if not exists idx_business_sales_business_source_created on business_sales(business_id, acquisition_source, created_at desc);
create index if not exists idx_business_sales_referred_affiliate on business_sales(referred_affiliate_id, created_at desc);
create index if not exists idx_qr_event_logs_business_created on qr_event_logs(business_id, created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_businesses_updated_at on businesses;
create trigger trg_businesses_updated_at
before update on businesses
for each row execute function set_updated_at();

drop trigger if exists trg_business_qr_credit_accounts_updated_at on business_qr_credit_accounts;
create trigger trg_business_qr_credit_accounts_updated_at
before update on business_qr_credit_accounts
for each row execute function set_updated_at();

drop trigger if exists trg_qr_credit_purchase_orders_updated_at on qr_credit_purchase_orders;
create trigger trg_qr_credit_purchase_orders_updated_at
before update on qr_credit_purchase_orders
for each row execute function set_updated_at();

drop trigger if exists trg_games_updated_at on games;
create trigger trg_games_updated_at
before update on games
for each row execute function set_updated_at();

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists trg_affiliates_updated_at on affiliates;
create trigger trg_affiliates_updated_at
before update on affiliates
for each row execute function set_updated_at();

drop trigger if exists trg_rewards_updated_at on rewards;
create trigger trg_rewards_updated_at
before update on rewards
for each row execute function set_updated_at();

drop trigger if exists trg_campaigns_updated_at on campaigns;
create trigger trg_campaigns_updated_at
before update on campaigns
for each row execute function set_updated_at();

drop trigger if exists trg_branches_updated_at on branches;
create trigger trg_branches_updated_at
before update on branches
for each row execute function set_updated_at();

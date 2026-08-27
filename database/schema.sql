create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('ADMIN', 'BUSINESS_OWNER', 'BUSINESS_MANAGER', 'VALIDATOR');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type user_role add value if not exists 'ADMIN_MARKET_GAMES';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type user_role add value if not exists 'BUSINESS_MANAGER';
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
  alter type qr_origin_type add value if not exists 'TRIVIA_LAUNCHER';
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
  plan_type text,
  portal_status text,
  portal_activated_at timestamptz,
  growth_started_at timestamptz,
  growth_expires_at timestamptz,
  growth_source text,
  subscription_status text not null default 'ACTIVE',
  subscription_started_at timestamptz,
  subscription_current_period_ends_at timestamptz,
  subscription_auto_renew_enabled boolean not null default false,
  subscription_auto_renew_status text not null default 'DISABLED',
  mercado_pago_preapproval_id text,
  subscription_auto_renew_checkout_url text,
  subscription_auto_renew_authorized_at timestamptz,
  subscription_auto_renew_cancelled_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table businesses add column if not exists plan_code text not null default 'PREPAID_QR';
alter table businesses add column if not exists plan_type text;
alter table businesses add column if not exists portal_status text;
alter table businesses add column if not exists portal_activated_at timestamptz;
alter table businesses add column if not exists growth_started_at timestamptz;
alter table businesses add column if not exists growth_expires_at timestamptz;
alter table businesses add column if not exists growth_source text;
alter table businesses add column if not exists subscription_status text not null default 'ACTIVE';
alter table businesses add column if not exists subscription_started_at timestamptz;
alter table businesses add column if not exists subscription_current_period_ends_at timestamptz;
alter table businesses add column if not exists subscription_auto_renew_enabled boolean not null default false;
alter table businesses add column if not exists subscription_auto_renew_status text not null default 'DISABLED';
alter table businesses add column if not exists mercado_pago_preapproval_id text;
alter table businesses add column if not exists subscription_auto_renew_checkout_url text;
alter table businesses add column if not exists subscription_auto_renew_authorized_at timestamptz;
alter table businesses add column if not exists subscription_auto_renew_cancelled_at timestamptz;
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
  password_version integer not null default 0,
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

create table if not exists affiliate_reward_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  title text not null,
  description text,
  required_points integer not null check (required_points > 0),
  benefit_type benefit_type not null default 'CUSTOM',
  benefit_label text not null,
  benefit_value jsonb not null default '{}'::jsonb,
  campaign_id uuid references campaigns(id) on delete set null,
  reward_id uuid references rewards(id) on delete set null,
  expiration_days integer check (expiration_days is null or expiration_days > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_reward_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  reward_rule_id uuid not null references affiliate_reward_rules(id) on delete restrict,
  qr_code_id uuid not null unique references qr_codes(id) on delete restrict,
  created_by_user_id uuid references app_users(id) on delete set null,
  points_snapshot integer not null default 0,
  status text not null default 'ISSUED' check (status in ('ISSUED', 'REDEEMED', 'CANCELLED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, affiliate_id, reward_rule_id)
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
  player_id uuid references players(id) on delete cascade,
  interactive_participant_id uuid,
  answers jsonb not null default '{}',
  constraint questionnaires_subject_check check (player_id is not null or interactive_participant_id is not null),
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

create table if not exists campaign_affiliates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  assigned_by_user_id uuid references app_users(id) on delete set null,
  role text not null default 'REFERER',
  status text not null default 'ACTIVE',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, campaign_id, affiliate_id)
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

create table if not exists public_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  message text not null,
  source_url text,
  ip_address text,
  user_agent text,
  mail_delivery_status text not null default 'PENDING' check (mail_delivery_status in ('PENDING', 'SENT', 'ERROR')),
  mail_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_manual_leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  document_type text,
  document_id text,
  company text,
  job_title text,
  source text not null default 'Manual',
  source_detail text,
  interest text,
  importance_reason text,
  preferred_channel text,
  preferred_contact_time text,
  status text not null default 'NEW' check (status in ('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST')),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table business_manual_leads add column if not exists job_title text;
alter table business_manual_leads add column if not exists importance_reason text;

create table if not exists rms_lead_state (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null default 'PLAYER' check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid not null,
  lead_id uuid,
  rms_phase text not null default 'recoleccion',
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  recommended_action text,
  last_operation text,
  last_material_sent text,
  revenue_potential numeric(14, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, source_type, source_id)
);

create table if not exists rms_phase_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null default 'PLAYER' check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid not null,
  lead_id uuid,
  from_phase text,
  to_phase text not null,
  moved_by uuid references app_users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists rms_machine_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid,
  lead_id uuid,
  event_type text not null,
  event_title text not null,
  event_description text,
  rms_phase text,
  operation_key text,
  material_type text,
  created_by uuid references app_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists campaign_manual_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  manual_lead_id uuid not null references business_manual_leads(id) on delete cascade,
  assigned_by_user_id uuid references app_users(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  channel text,
  acquisition_source text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, campaign_id, manual_lead_id)
);

alter table campaign_manual_contacts add column if not exists channel text;
alter table campaign_manual_contacts add column if not exists acquisition_source text;

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
  metadata jsonb not null default '{}'::jsonb,
  rms_source_type text,
  rms_source_id uuid,
  inventory_product_id uuid,
  quantity numeric(12, 2) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  product_cost_total numeric(14, 2) not null default 0,
  benefit_type text,
  benefit_cost numeric(14, 2) not null default 0,
  acquisition_cost numeric(14, 2) not null default 0,
  gross_profit numeric(14, 2) not null default 0,
  net_profit numeric(14, 2) not null default 0,
  roi numeric(14, 6),
  payment_method text,
  paid_at timestamptz,
  sale_status text not null default 'PAID',
  idempotency_key text
);

create table if not exists business_product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  name text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, internal_id),
  unique (business_id, name)
);

create table if not exists business_product_subcategories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references business_product_categories(id) on delete restrict,
  internal_id text not null,
  name text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, internal_id),
  unique (business_id, category_id, name)
);

create table if not exists business_inventory_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  internal_id text not null,
  sku text,
  barcode text,
  name text not null,
  description text,
  category text,
  category_id uuid references business_product_categories(id) on delete restrict,
  subcategory_id uuid references business_product_subcategories(id) on delete restrict,
  brand text,
  unit_price numeric(14, 2) not null default 0,
  price_before_tax numeric(14, 2) not null default 0,
  tax_classification text not null default 'EXEMPT',
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
  check (tax_classification in ('EXEMPT', 'VAT_0', 'VAT_5', 'VAT_11', 'VAT_19')),
  unique (business_id, internal_id),
  unique (business_id, sku),
  unique (business_id, barcode)
);

alter table business_sales
  add column if not exists rms_source_type text,
  add column if not exists rms_source_id uuid,
  add column if not exists inventory_product_id uuid,
  add column if not exists quantity numeric(12, 2) not null default 1,
  add column if not exists unit_cost numeric(14, 2) not null default 0,
  add column if not exists product_cost_total numeric(14, 2) not null default 0,
  add column if not exists benefit_type text,
  add column if not exists benefit_cost numeric(14, 2) not null default 0,
  add column if not exists acquisition_cost numeric(14, 2) not null default 0,
  add column if not exists gross_profit numeric(14, 2) not null default 0,
  add column if not exists net_profit numeric(14, 2) not null default 0,
  add column if not exists roi numeric(14, 6),
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz,
  add column if not exists sale_status text not null default 'PAID',
  add column if not exists idempotency_key text;

do $$ begin
  alter table business_sales
    add constraint business_sales_inventory_product_id_fkey
    foreign key (inventory_product_id) references business_inventory_products(id) on delete set null;
exception when duplicate_object then null;
end $$;

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
  metadata jsonb not null default '{}'::jsonb,
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
  player_id uuid references players(id) on delete restrict,
  sale_amount numeric(14, 2) not null default 0,
  purchase_subtotal numeric(14, 2) not null default 0,
  benefit_discount_amount numeric(14, 2) not null default 0,
  benefit_type text,
  benefit_label text,
  benefit_snapshot jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  application_summary jsonb not null default '{}'::jsonb,
  purchase_required boolean not null default false,
  application_mode text not null default 'PURCHASE' check (application_mode in ('PURCHASE', 'STANDALONE')),
  currency text not null default 'COP',
  sale_confirmed_by_user_id uuid references app_users(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  payment_method text,
  product_or_service text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (purchase_subtotal >= 0 and benefit_discount_amount >= 0 and sale_amount >= 0 and sale_amount <= purchase_subtotal),
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
alter table questionnaires alter column game_id drop not null;
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
alter table business_sales add column if not exists acquisition_channel_id uuid;
alter table business_sales add column if not exists acquisition_channel_name_snapshot text;
alter table business_sales add column if not exists acquisition_channel_slug_snapshot text;
alter table business_sales add column if not exists acquisition_channel_source text;
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

create table if not exists business_trivias (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  created_by_user_id uuid references app_users(id) on delete set null,
  title text not null,
  public_slug text not null unique,
  description text,
  questions jsonb not null default '[]'::jsonb,
  benefit_type benefit_type not null default 'CUSTOM',
  benefit_value jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  max_winners integer,
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_trivias_questions_count check (
    jsonb_typeof(questions) = 'array'
    and jsonb_array_length(questions) between 1 and 5
  )
);

create table if not exists business_trivia_attempts (
  id uuid primary key default gen_random_uuid(),
  trivia_id uuid not null references business_trivias(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  questionnaire_id uuid references questionnaires(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  participant_name text,
  participant_phone text,
  participant_email text,
  participant_document_id text,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total_questions integer not null default 0,
  passed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_games_business_id on games(business_id);
create index if not exists idx_businesses_plan_code on businesses(plan_code);
create index if not exists idx_businesses_subscription_due on businesses(subscription_current_period_ends_at);
create index if not exists idx_businesses_mp_preapproval on businesses(mercado_pago_preapproval_id);
create index if not exists idx_businesses_settings_nit_normalized
on businesses ((regexp_replace(lower(coalesce(settings->>'nit', '')), '[^a-z0-9]', '', 'g')));
create index if not exists idx_subscription_usage_business_type_created on subscription_usage_events(business_id, event_type, created_at desc);
create index if not exists idx_app_users_email_lower on app_users(lower(email));
create index if not exists idx_users_business_id on app_users(business_id);
create index if not exists idx_players_business_game on players(business_id, game_id);
create index if not exists idx_portal_players_business_created on players(business_id, created_at desc);
create index if not exists idx_portal_players_business_campaign_created on players(business_id, campaign_id, created_at desc);
create index if not exists idx_questionnaires_player on questionnaires(player_id);
create index if not exists idx_portal_questionnaires_player_created on questionnaires(player_id, created_at desc);
create index if not exists idx_rewards_business_id on rewards(business_id);
create index if not exists idx_qr_codes_token on qr_codes(token);
create index if not exists idx_qr_codes_business_status on qr_codes(business_id, status);
create index if not exists idx_qr_codes_campaign_status on qr_codes(campaign_id, status);
create index if not exists idx_qr_codes_origin_status on qr_codes(origin_type, status);
create index if not exists idx_qr_codes_batch_id on qr_codes(batch_id);
create index if not exists idx_ticket_center_qr_business_created on qr_codes(business_id, created_at desc);
create index if not exists idx_ticket_center_qr_business_origin_created on qr_codes(business_id, origin_type, created_at desc);
create index if not exists idx_ticket_center_qr_business_batch_status on qr_codes(business_id, batch_id, status);
create index if not exists idx_portal_qr_codes_player_created on qr_codes(player_id, created_at desc);
create index if not exists idx_qr_codes_affiliate_status on qr_codes(affiliate_id, status, created_at desc);
create unique index if not exists idx_business_sales_qr_code_unique on business_sales(qr_code_id) where qr_code_id is not null;
create index if not exists idx_business_qr_credit_ledger_business_created on business_qr_credit_ledger(business_id, created_at desc);
create index if not exists idx_qr_credit_purchase_orders_business_created on qr_credit_purchase_orders(business_id, created_at desc);
create index if not exists idx_qr_credit_purchase_orders_status on qr_credit_purchase_orders(status, created_at desc);
create index if not exists idx_qr_credit_purchase_orders_preference on qr_credit_purchase_orders(mercado_pago_preference_id);
create index if not exists idx_package_sales_requests_created on package_sales_requests(created_at desc);
create index if not exists idx_package_sales_requests_assignment on package_sales_requests(payment_confirmed, service_assigned);
create index if not exists idx_public_contact_messages_created on public_contact_messages(created_at desc);
create index if not exists idx_public_contact_messages_mail_status on public_contact_messages(mail_delivery_status, created_at desc);
create index if not exists idx_business_manual_leads_business_created on business_manual_leads(business_id, created_at desc);
create index if not exists idx_business_manual_leads_business_status on business_manual_leads(business_id, status, created_at desc);
create index if not exists idx_business_manual_leads_business_email on business_manual_leads(business_id, lower(email));
create index if not exists idx_business_manual_leads_business_phone on business_manual_leads(business_id, phone);
create index if not exists idx_rms_lead_state_business_phase on rms_lead_state(business_id, rms_phase, updated_at desc);
create index if not exists idx_rms_lead_state_business_priority on rms_lead_state(business_id, priority, updated_at desc);
create index if not exists idx_rms_phase_movements_business_created on rms_phase_movements(business_id, created_at desc);
create index if not exists idx_rms_phase_movements_business_source on rms_phase_movements(business_id, source_type, source_id, created_at desc);
create index if not exists idx_rms_machine_events_business_created on rms_machine_events(business_id, created_at desc);
create index if not exists idx_rms_machine_events_business_phase on rms_machine_events(business_id, rms_phase, created_at desc);
create index if not exists idx_campaign_manual_contacts_campaign
  on campaign_manual_contacts(business_id, campaign_id, status, created_at desc);
create index if not exists idx_campaign_manual_contacts_manual_lead
  on campaign_manual_contacts(business_id, manual_lead_id, status, created_at desc);
create index if not exists idx_campaign_manual_contacts_channel
  on campaign_manual_contacts(business_id, campaign_id, status, channel);
create index if not exists idx_redemptions_business_date on redemptions(business_id, redeemed_at desc);
create index if not exists idx_redemptions_campaign_date on redemptions(campaign_id, redeemed_at desc);
create index if not exists idx_portal_redemptions_business_campaign_redeemed on redemptions(business_id, campaign_id, redeemed_at desc);
create index if not exists idx_validation_logs_business_date on validation_logs(business_id, created_at desc);
create index if not exists idx_campaigns_business_status on campaigns(business_id, status);
create index if not exists idx_campaigns_business_slug on campaigns(business_id, slug);
create index if not exists idx_portal_campaigns_business_updated on campaigns(business_id, updated_at desc);
create index if not exists idx_affiliates_business_created on affiliates(business_id, created_at desc);
create index if not exists idx_affiliate_point_ledger_affiliate_created on affiliate_point_ledger(affiliate_id, created_at desc);
create index if not exists idx_affiliate_reward_rules_business_status on affiliate_reward_rules(business_id, status, required_points);
create index if not exists idx_affiliate_reward_tickets_affiliate_created on affiliate_reward_tickets(affiliate_id, created_at desc);
create index if not exists idx_campaign_affiliates_campaign on campaign_affiliates(business_id, campaign_id, status, created_at desc);
create index if not exists idx_campaign_affiliates_affiliate on campaign_affiliates(business_id, affiliate_id, created_at desc);
create index if not exists idx_attributed_sales_business_date on attributed_sales(business_id, created_at desc);
create index if not exists idx_attributed_sales_campaign_date on attributed_sales(campaign_id, created_at desc);
create index if not exists idx_portal_attributed_sales_business_campaign_created on attributed_sales(business_id, campaign_id, created_at desc);
create index if not exists idx_branches_business_active on branches(business_id, is_active);
create index if not exists idx_campaign_sales_snapshots_campaign_period on campaign_sales_snapshots(campaign_id, period_type, start_date);
create index if not exists idx_qr_batches_business_created on qr_batches(business_id, created_at desc);
create index if not exists idx_qr_claims_business_claimed on qr_claims(business_id, claimed_at desc);
create index if not exists idx_business_sales_business_created on business_sales(business_id, created_at desc);
create index if not exists idx_business_sales_business_source_created on business_sales(business_id, acquisition_source, created_at desc);
create index if not exists idx_business_sales_business_channel_created on business_sales(business_id, acquisition_channel, created_at desc);
create index if not exists idx_business_sales_business_acquisition_channel_id_created on business_sales(business_id, acquisition_channel_id, created_at desc);
create index if not exists idx_business_sales_referred_affiliate on business_sales(referred_affiliate_id, created_at desc);
create index if not exists business_sales_rms_source_created_idx on business_sales(business_id, rms_source_type, rms_source_id, created_at desc) where rms_source_id is not null;
create index if not exists business_sales_inventory_product_idx on business_sales(inventory_product_id) where inventory_product_id is not null;
create unique index if not exists business_sales_idempotency_key_idx on business_sales(business_id, idempotency_key) where idempotency_key is not null;
create index if not exists idx_business_inventory_products_business_status on business_inventory_products(business_id, status, updated_at desc);
create index if not exists idx_business_product_categories_business_name
  on business_product_categories(business_id, name);
create index if not exists idx_business_product_subcategories_business_category
  on business_product_subcategories(business_id, category_id, name);
create unique index if not exists business_product_categories_business_internal_id_ci_uidx
  on business_product_categories(business_id, lower(internal_id));
create unique index if not exists business_product_subcategories_business_internal_id_ci_uidx
  on business_product_subcategories(business_id, lower(internal_id));
create index if not exists idx_business_inventory_products_search
  on business_inventory_products using gin (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(sku, '') || ' ' || coalesce(barcode, '') || ' ' || coalesce(category, '') || ' ' || coalesce(brand, ''))
  );
create index if not exists idx_portal_business_sales_document_created on business_sales(business_id, customer_document_id, created_at desc);
create index if not exists idx_portal_business_sales_phone_created on business_sales(business_id, customer_phone, created_at desc);
create index if not exists idx_portal_business_sales_email_created on business_sales(business_id, customer_email, created_at desc);
create index if not exists idx_qr_event_logs_business_created on qr_event_logs(business_id, created_at desc);
create index if not exists idx_business_trivias_business_created on business_trivias(business_id, created_at desc);
create index if not exists idx_business_trivias_public_slug on business_trivias(public_slug);
create index if not exists idx_business_trivia_attempts_trivia_created on business_trivia_attempts(trivia_id, created_at desc);
create index if not exists idx_business_trivia_attempts_business_created on business_trivia_attempts(business_id, created_at desc);

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

drop trigger if exists trg_business_trivias_updated_at on business_trivias;
create trigger trg_business_trivias_updated_at
before update on business_trivias
for each row execute function set_updated_at();

drop trigger if exists trg_qr_credit_purchase_orders_updated_at on qr_credit_purchase_orders;
create trigger trg_qr_credit_purchase_orders_updated_at
before update on qr_credit_purchase_orders
for each row execute function set_updated_at();

drop trigger if exists trg_business_manual_leads_updated_at on business_manual_leads;
create trigger trg_business_manual_leads_updated_at
before update on business_manual_leads
for each row execute function set_updated_at();

drop trigger if exists trg_rms_lead_state_updated_at on rms_lead_state;
create trigger trg_rms_lead_state_updated_at
before update on rms_lead_state
for each row execute function set_updated_at();

drop trigger if exists trg_campaign_manual_contacts_updated_at on campaign_manual_contacts;
create trigger trg_campaign_manual_contacts_updated_at
before update on campaign_manual_contacts
for each row execute function set_updated_at();

drop trigger if exists trg_games_updated_at on games;
create trigger trg_games_updated_at
before update on games
for each row execute function set_updated_at();

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

create or replace function bump_app_user_password_version()
returns trigger
language plpgsql
as $$
begin
  if new.password_hash is distinct from old.password_hash then
    new.password_version = coalesce(old.password_version, 0) + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_app_users_password_version on app_users;
create trigger trg_app_users_password_version
before update of password_hash on app_users
for each row execute function bump_app_user_password_version();

drop trigger if exists trg_affiliates_updated_at on affiliates;
create trigger trg_affiliates_updated_at
before update on affiliates
for each row execute function set_updated_at();

drop trigger if exists trg_campaign_affiliates_updated_at on campaign_affiliates;
create trigger trg_campaign_affiliates_updated_at
before update on campaign_affiliates
for each row execute function set_updated_at();

drop trigger if exists trg_business_inventory_products_updated_at on business_inventory_products;
create trigger trg_business_inventory_products_updated_at
before update on business_inventory_products
for each row execute function set_updated_at();

drop trigger if exists trg_business_product_categories_updated_at on business_product_categories;
create trigger trg_business_product_categories_updated_at
before update on business_product_categories
for each row execute function set_updated_at();

drop trigger if exists trg_business_product_subcategories_updated_at on business_product_subcategories;
create trigger trg_business_product_subcategories_updated_at
before update on business_product_subcategories
for each row execute function set_updated_at();

create table if not exists business_acquisition_channels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  slug text not null,
  channel_type text not null default 'DIGITAL',
  platform text,
  status text not null default 'ACTIVE',
  period_budget numeric(14, 2) not null default 0,
  currency text not null default 'COP',
  cost_model text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create index if not exists idx_business_acquisition_channels_business_status
  on business_acquisition_channels(business_id, status, updated_at desc);

do $$ begin
  alter table business_sales
    add constraint business_sales_acquisition_channel_id_fkey
    foreign key (acquisition_channel_id) references business_acquisition_channels(id) on delete set null;
exception when duplicate_object then null;
end $$;
alter table business_manual_leads add column if not exists acquisition_channel_id uuid;
alter table business_manual_leads add column if not exists acquisition_channel_name_snapshot text;
alter table business_manual_leads add column if not exists acquisition_channel_slug_snapshot text;
alter table business_manual_leads add column if not exists acquisition_channel_source text;
do $$ begin
  alter table business_manual_leads
    add constraint business_manual_leads_acquisition_channel_id_fkey
    foreign key (acquisition_channel_id) references business_acquisition_channels(id) on delete set null;
exception when duplicate_object then null;
end $$;
alter table campaigns add column if not exists launch_channel_refs jsonb not null default '[]'::jsonb;

create table if not exists business_acquisition_channel_efforts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  channel_id uuid not null references business_acquisition_channels(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  title text not null,
  description text,
  objective text,
  content_type text not null default 'POST',
  status text not null default 'ACTIVE',
  published_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  budget_amount numeric(14, 2) not null default 0,
  currency text not null default 'COP',
  creative_url text,
  source_url text,
  notes text,
  tracking_token uuid not null default gen_random_uuid(),
  attribution_model text not null default 'LEGACY_WINDOW' check (attribution_model in ('DIRECT_LINK', 'TRACKED_LINK', 'LEGACY_WINDOW')),
  interactive_activation_id uuid references interactive_activations(id) on delete set null,
  lead_capture_activation_id uuid references lead_capture_activations(id) on delete set null,
  digital_asset_id uuid references digital_assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_acquisition_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  effort_id uuid not null references business_acquisition_channel_efforts(id) on delete cascade,
  channel_id uuid not null references business_acquisition_channels(id) on delete cascade,
  event_type text not null,
  source_type text not null,
  source_id uuid,
  lead_id uuid references players(id) on delete set null,
  participant_id uuid references interactive_activation_participants(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  revenue_amount numeric(14, 2) not null default 0,
  dedupe_key text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_acquisition_channel_efforts_channel_dates
  on business_acquisition_channel_efforts(business_id, channel_id, starts_at, ends_at);

create index if not exists idx_business_acquisition_channel_efforts_campaign
  on business_acquisition_channel_efforts(business_id, campaign_id, status);

drop trigger if exists trg_business_acquisition_channels_updated_at on business_acquisition_channels;
create trigger trg_business_acquisition_channels_updated_at
before update on business_acquisition_channels
for each row execute function set_updated_at();

drop trigger if exists trg_business_acquisition_channel_efforts_updated_at on business_acquisition_channel_efforts;
create trigger trg_business_acquisition_channel_efforts_updated_at
before update on business_acquisition_channel_efforts
for each row execute function set_updated_at();

drop trigger if exists trg_affiliate_reward_rules_updated_at on affiliate_reward_rules;
create trigger trg_affiliate_reward_rules_updated_at
before update on affiliate_reward_rules
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

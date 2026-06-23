do $$ begin
  create type reward_pass_status as enum (
    'active',
    'partially_redeemed',
    'fully_redeemed',
    'expired',
    'cancelled',
    'extended'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reward_pass_redemption_type as enum ('partial', 'full');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reward_pass_ticket_transaction_type as enum (
    'reward_pass_issue',
    'rollback',
    'manual_adjustment'
  );
exception when duplicate_object then null;
end $$;

create table if not exists reward_passes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  buyer_name text not null,
  buyer_document text,
  buyer_email text,
  buyer_phone text,
  beneficiary_name text not null,
  beneficiary_document text not null,
  beneficiary_email text,
  beneficiary_phone text,
  initial_value_cop numeric(14, 2) not null,
  current_balance_cop numeric(14, 2) not null,
  issued_at timestamptz not null default now(),
  valid_from timestamptz,
  expires_at timestamptz not null,
  status reward_pass_status not null default 'active',
  qr_token text not null unique,
  public_code text not null unique,
  security_pin text,
  transferable boolean not null default false,
  partial_redemption_allowed boolean not null default true,
  authorized_branch text,
  terms text not null,
  internal_notes text,
  digital_card_image_path text,
  digital_card_pdf_path text,
  acquisition_receipt_pdf_path text,
  payment_method_received text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_passes_positive_value check (initial_value_cop > 0),
  constraint reward_passes_non_negative_balance check (current_balance_cop >= 0),
  constraint reward_passes_balance_not_above_initial check (current_balance_cop <= initial_value_cop)
);

create table if not exists reward_pass_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_pass_id uuid not null references reward_passes(id) on delete cascade,
  company_id uuid not null references businesses(id) on delete cascade,
  branch text,
  cashier_user_id uuid references app_users(id) on delete set null,
  invoice_number text not null,
  invoice_file_path text,
  redeemed_value_cop numeric(14, 2) not null,
  balance_before_cop numeric(14, 2) not null,
  balance_after_cop numeric(14, 2) not null,
  redemption_type reward_pass_redemption_type not null,
  purchase_value_cop numeric(14, 2),
  document_checked text,
  document_match boolean,
  observations text,
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_pass_redemptions_positive_value check (redeemed_value_cop > 0),
  constraint reward_pass_redemptions_valid_balance check (
    balance_before_cop >= 0 and balance_after_cop >= 0 and balance_after_cop <= balance_before_cop
  )
);

create table if not exists reward_pass_ticket_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  reward_pass_id uuid references reward_passes(id) on delete set null,
  tickets_debited integer not null,
  balance_before integer not null,
  balance_after integer not null,
  transaction_type reward_pass_ticket_transaction_type not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_pass_ticket_transactions_non_negative check (
    tickets_debited >= 0 and balance_before >= 0 and balance_after >= 0
  )
);

create index if not exists idx_reward_passes_company_created on reward_passes(company_id, created_at desc);
create index if not exists idx_reward_passes_company_status on reward_passes(company_id, status);
create index if not exists idx_reward_passes_company_expires on reward_passes(company_id, expires_at);
create index if not exists idx_reward_passes_campaign on reward_passes(campaign_id) where campaign_id is not null;
create index if not exists idx_reward_passes_qr_token on reward_passes(qr_token);
create index if not exists idx_reward_pass_redemptions_pass_created on reward_pass_redemptions(reward_pass_id, redeemed_at desc);
create index if not exists idx_reward_pass_redemptions_company_created on reward_pass_redemptions(company_id, redeemed_at desc);
create index if not exists idx_reward_pass_redemptions_cashier on reward_pass_redemptions(company_id, cashier_user_id, redeemed_at desc);
create index if not exists idx_reward_pass_ticket_transactions_company_created on reward_pass_ticket_transactions(company_id, created_at desc);

drop trigger if exists trg_reward_passes_updated_at on reward_passes;
create trigger trg_reward_passes_updated_at
before update on reward_passes
for each row execute function set_updated_at();

drop trigger if exists trg_reward_pass_redemptions_updated_at on reward_pass_redemptions;
create trigger trg_reward_pass_redemptions_updated_at
before update on reward_pass_redemptions
for each row execute function set_updated_at();

drop trigger if exists trg_reward_pass_ticket_transactions_updated_at on reward_pass_ticket_transactions;
create trigger trg_reward_pass_ticket_transactions_updated_at
before update on reward_pass_ticket_transactions
for each row execute function set_updated_at();

alter table reward_passes enable row level security;
alter table reward_pass_redemptions enable row level security;
alter table reward_pass_ticket_transactions enable row level security;

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

create index if not exists idx_affiliate_reward_rules_business_status
  on affiliate_reward_rules(business_id, status, required_points);

create index if not exists idx_affiliate_reward_tickets_affiliate_created
  on affiliate_reward_tickets(affiliate_id, created_at desc);

drop trigger if exists trg_affiliate_reward_rules_updated_at on affiliate_reward_rules;
create trigger trg_affiliate_reward_rules_updated_at
before update on affiliate_reward_rules
for each row execute function set_updated_at();

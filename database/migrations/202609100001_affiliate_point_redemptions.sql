create table if not exists affiliate_point_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  affiliate_id uuid not null references affiliates(id) on delete cascade,
  ledger_id uuid not null unique references affiliate_point_ledger(id) on delete restrict,
  inventory_product_id uuid references business_inventory_products(id) on delete set null,
  reward_rule_id uuid references affiliate_reward_rules(id) on delete set null,
  points_redeemed integer not null check (points_redeemed > 0),
  description text not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);

create index if not exists idx_affiliate_point_redemptions_affiliate_created
  on affiliate_point_redemptions(affiliate_id, created_at desc);

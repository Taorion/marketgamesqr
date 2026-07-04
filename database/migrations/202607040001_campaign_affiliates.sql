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

create index if not exists idx_campaign_affiliates_campaign
  on campaign_affiliates(business_id, campaign_id, status, created_at desc);

create index if not exists idx_campaign_affiliates_affiliate
  on campaign_affiliates(business_id, affiliate_id, created_at desc);

drop trigger if exists trg_campaign_affiliates_updated_at on campaign_affiliates;
create trigger trg_campaign_affiliates_updated_at
before update on campaign_affiliates
for each row execute function set_updated_at();

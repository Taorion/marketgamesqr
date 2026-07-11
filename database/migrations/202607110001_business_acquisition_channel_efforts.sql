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
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_acquisition_channel_efforts_channel_dates
  on business_acquisition_channel_efforts(business_id, channel_id, starts_at, ends_at);

create index if not exists idx_business_acquisition_channel_efforts_campaign
  on business_acquisition_channel_efforts(business_id, campaign_id, status);

drop trigger if exists trg_business_acquisition_channel_efforts_updated_at on business_acquisition_channel_efforts;
create trigger trg_business_acquisition_channel_efforts_updated_at
before update on business_acquisition_channel_efforts
for each row execute function set_updated_at();

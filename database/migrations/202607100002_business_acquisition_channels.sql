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

create index if not exists idx_business_sales_business_channel_created
  on business_sales(business_id, acquisition_channel, created_at desc);

drop trigger if exists trg_business_acquisition_channels_updated_at on business_acquisition_channels;
create trigger trg_business_acquisition_channels_updated_at
before update on business_acquisition_channels
for each row execute function set_updated_at();

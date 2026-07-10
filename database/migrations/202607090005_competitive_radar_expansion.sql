alter table business_competitors
  add column if not exists swot_opportunities text,
  add column if not exists swot_threats text,
  add column if not exists better_than_us text,
  add column if not exists we_do_better text,
  add column if not exists response_plan text,
  add column if not exists recommended_campaign text,
  add column if not exists product_to_adjust text,
  add column if not exists price_to_review text,
  add column if not exists message_to_reinforce text;

alter table business_competitor_findings
  add column if not exists urgency text default 'MEDIUM',
  add column if not exists area_affected text,
  add column if not exists responsible_name text,
  add column if not exists source_type text,
  add column if not exists source_description text,
  add column if not exists source_checked_at timestamptz,
  add column if not exists source_reliability text default 'MEDIUM';

create table if not exists business_competitor_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  competitor_id uuid references business_competitors(id) on delete set null,
  name text not null,
  campaign_type text not null default 'OTHER',
  starts_at timestamptz,
  ends_at timestamptz,
  channel text,
  offer text,
  benefit text,
  target_audience text,
  main_message text,
  evidence_image_url text,
  source_url text,
  source_type text,
  source_reliability text default 'MEDIUM',
  aggressiveness_level text default 'MEDIUM',
  estimated_impact text default 'MEDIUM',
  suggested_action text,
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_competitor_campaigns_business
  on business_competitor_campaigns(business_id, status, starts_at desc, updated_at desc);

create index if not exists idx_business_competitor_campaigns_competitor
  on business_competitor_campaigns(competitor_id, starts_at desc);

drop trigger if exists trg_business_competitor_campaigns_updated_at on business_competitor_campaigns;
create trigger trg_business_competitor_campaigns_updated_at
before update on business_competitor_campaigns
for each row execute function set_updated_at();

create table if not exists business_competitor_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  competitor_id uuid references business_competitors(id) on delete set null,
  name text not null,
  event_date timestamptz,
  place text,
  city text,
  event_type text not null default 'OTHER',
  organizer text,
  competitor_participation text,
  presented_offer text,
  highlighted_products text,
  attendee_audience text,
  evidence_url text,
  evidence_image_url text,
  observations text,
  detected_opportunity text,
  recommended_action text,
  source_type text,
  source_reliability text default 'MEDIUM',
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_competitor_events_business
  on business_competitor_events(business_id, status, event_date desc, updated_at desc);

create index if not exists idx_business_competitor_events_competitor
  on business_competitor_events(competitor_id, event_date desc);

drop trigger if exists trg_business_competitor_events_updated_at on business_competitor_events;
create trigger trg_business_competitor_events_updated_at
before update on business_competitor_events
for each row execute function set_updated_at();

create table if not exists business_competitor_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  competitor_id uuid references business_competitors(id) on delete set null,
  finding_id uuid references business_competitor_findings(id) on delete set null,
  title text not null,
  responsible_name text,
  due_at timestamptz,
  priority text not null default 'MEDIUM',
  status text not null default 'OPEN',
  notes text,
  related_campaign_id uuid references campaigns(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_competitor_tasks_business
  on business_competitor_tasks(business_id, status, due_at asc, updated_at desc);

drop trigger if exists trg_business_competitor_tasks_updated_at on business_competitor_tasks;
create trigger trg_business_competitor_tasks_updated_at
before update on business_competitor_tasks
for each row execute function set_updated_at();

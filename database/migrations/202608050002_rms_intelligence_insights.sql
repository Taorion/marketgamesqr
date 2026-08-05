-- Intelligence stores an operator conclusion and its evidence references.
-- Facts remain in RMS, CRM, sales, QR and post-sale tables.
create table if not exists rms_intelligence_insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid,
  lead_id uuid,
  sale_id uuid references business_sales(id) on delete set null,
  insight_scope text not null default 'CASE' check (insight_scope in ('CASE', 'PATTERN')),
  observation text not null,
  hypothesis text,
  recommendation text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  evidence_note text,
  owner_name text,
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPLIED', 'DISCARDED', 'MEASURING')),
  expected_metric text,
  review_at timestamptz,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);

create table if not exists rms_intelligence_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  insight_id uuid not null references rms_intelligence_insights(id) on delete cascade,
  event_type text not null,
  event_description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rms_intelligence_insights_business_status_idx
  on rms_intelligence_insights (business_id, status, updated_at desc);
create index if not exists rms_intelligence_insights_case_idx
  on rms_intelligence_insights (business_id, source_type, source_id, created_at desc)
  where source_id is not null;
create index if not exists rms_intelligence_insights_sale_idx
  on rms_intelligence_insights (business_id, sale_id, created_at desc)
  where sale_id is not null;
create index if not exists rms_intelligence_events_insight_idx
  on rms_intelligence_events (business_id, insight_id, created_at desc);

drop trigger if exists trg_rms_intelligence_insights_updated_at on rms_intelligence_insights;
create trigger trg_rms_intelligence_insights_updated_at
before update on rms_intelligence_insights
for each row execute function set_updated_at();

alter table rms_intelligence_insights enable row level security;
alter table rms_intelligence_events enable row level security;

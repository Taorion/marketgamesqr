-- Reciclaje is an operational queue, not an RMS phase.  Each row keeps the
-- original commercial station and its RMS/Agenda references auditable.
create table if not exists rms_recycling_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  lead_id uuid,
  recycled_from_phase text not null check (recycled_from_phase in ('accion_correctiva', 'control_anti_fuga')),
  recycle_reason text not null,
  recycle_strategy text not null,
  recycle_owner text,
  recycle_at timestamptz not null,
  recycle_channel text,
  recycle_consent text not null default 'NOT_REQUIRED' check (recycle_consent in ('CONFIRMED', 'NOT_REQUIRED')),
  recycle_note text not null,
  recycle_target_phase text not null check (recycle_target_phase in ('procesamiento', 'clasificacion')),
  recycle_status text not null default 'SCHEDULED' check (recycle_status in ('SCHEDULED', 'REACTIVATING', 'REACTIVATED', 'CONVERTED', 'LOST', 'CANCELLED')),
  agenda_note_id uuid,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rms_recycling_cases_open_context_idx
  on rms_recycling_cases (business_id, source_type, source_id)
  where recycle_status in ('SCHEDULED', 'REACTIVATING');
create unique index if not exists rms_recycling_cases_idempotency_idx
  on rms_recycling_cases (business_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists rms_recycling_cases_queue_idx
  on rms_recycling_cases (business_id, recycle_status, recycle_at asc);
create index if not exists rms_recycling_cases_owner_idx
  on rms_recycling_cases (business_id, recycle_owner, recycle_at asc);

create table if not exists rms_recycling_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  recycling_case_id uuid not null references rms_recycling_cases(id) on delete cascade,
  action text not null check (action in ('SCHEDULED', 'RESCHEDULED', 'STRATEGY_CHANGED', 'REACTIVATED', 'LOST', 'CANCELLED')),
  previous_status text,
  next_status text not null,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists rms_recycling_events_idempotency_idx
  on rms_recycling_events (business_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists rms_recycling_events_case_idx
  on rms_recycling_events (business_id, recycling_case_id, created_at desc);

alter table rms_recycling_cases enable row level security;
alter table rms_recycling_events enable row level security;

-- Historical technical phase rows remain readable.  They are deliberately
-- not moved blindly: the application maps them into this queue on read and
-- writes all new recycling decisions with the lead kept in its real phase.

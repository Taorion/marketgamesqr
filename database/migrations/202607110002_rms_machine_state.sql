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

create index if not exists idx_rms_lead_state_business_phase
  on rms_lead_state(business_id, rms_phase, updated_at desc);

create index if not exists idx_rms_lead_state_business_priority
  on rms_lead_state(business_id, priority, updated_at desc);

create index if not exists idx_rms_phase_movements_business_created
  on rms_phase_movements(business_id, created_at desc);

create index if not exists idx_rms_phase_movements_business_source
  on rms_phase_movements(business_id, source_type, source_id, created_at desc);

create index if not exists idx_rms_machine_events_business_created
  on rms_machine_events(business_id, created_at desc);

create index if not exists idx_rms_machine_events_business_phase
  on rms_machine_events(business_id, rms_phase, created_at desc);

drop trigger if exists trg_rms_lead_state_updated_at on rms_lead_state;
create trigger trg_rms_lead_state_updated_at
before update on rms_lead_state
for each row execute function set_updated_at();

alter table rms_lead_state enable row level security;
alter table rms_phase_movements enable row level security;
alter table rms_machine_events enable row level security;

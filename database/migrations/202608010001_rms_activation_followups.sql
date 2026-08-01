create table if not exists rms_activation_followups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source_type text not null default 'PLAYER' check (source_type in ('PLAYER', 'MANUAL', 'BUYER', 'AFFILIATE')),
  source_id uuid not null,
  lead_id uuid,
  activation_note_id uuid references lead_notes(id) on delete cascade,
  sequence integer not null check (sequence between 1 and 9),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'ACTION_CREATED', 'RESPONDED', 'CANCELLED', 'SKIPPED')),
  due_at timestamptz not null,
  action_title text not null,
  suggested_message text,
  response_status text,
  response_note text,
  agenda_note_id uuid references lead_notes(id) on delete set null,
  executed_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, source_type, source_id, activation_note_id, sequence)
);

create index if not exists idx_rms_activation_followups_due
  on rms_activation_followups (status, due_at)
  where status = 'SCHEDULED';

create index if not exists idx_rms_activation_followups_source
  on rms_activation_followups (business_id, source_type, source_id, created_at desc);

drop trigger if exists trg_rms_activation_followups_updated_at on rms_activation_followups;
create trigger trg_rms_activation_followups_updated_at
before update on rms_activation_followups
for each row execute function set_updated_at();

alter table rms_activation_followups enable row level security;

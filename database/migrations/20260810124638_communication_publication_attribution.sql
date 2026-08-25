alter table business_communications
  add column if not exists publication_status text not null default 'DRAFT',
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references app_users(id) on delete set null,
  add column if not exists external_publication_url text,
  add column if not exists tracking_token uuid unique;

update business_communications
set tracking_token = gen_random_uuid()
where tracking_token is null;

alter table business_communications
  alter column tracking_token set default gen_random_uuid(),
  alter column tracking_token set not null;

create table if not exists business_communication_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  communication_id uuid not null references business_communications(id) on delete cascade,
  activation_id uuid references interactive_activations(id) on delete set null,
  participant_id uuid references interactive_activation_participants(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  event_type text not null check (event_type in ('PUBLISHED', 'ACTIVATION_VIEWED', 'ACTIVATION_STARTED', 'LEAD_CAPTURED', 'ACTIVATION_COMPLETED', 'REWARD_ISSUED')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_business_communication_events_communication
  on business_communication_events(communication_id, event_type, occurred_at desc);
create index if not exists idx_business_communication_events_activation
  on business_communication_events(activation_id, occurred_at desc);

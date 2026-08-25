create table if not exists business_communications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  communication_type text not null default 'EMAIL' check (communication_type in ('EMAIL', 'SOCIAL', 'MIXED')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'READY', 'SENT', 'ARCHIVED')),
  campaign_id uuid references campaigns(id) on delete set null,
  channel_id uuid references business_acquisition_channels(id) on delete set null,
  activation_id uuid references interactive_activations(id) on delete set null,
  subject text,
  email_body text,
  social_copy text,
  image_url text,
  action_url text,
  audience_filters jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_communication_recipients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  communication_id uuid not null references business_communications(id) on delete cascade,
  lead_id uuid references players(id) on delete set null,
  source_type text not null default 'PLAYER',
  source_id uuid,
  recipient_name text,
  recipient_email text,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'SENT', 'FAILED', 'SKIPPED')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_communications_business_updated
  on business_communications(business_id, status, updated_at desc);
create index if not exists idx_business_communication_recipients_communication
  on business_communication_recipients(communication_id, status, created_at desc);
create unique index if not exists idx_business_communication_recipient_once
  on business_communication_recipients(communication_id, source_type, source_id);

drop trigger if exists trg_business_communications_updated_at on business_communications;
create trigger trg_business_communications_updated_at
before update on business_communications
for each row execute function set_updated_at();

drop trigger if exists trg_business_communication_recipients_updated_at on business_communication_recipients;
create trigger trg_business_communication_recipients_updated_at
before update on business_communication_recipients
for each row execute function set_updated_at();

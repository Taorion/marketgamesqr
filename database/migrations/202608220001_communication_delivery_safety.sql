create table if not exists business_communication_email_preferences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  recipient_email text not null,
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_communication_email_preferences_email_normalized
    check (recipient_email = lower(trim(recipient_email)))
);

create unique index if not exists idx_business_communication_email_preferences_business_email
  on business_communication_email_preferences(business_id, recipient_email);
create unique index if not exists idx_business_communication_email_preferences_token
  on business_communication_email_preferences(unsubscribe_token);

create table if not exists business_communication_dispatches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  communication_id uuid not null references business_communications(id) on delete cascade,
  idempotency_key uuid not null,
  channel text not null check (channel in ('EMAIL', 'WHATSAPP')),
  status text not null default 'PROCESSING' check (status in ('PROCESSING', 'COMPLETED', 'FAILED')),
  requested_by uuid references app_users(id) on delete set null,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  result jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_business_communication_dispatches_idempotency
  on business_communication_dispatches(business_id, idempotency_key);
create index if not exists idx_business_communication_dispatches_communication
  on business_communication_dispatches(business_id, communication_id, created_at desc);

drop trigger if exists trg_business_communication_email_preferences_updated_at on business_communication_email_preferences;
create trigger trg_business_communication_email_preferences_updated_at
before update on business_communication_email_preferences
for each row execute function set_updated_at();

drop trigger if exists trg_business_communication_dispatches_updated_at on business_communication_dispatches;
create trigger trg_business_communication_dispatches_updated_at
before update on business_communication_dispatches
for each row execute function set_updated_at();

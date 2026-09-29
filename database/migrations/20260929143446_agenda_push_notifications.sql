-- Backend-owned tables: portal authentication uses app_users, not Supabase Auth.
create table if not exists agenda_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2048),
  p256dh text not null,
  auth text not null,
  password_version integer not null default 0,
  device_name text not null default 'Dispositivo',
  active boolean not null default true,
  enabled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agenda_push_active_user
  on agenda_push_subscriptions(business_id, user_id) where active;

create table if not exists agenda_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references lead_notes(id) on delete cascade,
  subscription_id uuid not null references agenda_push_subscriptions(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  reminder_at timestamptz not null,
  offset_minutes integer not null check (offset_minutes in (1440, 30, 10)),
  due_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING','SENDING','SENT','CANCELLED','FAILED')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (note_id, subscription_id, reminder_at, offset_minutes)
);
create index if not exists idx_agenda_push_pending
  on agenda_push_deliveries(due_at, id) where status in ('PENDING','SENDING');
create index if not exists idx_agenda_push_subscription on agenda_push_deliveries(subscription_id);
create index if not exists idx_agenda_push_business_user on agenda_push_deliveries(business_id, user_id);
create index if not exists idx_agenda_open_reminders
  on lead_notes(reminder_at) where reminder_at is not null and agenda_status = 'OPEN';

alter table agenda_push_subscriptions enable row level security;
alter table agenda_push_deliveries enable row level security;
revoke all on agenda_push_subscriptions, agenda_push_deliveries from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on agenda_push_subscriptions, agenda_push_deliveries from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on agenda_push_subscriptions, agenda_push_deliveries from authenticated;
  end if;
end $$;

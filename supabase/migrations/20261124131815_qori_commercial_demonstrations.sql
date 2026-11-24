create table public.qori_demo_config (
 singleton boolean primary key default true check(singleton), approved boolean not null default false,
 enabled boolean not null default false, settings jsonb not null, updated_by uuid references app_users(id), updated_at timestamptz not null default now()
);
insert into qori_demo_config(settings) values ('{"mode":"GROUP","capacity":8,"min_hours":2,"horizon_days":60,"additional_confirmation":false,"email_enabled":false,"reminder_hours":[24,1],"attendance_owner":"ADMIN","host_ids":[],"followup_hours":24,"conversion_days":30,"start_date":"2027-01-05","end_date":null}');
create table public.qori_demo_templates (
 id uuid primary key default gen_random_uuid(), weekday integer not null check(weekday in(2,3,4)),
 local_time time not null, duration_minutes integer not null default 60 check(duration_minutes between 15 and 240),
 meet_url text not null, confirmed boolean not null default true, unique(weekday,local_time)
);
insert into qori_demo_templates(weekday,local_time,meet_url,confirmed)
 select day,hr::time,link,not(day in(3,4) and hr='10:00') from unnest(array[2,3,4]) day
 cross join (values ('08:00','https://meet.google.com/apc-mdfv-pjz'),('10:00','https://meet.google.com/hmm-bwho-vxy'),('14:00','https://meet.google.com/djh-wqny-ggd'),('16:00','https://meet.google.com/xpt-jroa-aec')) t(hr,link);
create table public.qori_demo_sessions (
 id uuid primary key default gen_random_uuid(), template_id uuid not null references qori_demo_templates(id), local_date date not null check(local_date>='2027-01-05'),
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at), meet_url text not null,
 confirmed_template boolean not null, capacity integer not null check(capacity between 1 and 500),
 status text not null check(status in('DRAFT','ENABLED','CLOSED','CANCELLED','FINISHED')),
 revision integer not null default 1, is_exception boolean not null default false, created_at timestamptz not null default now(), unique(template_id,local_date)
);
create index qori_demo_sessions_starts on qori_demo_sessions(starts_at,status);
create table public.qori_demo_invitations (
 token text primary key, seller_id uuid not null references app_users(id), prospect_id uuid references qori_sales_prospects(id),
 session_id uuid references qori_demo_sessions(id), created_at timestamptz not null default now(), revoked_at timestamptz
);
create index qori_demo_invitations_seller on qori_demo_invitations(seller_id);
create table public.qori_demo_bookings (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references qori_demo_sessions(id), prospect_id uuid references qori_sales_prospects(id),
 owner_id uuid references app_users(id), invitation_token text not null references qori_demo_invitations(token), origin_seller_id uuid not null references app_users(id),
 request_hash text not null unique, payload_hash text not null, contact_name text not null, business_name text not null, email text not null,
 phone text not null default '', details jsonb not null default '{}', consent jsonb not null,
 status text not null check(status in('CONFIRMED','CANCELLED','PENDING_CHANGE','PENDING_CONFIRMATION')),
 cancel_actor text, revision integer not null default 1, created_at timestamptz not null default now(), cancelled_at timestamptz,
 followup_status text not null default 'PENDING' check(followup_status in('PENDING','AGREED','COMPLETED','CLOSED')), followup_due timestamptz, followup_completed_at timestamptz,
 contact_stopped boolean not null default false
);
create unique index qori_demo_booking_email_active on qori_demo_bookings(session_id,email) where status<>'CANCELLED';
create unique index qori_demo_booking_prospect_active on qori_demo_bookings(session_id,prospect_id) where status<>'CANCELLED' and prospect_id is not null;
create index qori_demo_bookings_prospect on qori_demo_bookings(prospect_id);
create index qori_demo_bookings_owner on qori_demo_bookings(owner_id,created_at);
create index qori_demo_bookings_email on qori_demo_bookings(email);
create table public.qori_demo_access (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references qori_demo_bookings(id), token_hash text not null unique,
 encrypted_token bytea not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index qori_demo_access_booking on qori_demo_access(booking_id,created_at);
create table public.qori_demo_visits (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references qori_demo_bookings(id), session_id uuid not null references qori_demo_sessions(id),
 active boolean not null default true, expected boolean, attendance text not null default 'PENDING' check(attendance in('PENDING','ATTENDED','ABSENT')),
 created_at timestamptz not null default now(), recorded_at timestamptz, recorded_by uuid references app_users(id)
);
create unique index qori_demo_active_visit on qori_demo_visits(booking_id) where active;
create index qori_demo_visits_session on qori_demo_visits(session_id);
create table public.qori_demo_events (
 id uuid primary key default gen_random_uuid(), booking_id uuid references qori_demo_bookings(id), session_id uuid references qori_demo_sessions(id),
 action text not null, actor_id uuid references app_users(id), actor_kind text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index qori_demo_events_booking on qori_demo_events(booking_id,created_at);
create table public.qori_demo_incidents (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references qori_demo_bookings(id), kind text not null, status text not null default 'OPEN',
 detail jsonb not null, created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references app_users(id), reason text
);
create index qori_demo_incidents_status on qori_demo_incidents(status);
create table public.qori_demo_messages (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references qori_demo_bookings(id), access_id uuid references qori_demo_access(id),
 kind text not null, revision integer not null, dedupe_key text not null unique, due_at timestamptz not null,
 status text not null default 'PENDING' check(status in('PENDING','ACCEPTED','FAILED','CANCELLED')), attempts integer not null default 0,
 first_attempt_at timestamptz, next_attempt_at timestamptz, provider_id text, last_error text, accepted_at timestamptz,
 encrypted_payload bytea, created_at timestamptz not null default now()
);
create index qori_demo_messages_due on qori_demo_messages(due_at,next_attempt_at) where status in('PENDING','FAILED');
create index qori_demo_messages_booking on qori_demo_messages(booking_id);
do $$ declare t text; begin
 foreach t in array array['qori_demo_config','qori_demo_templates','qori_demo_sessions','qori_demo_invitations','qori_demo_bookings','qori_demo_access','qori_demo_visits','qori_demo_events','qori_demo_incidents','qori_demo_messages'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on public.%I from anon',t); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on public.%I from authenticated',t); end if;
 end loop;
end $$;

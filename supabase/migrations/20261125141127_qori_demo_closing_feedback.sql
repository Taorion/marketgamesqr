alter table public.qori_demo_bookings add column document_id text
 check(document_id is null or document_id ~ '^[0-9]{4,20}$');
create unique index qori_demo_booking_document_active on public.qori_demo_bookings(session_id,document_id)
 where status<>'CANCELLED' and document_id is not null;
alter table public.qori_demo_visits add column attendance_source text check(attendance_source in ('FORM','STAFF'));
update public.qori_demo_visits set attendance_source='STAFF' where recorded_by is not null;
alter table public.qori_demo_visits add constraint qori_demo_visit_identity unique(id,booking_id,session_id);

create table public.qori_demo_feedback_forms (
 session_id uuid primary key references public.qori_demo_sessions(id),
 token text not null unique check(token ~ '^[A-Za-z0-9_-]{43}$'),
 enabled boolean not null default false,
 opened_at timestamptz not null, expires_at timestamptz not null check(expires_at>opened_at),
 opened_by uuid not null references public.app_users(id)
);
create table public.qori_demo_feedback (
 id uuid primary key default gen_random_uuid(),
 visit_id uuid not null unique,
 booking_id uuid not null references public.qori_demo_bookings(id),
 session_id uuid not null references public.qori_demo_sessions(id),
 document_id text not null check(document_id ~ '^[0-9]{4,20}$'),
 answers jsonb not null check(jsonb_typeof(answers)='object'),
 consent jsonb not null check(jsonb_typeof(consent)='object'),
 submitted_at timestamptz not null default now(),
 foreign key(visit_id,booking_id,session_id) references public.qori_demo_visits(id,booking_id,session_id)
);
create index qori_demo_feedback_booking on public.qori_demo_feedback(booking_id,submitted_at);
create index qori_demo_feedback_session on public.qori_demo_feedback(session_id);
alter table public.qori_demo_feedback_forms enable row level security;
alter table public.qori_demo_feedback enable row level security;
revoke all on public.qori_demo_feedback_forms,public.qori_demo_feedback from public;
do $$ declare role_name text; begin
 foreach role_name in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=role_name) then
   execute format('revoke all on public.qori_demo_feedback_forms,public.qori_demo_feedback from %I',role_name);
  end if;
 end loop;
end $$;

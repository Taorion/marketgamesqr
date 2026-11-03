create table public.customer_publications (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 kind text not null check(kind in ('ACTIVITY','STAMP','AFFILIATION','GIFT')),
 resource_id uuid, title text not null, description text not null default '',
 cover_url text not null default '', category text not null default '',
 status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED','PAUSED')),
 created_by uuid references public.app_users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((kind in ('ACTIVITY','STAMP'))=(resource_id is not null))
);
create unique index customer_publication_resource on public.customer_publications(business_id,kind,coalesce(resource_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index customer_publications_feed on public.customer_publications(updated_at desc,id) where status='PUBLISHED';
create table public.customer_saved_publications (
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 publication_id uuid not null references public.customer_publications(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(customer_id,publication_id)
);
create table public.customer_program_requests (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 publication_id uuid not null references public.customer_publications(id),
 business_id uuid not null references public.businesses(id),
 document_id text not null, message text not null default '',
 state text not null default 'PENDING' check(state in ('PENDING','INVITED','REJECTED','CANCELLED')),
 invitation_id uuid references public.customer_invitations(id),
 created_at timestamptz not null default now(), decided_at timestamptz
);
create unique index customer_program_request_pending on public.customer_program_requests(customer_id,publication_id) where state in ('PENDING','INVITED');
create index customer_program_requests_business on public.customer_program_requests(business_id,state,created_at desc);
create table public.customer_publication_events (
 id bigint generated always as identity primary key,
 publication_id uuid not null references public.customer_publications(id) on delete cascade,
 customer_id uuid references public.customer_accounts(id) on delete set null,
 event_type text not null check(event_type in ('OPEN','SHARE','LAUNCH','REQUEST')),
 created_at timestamptz not null default now()
);
create index customer_publication_events_summary on public.customer_publication_events(publication_id,event_type,created_at desc);
create index customer_publication_events_owner on public.customer_publication_events(customer_id) where customer_id is not null;
create table public.customer_activation_participations (
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 activation_id uuid not null references public.interactive_activations(id) on delete cascade,
 publication_id uuid references public.customer_publications(id) on delete set null,
 participant_id uuid not null unique references public.interactive_activation_participants(id) on delete cascade,
 result jsonb,
 created_at timestamptz not null default now(),
 primary key(customer_id,activation_id)
);
do $$ declare table_name text; role_name text; begin
 foreach table_name in array array['customer_publications','customer_saved_publications','customer_program_requests','customer_publication_events','customer_activation_participations'] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public',table_name);
  foreach role_name in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=role_name) then execute format('revoke all on public.%I from %I',table_name,role_name); end if;
  end loop;
 end loop;
end $$;

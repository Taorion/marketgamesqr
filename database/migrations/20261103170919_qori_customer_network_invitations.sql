create table public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  created_by uuid not null references public.app_users(id),
  request_id uuid not null,
  kind text not null check(kind in ('STAMP','AFFILIATION','GIFT','ACTIVITY','TICKET')),
  resource_id uuid,
  relationship_id uuid references public.customer_relationships(id),
  title text not null,
  message text not null default '',
  terms text not null default '',
  payload jsonb not null default '{}',
  state text not null default 'PENDING' check(state in ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  result_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '30 days',
  decided_at timestamptz,
  unique(business_id,request_id)
);
create index customer_invitations_recipient on public.customer_invitations(customer_id,created_at desc);
create index customer_invitations_sender on public.customer_invitations(business_id,customer_id,created_at desc);
create unique index customer_invitations_ticket on public.customer_invitations(resource_id) where kind='TICKET' and state in ('PENDING','ACCEPTED');
create index customer_invitations_result on public.customer_invitations(customer_id,kind,result_id) where state='ACCEPTED';
create table public.customer_business_blocks (
  customer_id uuid not null references public.customer_accounts(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(customer_id,business_id)
);
alter table public.customer_invitations enable row level security;
alter table public.customer_business_blocks enable row level security;
revoke all on public.customer_invitations,public.customer_business_blocks from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on public.customer_invitations,public.customer_business_blocks from %I',role_name);
    end if;
  end loop;
end $$;

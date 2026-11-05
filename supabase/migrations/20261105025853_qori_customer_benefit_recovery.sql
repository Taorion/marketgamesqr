alter table public.customer_accounts add column declared_document_key text check(length(declared_document_key) between 3 and 80);
create table public.customer_benefit_recovery_runs (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 request_id uuid not null,document_key text not null,proof_method text not null check(proof_method in ('ACCOUNT_EMAIL','HISTORICAL_EMAIL')),
 result jsonb not null default '{}',created_at timestamptz not null default now(),unique(customer_id,request_id)
);
create index customer_benefit_recovery_runs_owner on public.customer_benefit_recovery_runs(customer_id,created_at);
create table public.customer_benefit_recovery_challenges (
 id uuid primary key,customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 document_key text not null,email text not null,code_hash text not null,resource_ids uuid[] not null default '{}',
 attempts integer not null default 0,expires_at timestamptz not null,consumed_at timestamptz,result jsonb,
 created_at timestamptz not null default now()
);
create index customer_benefit_recovery_challenges_owner on public.customer_benefit_recovery_challenges(customer_id,created_at);
create index customer_benefit_recovery_challenges_email on public.customer_benefit_recovery_challenges(email,created_at);
create index if not exists stamp_members_customer_recovery_document on public.stamp_members(document_key);
create index if not exists affiliates_customer_recovery_document on public.affiliates((regexp_replace(lower(document_id),'[^a-z0-9]','','g')));
create index if not exists reward_passes_customer_recovery_document on public.reward_passes((regexp_replace(lower(beneficiary_document),'[^a-z0-9]','','g')));
create table public.customer_recovered_benefits (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,kind text not null check(kind in ('STAMP','AFFILIATION','GIFT','TICKET')),
 resource_id uuid not null,document_key text not null,proof_method text not null,verified_email text not null,
 created_at timestamptz not null default now(),unique(kind,resource_id)
);
create index customer_recovered_benefits_owner on public.customer_recovered_benefits(customer_id,business_id,kind,resource_id);
create index customer_recovered_benefits_document on public.customer_recovered_benefits(business_id,document_key,customer_id);
do $$ declare t text; r text; begin
 foreach t in array array['customer_recovered_benefits','customer_benefit_recovery_runs','customer_benefit_recovery_challenges'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;

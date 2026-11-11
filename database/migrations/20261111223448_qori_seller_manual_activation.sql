alter table public.app_users add column password_setup_required boolean not null default false;
alter table public.qori_seller_applications alter column accepted_at drop not null;
alter table public.qori_seller_applications add constraint qori_seller_pending_acceptance
 check(accepted_at is not null or terms_version='PENDING_ACTIVATION');
create table public.qori_seller_activations (
 user_id uuid primary key references public.app_users(id),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 completed_at timestamptz,
 created_by uuid not null references public.app_users(id),
 created_at timestamptz not null default now()
);
alter table public.qori_seller_activations enable row level security;
revoke all on public.qori_seller_activations from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on public.qori_seller_activations from %I',r);
  end if;
 end loop;
end $$;

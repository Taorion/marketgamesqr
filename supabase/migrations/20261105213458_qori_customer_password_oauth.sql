-- Server-only credentials. Never joined into customer_accounts responses or exports.
create table public.customer_password_credentials (
 customer_id uuid primary key references public.customer_accounts(id) on delete cascade,
 password_hash text not null, changed_at timestamptz not null default now()
);
create table public.customer_challenge_passwords (
 challenge_id uuid primary key references public.customer_challenges(id) on delete cascade,
 password_hash text not null
);
create table public.customer_login_attempts (
 key_hash text primary key, attempts integer not null, window_started timestamptz not null
);
create table public.customer_oauth_identities (
 provider text not null check(provider in ('google','microsoft')),
 issuer text not null, subject text not null,
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(provider,issuer,subject), unique(customer_id,provider)
);
create table public.customer_oauth_flows (
 state_hash text primary key, browser_hash text not null unique, provider text not null check(provider in ('google','microsoft')),
 nonce text not null, pkce_verifier text not null,
 customer_id uuid references public.customer_accounts(id) on delete cascade,
 status text not null default 'STARTED' check(status in ('STARTED','EXCHANGING','VERIFIED','CONSUMED','FAILED')),
 issuer text, subject text, email_hint text, name_hint text,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '10 minutes'
);
create index customer_oauth_flows_expiry on public.customer_oauth_flows(expires_at);
do $$ declare t text; r text; begin
 foreach t in array array['customer_password_credentials','customer_challenge_passwords','customer_login_attempts','customer_oauth_identities','customer_oauth_flows'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;

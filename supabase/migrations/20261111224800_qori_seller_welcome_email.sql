create table public.qori_seller_welcome_emails (
 request_id uuid primary key,
 seller_id uuid not null references public.app_users(id),
 created_by uuid not null references public.app_users(id),
 recipient text not null,
 requires_activation boolean not null,
 activation_hash text,
 encrypted_payload bytea,
 status text not null default 'PENDING' check(status in ('PENDING','SENT','FAILED','CANCELLED')),
 provider_id text,
 attempts integer not null default 0,
 last_error text,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 check(status<>'SENT' or (sent_at is not null and provider_id is not null))
);
create index qori_seller_welcome_history on public.qori_seller_welcome_emails(seller_id,created_at desc);
alter table public.qori_seller_welcome_emails enable row level security;
revoke all on public.qori_seller_welcome_emails from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
   execute format('revoke all on public.qori_seller_welcome_emails from %I',r);
  end if;
 end loop;
end $$;

-- Short CRM registration links retain the exact signed destination and its expiration.
-- They do not grant login, billing or CRM access.
create table public.qori_seller_signup_qr_links (
  token text primary key check(token ~ '^[A-Za-z0-9_-]{24}$'),
  seller_id uuid not null references public.app_users(id) on delete cascade,
  target_hash text not null check(length(target_hash)=64),
  target_url text not null check(length(target_url)<=2500),
  expires_at timestamptz not null,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(seller_id,target_hash)
);
create index qori_seller_signup_qr_links_expiry_idx on public.qori_seller_signup_qr_links(expires_at);
alter table public.qori_seller_signup_qr_links enable row level security;
revoke all on public.qori_seller_signup_qr_links from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke all on public.qori_seller_signup_qr_links from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke all on public.qori_seller_signup_qr_links from authenticated;
  end if;
end $$;

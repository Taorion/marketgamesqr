-- Permanent private record: deliberately no cascading foreign key to businesses.
-- A deleted account or a change of billing details must not restore trial eligibility.
do $migration$
begin
  create table if not exists public.qori_descubre_documents (
    document_key text primary key check (length(document_key)>0),
    business_id uuid not null,
    granted_at timestamptz not null default now()
  );
  alter table public.qori_descubre_documents enable row level security;
  revoke all on public.qori_descubre_documents from public;
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke all on public.qori_descubre_documents from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke all on public.qori_descubre_documents from authenticated;
  end if;

  insert into public.qori_descubre_documents(document_key,business_id,granted_at)
  select distinct on (document_key) document_key,id,created_at
  from (
    select b.id,b.created_at,
      regexp_replace(lower(coalesce(b.settings->>'nit','')), '[^a-z0-9]', '', 'g') as document_key
    from public.businesses b
    where upper(b.plan_code)='DESCUBRE' or b.settings ? 'qori_descubre'
      or b.settings->>'signup_type'='qori_descubre'
      or exists(select 1 from public.qori_commercial_audit a where a.entity_id=b.id and a.action='DESCUBRE_ENROLLED')
  ) history
  where document_key<>''
  order by document_key,created_at,id
  on conflict(document_key) do nothing;
end
$migration$;

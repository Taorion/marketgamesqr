create table public.qori_seller_resources (
 id uuid primary key default gen_random_uuid(),
 resource_key text not null unique check(resource_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
 title text not null check(length(title) between 3 and 140),
 description text not null default '' check(length(description)<=800),
 usage text not null default '' check(length(usage)<=2000),
 audience text not null check(audience in ('SELLER','PROSPECT')),
 stage text not null check(stage in ('START','DISCOVER','PRESENT','CLOSE','ACTIVATE','FOLLOW_UP')),
 kind text not null check(kind in ('FILE','LINK')),
 state text not null default 'DRAFT' check(state in ('DRAFT','PUBLISHED','ARCHIVED')),
 version_label text not null default '1' check(length(version_label) between 1 and 40),
 url text check(length(url)<=2000),
 filename text check(length(filename)<=180),
 mime text,
 content bytea,
 byte_size integer not null default 0 check(byte_size between 0 and 15728640),
 sha256 text,
 revision integer not null default 1 check(revision>0),
 created_by uuid not null references public.app_users(id),
 updated_by uuid not null references public.app_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(content is null or octet_length(content)=byte_size),
 check(state<>'PUBLISHED' or (kind='FILE' and content is not null and filename is not null and mime is not null and sha256 is not null) or (kind='LINK' and url like 'https://%'))
);
create index qori_seller_resources_published on public.qori_seller_resources(audience,stage,updated_at desc,id) where state='PUBLISHED';
alter table public.qori_seller_resources enable row level security;
-- JWT authorization is enforced by the existing server; no Data API access.
revoke all on table public.qori_seller_resources from public;
do $$ declare client_role text; begin
 foreach client_role in array array['anon','authenticated'] loop
  if exists(select 1 from pg_catalog.pg_roles where rolname=client_role) then
   execute format('revoke all on table public.qori_seller_resources from %I',client_role);
  end if;
 end loop;
end $$;

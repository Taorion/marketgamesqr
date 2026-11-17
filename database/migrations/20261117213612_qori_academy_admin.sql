create table public.qori_academy_settings (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default true,
 revision integer not null default 1 check(revision>0),
 updated_by uuid references public.app_users(id),
 updated_at timestamptz not null default now()
);
insert into public.qori_academy_settings(singleton) values(true) on conflict do nothing;
create table public.qori_academy_materials (
 id uuid primary key default gen_random_uuid(),
 resource_key text not null unique check(resource_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
 title text not null check(length(title) between 3 and 140),
 description text not null default '' check(length(description)<=800),
 kind text not null check(kind in ('VIDEO','FILE')),
 state text not null default 'DRAFT' check(state in ('DRAFT','PUBLISHED','ARCHIVED')),
 position integer not null default 1 check(position between 1 and 9999),
 drive_id text check(drive_id ~ '^[a-zA-Z0-9_-]{10,150}$'),
 asset_key text,
 filename text,
 mime text,
 content bytea check(octet_length(content)<=15728640),
 byte_size bigint not null default 0 check(byte_size>=0),
 sha256 text,
 revision integer not null default 1 check(revision>0),
 created_by uuid references public.app_users(id),
 updated_by uuid references public.app_users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(content is null or octet_length(content)=byte_size),
 check((kind='VIDEO' and drive_id is not null and content is null and asset_key is null) or
       (kind='FILE' and drive_id is null and filename is not null and mime is not null and
        ((asset_key is not null and content is null) or (asset_key is null and content is not null))))
);
create index qori_academy_materials_published_order on public.qori_academy_materials(position,resource_key) where state='PUBLISHED';
create index qori_academy_materials_created_by on public.qori_academy_materials(created_by);
create index qori_academy_materials_updated_by on public.qori_academy_materials(updated_by);
alter table public.qori_academy_settings enable row level security;
alter table public.qori_academy_materials enable row level security;
revoke all on public.qori_academy_settings,public.qori_academy_materials from public;
-- Server-owned authentication and authorization only; no browser Data API access.
do $$ declare client_role text; begin
 foreach client_role in array array['anon','authenticated'] loop
  if exists(select 1 from pg_catalog.pg_roles where rolname=client_role) then
   execute format('revoke all on public.qori_academy_settings,public.qori_academy_materials from %I',client_role);
  end if;
 end loop;
end $$;

-- Import the existing collection once; later migrations never overwrite Admin edits.
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('capacitacion-1','Capacitación 1','Primera sesión de capacitación para embajadores Qori.','VIDEO','PUBLISHED','1','1lhTGySneKzX9BkgqJYj7Wgp6juYQbDEX',null,null,null,'726288097') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('capacitacion-2','Capacitación 2','Continúa tu formación con la segunda sesión.','VIDEO','PUBLISHED','2','1JcwZJ9M2hEs3MzXXDPV4JC7MCKD209bb',null,null,null,'401493134') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('capacitacion-3','Capacitación 3','Completa el recorrido de las sesiones de capacitación.','VIDEO','PUBLISHED','3','1I9pJbGFBZ3i3lIUwq9t6-ofqgkUUmegf',null,null,null,'261680408') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('tarjeta-sellos','Tarjeta de sellos · video corto','Consulta el video de tarjeta de sellos antes de preparar tu demostración.','VIDEO','PUBLISHED','4','1Zf9PTAgNnph4jkS25REKMBJn_bEhTsle',null,null,null,'32891238') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('marca-filosofia','Marca y filosofía Qori','Conoce la identidad y la filosofía de Qori.','FILE','PUBLISHED','5',null,'marca-filosofia','Qori_01_Marca_y_Filosofia.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','51287') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('buyer-persona','Conoce a tu cliente ideal','Material de capacitación sobre buyer persona.','FILE','PUBLISHED','6',null,'buyer-persona','Qori_02_Capacitacion_Buyer_Persona.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','46523') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('diagnostico-comercial','Diagnóstico comercial','Prepara la conversación de diagnóstico con el negocio.','FILE','PUBLISHED','7',null,'diagnostico-comercial','Qori_03_Diagnostico_comercial.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','123215') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('elige-solucion','Conoce el negocio y elige la solución Qori','Consulta el material para relacionar las necesidades del negocio con una solución.','FILE','PUBLISHED','8',null,'elige-solucion','Qori_04_Conoce_ el negocio_ y_ elige_ la_ solución_Qori.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','49954') on conflict(resource_key) do nothing;
insert into public.qori_academy_materials(resource_key,title,description,kind,state,position,drive_id,asset_key,filename,mime,byte_size) values('apertura-comercial','Apertura comercial','Presentación breve de apertura comercial en tres diapositivas.','FILE','PUBLISHED','9',null,'apertura-comercial','Qori_Apertura_Comercial_3_Slides (1).pdf','application/pdf','72481') on conflict(resource_key) do nothing;

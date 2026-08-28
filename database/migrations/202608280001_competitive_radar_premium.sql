-- Radar Competitivo premium: relaciones tenant-safe y flujo competidor-primero.

insert into business_competitors (business_id, name, status, threat_level, notes, is_active, metadata)
select orphaned.business_id,
       'Registros históricos sin asignar',
       'INACTIVE',
       'LOW',
       'Registro técnico creado para conservar observaciones históricas que no tenían competidor asociado.',
       false,
       jsonb_build_object('source', 'competitive_radar_premium_backfill', 'system_record', true)
from (
  select business_id from business_competitor_products p
  where p.competitor_id is null
     or not exists (select 1 from business_competitors c where c.id = p.competitor_id and c.business_id = p.business_id)
  union
  select business_id from business_competitor_findings f
  where f.competitor_id is null
     or not exists (select 1 from business_competitors c where c.id = f.competitor_id and c.business_id = f.business_id)
  union
  select business_id from business_competitor_campaigns cc
  where cc.competitor_id is null
     or not exists (select 1 from business_competitors c where c.id = cc.competitor_id and c.business_id = cc.business_id)
  union
  select business_id from business_competitor_events ce
  where ce.competitor_id is null
     or not exists (select 1 from business_competitors c where c.id = ce.competitor_id and c.business_id = ce.business_id)
  union
  select business_id from business_competitor_tasks ct
  where ct.competitor_id is null
     or not exists (select 1 from business_competitors c where c.id = ct.competitor_id and c.business_id = ct.business_id)
) orphaned
where not exists (
  select 1 from business_competitors c
  where c.business_id = orphaned.business_id
    and lower(c.name) = lower('Registros históricos sin asignar')
);

update business_competitors
set is_active = false, status = 'INACTIVE', updated_at = now()
where metadata ->> 'source' = 'competitive_radar_premium_backfill';

update business_competitor_products p
set competitor_id = c.id,
    competitor_name = c.name,
    updated_at = now()
from business_competitors c
where c.business_id = p.business_id
  and lower(c.name) = lower('Registros históricos sin asignar')
  and (
    p.competitor_id is null
    or not exists (select 1 from business_competitors valid where valid.id = p.competitor_id and valid.business_id = p.business_id)
  );

update business_competitor_findings f
set competitor_id = c.id, updated_at = now()
from business_competitors c
where c.business_id = f.business_id
  and lower(c.name) = lower('Registros históricos sin asignar')
  and (
    f.competitor_id is null
    or not exists (select 1 from business_competitors valid where valid.id = f.competitor_id and valid.business_id = f.business_id)
  );

update business_competitor_campaigns cc
set competitor_id = c.id, updated_at = now()
from business_competitors c
where c.business_id = cc.business_id
  and lower(c.name) = lower('Registros históricos sin asignar')
  and (
    cc.competitor_id is null
    or not exists (select 1 from business_competitors valid where valid.id = cc.competitor_id and valid.business_id = cc.business_id)
  );

update business_competitor_events ce
set competitor_id = c.id, updated_at = now()
from business_competitors c
where c.business_id = ce.business_id
  and lower(c.name) = lower('Registros históricos sin asignar')
  and (
    ce.competitor_id is null
    or not exists (select 1 from business_competitors valid where valid.id = ce.competitor_id and valid.business_id = ce.business_id)
  );

update business_competitor_tasks ct
set competitor_id = c.id, updated_at = now()
from business_competitors c
where c.business_id = ct.business_id
  and lower(c.name) = lower('Registros históricos sin asignar')
  and (
    ct.competitor_id is null
    or not exists (select 1 from business_competitors valid where valid.id = ct.competitor_id and valid.business_id = ct.business_id)
  );

update business_competitor_tasks ct
set finding_id = null, updated_at = now()
where ct.finding_id is not null
  and not exists (
    select 1 from business_competitor_findings f
    where f.id = ct.finding_id and f.business_id = ct.business_id
  );

update business_competitor_tasks ct
set related_campaign_id = null, updated_at = now()
where ct.related_campaign_id is not null
  and not exists (
    select 1 from campaigns c
    where c.id = ct.related_campaign_id and c.business_id = ct.business_id
  );

alter table business_competitor_products drop constraint if exists business_competitor_products_competitor_id_fkey;
alter table business_competitor_findings drop constraint if exists business_competitor_findings_competitor_id_fkey;
alter table business_competitor_campaigns drop constraint if exists business_competitor_campaigns_competitor_id_fkey;
alter table business_competitor_events drop constraint if exists business_competitor_events_competitor_id_fkey;
alter table business_competitor_tasks drop constraint if exists business_competitor_tasks_competitor_id_fkey;
alter table business_competitor_tasks drop constraint if exists business_competitor_tasks_finding_id_fkey;
alter table business_competitor_tasks drop constraint if exists business_competitor_tasks_related_campaign_id_fkey;

alter table business_competitor_products alter column competitor_id set not null;
alter table business_competitor_findings alter column competitor_id set not null;
alter table business_competitor_campaigns alter column competitor_id set not null;
alter table business_competitor_events alter column competitor_id set not null;
alter table business_competitor_tasks alter column competitor_id set not null;

create unique index if not exists idx_business_competitors_business_id_id_unique
  on business_competitors(business_id, id);
create unique index if not exists idx_business_competitor_findings_business_id_id_unique
  on business_competitor_findings(business_id, id);
create unique index if not exists idx_campaigns_business_id_id_unique
  on campaigns(business_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_products_business_competitor_fkey') then
    alter table business_competitor_products
      add constraint business_competitor_products_business_competitor_fkey
      foreign key (business_id, competitor_id) references business_competitors(business_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_findings_business_competitor_fkey') then
    alter table business_competitor_findings
      add constraint business_competitor_findings_business_competitor_fkey
      foreign key (business_id, competitor_id) references business_competitors(business_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_campaigns_business_competitor_fkey') then
    alter table business_competitor_campaigns
      add constraint business_competitor_campaigns_business_competitor_fkey
      foreign key (business_id, competitor_id) references business_competitors(business_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_events_business_competitor_fkey') then
    alter table business_competitor_events
      add constraint business_competitor_events_business_competitor_fkey
      foreign key (business_id, competitor_id) references business_competitors(business_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_tasks_business_competitor_fkey') then
    alter table business_competitor_tasks
      add constraint business_competitor_tasks_business_competitor_fkey
      foreign key (business_id, competitor_id) references business_competitors(business_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_tasks_business_finding_fkey') then
    alter table business_competitor_tasks
      add constraint business_competitor_tasks_business_finding_fkey
      foreign key (business_id, finding_id) references business_competitor_findings(business_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_tasks_business_campaign_fkey') then
    alter table business_competitor_tasks
      add constraint business_competitor_tasks_business_campaign_fkey
      foreign key (business_id, related_campaign_id) references campaigns(business_id, id) on delete restrict;
  end if;
end $$;

create index if not exists idx_business_competitor_campaigns_business_competitor_status
  on business_competitor_campaigns(business_id, competitor_id, status, starts_at desc);
create index if not exists idx_business_competitor_events_business_competitor_status
  on business_competitor_events(business_id, competitor_id, status, event_date desc);
create index if not exists idx_business_competitor_tasks_business_competitor_status
  on business_competitor_tasks(business_id, competitor_id, status, due_at asc);
create index if not exists idx_business_competitor_tasks_finding
  on business_competitor_tasks(business_id, finding_id)
  where finding_id is not null;
create index if not exists idx_business_competitor_tasks_related_campaign
  on business_competitor_tasks(business_id, related_campaign_id)
  where related_campaign_id is not null;

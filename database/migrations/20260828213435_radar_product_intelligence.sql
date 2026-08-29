-- Radar Competitivo: inteligencia integral centrada en producto.

create unique index if not exists idx_business_product_categories_business_id_id_unique
  on business_product_categories(business_id, id);
create unique index if not exists idx_business_product_subcategories_business_id_id_unique
  on business_product_subcategories(business_id, id);

alter table business_competitive_products
  add column if not exists category_id uuid,
  add column if not exists subcategory_id uuid;

alter table business_competitor_products
  add column if not exists comparison_quantity numeric(14,4) not null default 1;

alter table business_competitor_campaigns
  add column if not exists competitive_product_id uuid;
alter table business_competitor_events
  add column if not exists competitive_product_id uuid;
alter table business_competitor_findings
  add column if not exists competitive_product_id uuid;
alter table business_competitor_tasks
  add column if not exists competitive_product_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_competitive_products_business_category_fkey') then
    alter table business_competitive_products
      add constraint business_competitive_products_business_category_fkey
      foreign key (business_id, category_id)
      references business_product_categories(business_id, id)
      on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitive_products_business_subcategory_fkey') then
    alter table business_competitive_products
      add constraint business_competitive_products_business_subcategory_fkey
      foreign key (business_id, subcategory_id)
      references business_product_subcategories(business_id, id)
      on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_products_comparison_quantity_check') then
    alter table business_competitor_products
      add constraint business_competitor_products_comparison_quantity_check
      check (comparison_quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_campaigns_business_product_fkey') then
    alter table business_competitor_campaigns
      add constraint business_competitor_campaigns_business_product_fkey
      foreign key (business_id, competitive_product_id)
      references business_competitive_products(business_id, id)
      on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_events_business_product_fkey') then
    alter table business_competitor_events
      add constraint business_competitor_events_business_product_fkey
      foreign key (business_id, competitive_product_id)
      references business_competitive_products(business_id, id)
      on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_findings_business_product_fkey') then
    alter table business_competitor_findings
      add constraint business_competitor_findings_business_product_fkey
      foreign key (business_id, competitive_product_id)
      references business_competitive_products(business_id, id)
      on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_competitor_tasks_business_product_fkey') then
    alter table business_competitor_tasks
      add constraint business_competitor_tasks_business_product_fkey
      foreign key (business_id, competitive_product_id)
      references business_competitive_products(business_id, id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_business_competitive_products_taxonomy
  on business_competitive_products(business_id, category_id, subcategory_id, updated_at desc)
  where is_active = true;
create index if not exists idx_business_competitor_campaigns_product_activity
  on business_competitor_campaigns(business_id, competitive_product_id, status, starts_at desc)
  where competitive_product_id is not null;
create index if not exists idx_business_competitor_events_product_activity
  on business_competitor_events(business_id, competitive_product_id, status, event_date desc)
  where competitive_product_id is not null;
create index if not exists idx_business_competitor_findings_product_activity
  on business_competitor_findings(business_id, competitive_product_id, status, detected_at desc)
  where competitive_product_id is not null;
create index if not exists idx_business_competitor_tasks_product_activity
  on business_competitor_tasks(business_id, competitive_product_id, status, due_at asc)
  where competitive_product_id is not null;

-- Conserva registros históricos sin inferir relaciones ambiguas. Solo asigna el producto
-- cuando el proveedor tiene una única relación activa inequívoca.
with unique_provider_product as (
  select business_id, competitor_id, (array_agg(competitive_product_id order by competitive_product_id))[1] as competitive_product_id
  from business_competitor_products
  where is_active = true
  group by business_id, competitor_id
  having count(distinct competitive_product_id) = 1
)
update business_competitor_campaigns record
set competitive_product_id = relation.competitive_product_id,
    updated_at = now()
from unique_provider_product relation
where record.business_id = relation.business_id
  and record.competitor_id = relation.competitor_id
  and record.competitive_product_id is null;

with unique_provider_product as (
  select business_id, competitor_id, (array_agg(competitive_product_id order by competitive_product_id))[1] as competitive_product_id
  from business_competitor_products
  where is_active = true
  group by business_id, competitor_id
  having count(distinct competitive_product_id) = 1
)
update business_competitor_events record
set competitive_product_id = relation.competitive_product_id,
    updated_at = now()
from unique_provider_product relation
where record.business_id = relation.business_id
  and record.competitor_id = relation.competitor_id
  and record.competitive_product_id is null;

with unique_provider_product as (
  select business_id, competitor_id, (array_agg(competitive_product_id order by competitive_product_id))[1] as competitive_product_id
  from business_competitor_products
  where is_active = true
  group by business_id, competitor_id
  having count(distinct competitive_product_id) = 1
)
update business_competitor_findings record
set competitive_product_id = relation.competitive_product_id,
    updated_at = now()
from unique_provider_product relation
where record.business_id = relation.business_id
  and record.competitor_id = relation.competitor_id
  and record.competitive_product_id is null;

update business_competitor_tasks task
set competitive_product_id = finding.competitive_product_id,
    updated_at = now()
from business_competitor_findings finding
where task.business_id = finding.business_id
  and task.finding_id = finding.id
  and task.competitive_product_id is null
  and finding.competitive_product_id is not null;

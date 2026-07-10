create table if not exists business_competitors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  logo_url text,
  image_url text,
  category text,
  business_type text,
  city text,
  address text,
  operation_zone text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  whatsapp_public text,
  phone text,
  email text,
  status text not null default 'ACTIVE',
  threat_level text not null default 'MEDIUM',
  target_segment text,
  price_range text,
  main_products text,
  main_services text,
  perceived_differential text,
  value_proposition text,
  strengths text,
  weaknesses text,
  sales_channels text,
  acquisition_channels text,
  digital_presence_level text,
  physical_presence_level text,
  perceived_quality text,
  response_speed text,
  commercial_aggressiveness text,
  competes_price boolean not null default false,
  competes_quality boolean not null default false,
  competes_location boolean not null default false,
  competes_brand boolean not null default false,
  competes_experience boolean not null default false,
  competes_promotions boolean not null default false,
  competes_partnerships boolean not null default false,
  competes_social_media boolean not null default false,
  competes_events boolean not null default false,
  competes_financing boolean not null default false,
  notes text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_competitors_business_status
  on business_competitors(business_id, is_active, status, updated_at desc);

create index if not exists idx_business_competitors_threat
  on business_competitors(business_id, threat_level, updated_at desc);

create unique index if not exists idx_business_competitors_business_name_unique
  on business_competitors(business_id, lower(name));

create index if not exists idx_business_competitors_search
  on business_competitors using gin (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(city, '') || ' ' || coalesce(operation_zone, '') || ' ' || coalesce(target_segment, ''))
  );

drop trigger if exists trg_business_competitors_updated_at on business_competitors;
create trigger trg_business_competitors_updated_at
before update on business_competitors
for each row execute function set_updated_at();

alter table business_competitor_products
  add column if not exists competitor_id uuid references business_competitors(id) on delete set null,
  add column if not exists previous_price numeric(14, 2),
  add column if not exists evidence_image_url text,
  add column if not exists availability text,
  add column if not exists promotion_label text,
  add column if not exists own_product_name text,
  add column if not exists competitiveness_level text;

create index if not exists idx_business_competitor_products_competitor
  on business_competitor_products(business_id, competitor_id, observed_at desc);

insert into business_competitors (business_id, name, category, created_by_user_id, metadata)
select distinct on (business_id, lower(competitor_name))
       business_id,
       competitor_name,
       nullif(category, ''),
       created_by_user_id,
       jsonb_build_object('source', 'product_price_backfill')
from business_competitor_products p
where nullif(trim(competitor_name), '') is not null
  and not exists (
    select 1
    from business_competitors c
    where c.business_id = p.business_id
      and lower(c.name) = lower(p.competitor_name)
  )
order by business_id, lower(competitor_name), created_at asc;

update business_competitor_products p
set competitor_id = c.id
from business_competitors c
where p.competitor_id is null
  and c.business_id = p.business_id
  and lower(c.name) = lower(p.competitor_name);

create table if not exists business_competitor_findings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  competitor_id uuid references business_competitors(id) on delete set null,
  finding_type text not null default 'OTHER',
  title text not null,
  description text,
  impact_level text not null default 'MEDIUM',
  suggested_action text,
  detected_at timestamptz not null default now(),
  evidence_url text,
  evidence_image_url text,
  due_at timestamptz,
  status text not null default 'OPEN',
  is_threat boolean not null default false,
  is_opportunity boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_competitor_findings_business_status
  on business_competitor_findings(business_id, status, detected_at desc);

create index if not exists idx_business_competitor_findings_competitor
  on business_competitor_findings(business_id, competitor_id, detected_at desc);

create index if not exists idx_business_competitor_findings_type
  on business_competitor_findings(business_id, finding_type, impact_level, detected_at desc);

create index if not exists idx_business_competitor_findings_search
  on business_competitor_findings using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(suggested_action, '') || ' ' || coalesce(finding_type, ''))
  );

drop trigger if exists trg_business_competitor_findings_updated_at on business_competitor_findings;
create trigger trg_business_competitor_findings_updated_at
before update on business_competitor_findings
for each row execute function set_updated_at();

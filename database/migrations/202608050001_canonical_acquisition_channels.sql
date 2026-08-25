-- Canonical acquisition-channel references.  The legacy text column remains the
-- compatibility/display fallback for reports and integrations that have not migrated.
alter table business_sales
  add column if not exists acquisition_channel_id uuid references business_acquisition_channels(id) on delete set null,
  add column if not exists acquisition_channel_name_snapshot text,
  add column if not exists acquisition_channel_slug_snapshot text,
  add column if not exists acquisition_channel_source text;

alter table business_manual_leads
  add column if not exists acquisition_channel_id uuid references business_acquisition_channels(id) on delete set null,
  add column if not exists acquisition_channel_name_snapshot text,
  add column if not exists acquisition_channel_slug_snapshot text,
  add column if not exists acquisition_channel_source text;

alter table campaigns
  add column if not exists launch_channel_refs jsonb not null default '[]'::jsonb;

alter table business_sales
  drop constraint if exists business_sales_acquisition_channel_source_check;
alter table business_sales
  add constraint business_sales_acquisition_channel_source_check
  check (acquisition_channel_source is null or acquisition_channel_source in ('CONFIGURED', 'MANUAL_UNCONFIGURED', 'SYSTEM_SPECIAL'));

alter table business_manual_leads
  drop constraint if exists business_manual_leads_acquisition_channel_source_check;
alter table business_manual_leads
  add constraint business_manual_leads_acquisition_channel_source_check
  check (acquisition_channel_source is null or acquisition_channel_source in ('CONFIGURED', 'MANUAL_UNCONFIGURED', 'SYSTEM_SPECIAL'));

create index if not exists idx_business_sales_business_acquisition_channel_id_created
  on business_sales(business_id, acquisition_channel_id, created_at desc);
create index if not exists idx_business_manual_leads_business_acquisition_channel_id
  on business_manual_leads(business_id, acquisition_channel_id, created_at desc);
create index if not exists idx_campaigns_launch_channel_refs_gin
  on campaigns using gin (launch_channel_refs);

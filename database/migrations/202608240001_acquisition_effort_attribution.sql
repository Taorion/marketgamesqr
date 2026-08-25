alter table business_acquisition_channel_efforts
  add column if not exists tracking_token uuid not null default gen_random_uuid(),
  add column if not exists attribution_model text not null default 'LEGACY_WINDOW',
  add column if not exists interactive_activation_id uuid references interactive_activations(id) on delete set null,
  add column if not exists lead_capture_activation_id uuid references lead_capture_activations(id) on delete set null,
  add column if not exists digital_asset_id uuid references digital_assets(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_acquisition_effort_attribution_model_check'
  ) then
    alter table business_acquisition_channel_efforts
      add constraint business_acquisition_effort_attribution_model_check
      check (attribution_model in ('DIRECT_LINK', 'TRACKED_LINK', 'LEGACY_WINDOW'));
  end if;
end $$;

create unique index if not exists ux_acquisition_efforts_tracking_token
  on business_acquisition_channel_efforts(tracking_token);

create unique index if not exists ux_acquisition_efforts_active_interactive_activation
  on business_acquisition_channel_efforts(business_id, interactive_activation_id)
  where interactive_activation_id is not null and status <> 'ARCHIVED';

create unique index if not exists ux_acquisition_efforts_active_lead_capture_activation
  on business_acquisition_channel_efforts(business_id, lead_capture_activation_id)
  where lead_capture_activation_id is not null and status <> 'ARCHIVED';

create unique index if not exists ux_acquisition_efforts_active_digital_asset
  on business_acquisition_channel_efforts(business_id, digital_asset_id)
  where digital_asset_id is not null and status <> 'ARCHIVED';

create index if not exists idx_acquisition_efforts_business_status_created
  on business_acquisition_channel_efforts(business_id, status, created_at desc);

create index if not exists idx_acquisition_efforts_interactive_activation
  on business_acquisition_channel_efforts(interactive_activation_id)
  where interactive_activation_id is not null;

create index if not exists idx_acquisition_efforts_lead_capture_activation
  on business_acquisition_channel_efforts(lead_capture_activation_id)
  where lead_capture_activation_id is not null;

create index if not exists idx_acquisition_efforts_digital_asset
  on business_acquisition_channel_efforts(digital_asset_id)
  where digital_asset_id is not null;

create table if not exists business_acquisition_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  effort_id uuid not null references business_acquisition_channel_efforts(id) on delete cascade,
  channel_id uuid not null references business_acquisition_channels(id) on delete cascade,
  event_type text not null,
  source_type text not null,
  source_id uuid,
  lead_id uuid references players(id) on delete set null,
  participant_id uuid references interactive_activation_participants(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  revenue_amount numeric(14, 2) not null default 0,
  dedupe_key text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_business_acquisition_events_dedupe
  on business_acquisition_events(business_id, effort_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_business_acquisition_events_effort_time
  on business_acquisition_events(business_id, effort_id, occurred_at desc);

create index if not exists idx_business_acquisition_events_channel_time
  on business_acquisition_events(business_id, channel_id, occurred_at desc);

create index if not exists idx_business_acquisition_events_qr
  on business_acquisition_events(qr_code_id)
  where qr_code_id is not null;

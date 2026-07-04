alter table lead_capture_activations
  add column if not exists asset_id uuid references digital_assets(id) on delete set null;

alter table digital_assets
  alter column activation_id drop not null;

alter table digital_assets
  add column if not exists asset_scope text not null default 'activation',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table digital_assets
  drop constraint if exists digital_assets_asset_scope_check;

alter table digital_assets
  add constraint digital_assets_asset_scope_check
  check (asset_scope in ('library', 'activation'));

create index if not exists idx_digital_assets_business_scope_active
  on digital_assets(business_id, asset_scope, is_active, created_at desc);

create index if not exists idx_lead_capture_activations_asset
  on lead_capture_activations(asset_id);

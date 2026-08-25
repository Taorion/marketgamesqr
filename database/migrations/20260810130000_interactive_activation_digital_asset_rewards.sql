create table if not exists interactive_activation_asset_downloads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  asset_id uuid not null references digital_assets(id) on delete restrict,
  participant_id uuid not null references interactive_activation_participants(id) on delete cascade,
  reward_id uuid references interactive_activation_rewards(id) on delete set null,
  download_token text not null unique,
  downloaded_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activation_id, participant_id, asset_id)
);

create index if not exists idx_interactive_asset_downloads_token
  on interactive_activation_asset_downloads(download_token);

create index if not exists idx_interactive_asset_downloads_activation_downloaded
  on interactive_activation_asset_downloads(activation_id, downloaded_at desc);

create index if not exists idx_interactive_asset_downloads_asset
  on interactive_activation_asset_downloads(asset_id, created_at desc);

drop trigger if exists trg_interactive_activation_asset_downloads_updated_at on interactive_activation_asset_downloads;
create trigger trg_interactive_activation_asset_downloads_updated_at
before update on interactive_activation_asset_downloads
for each row execute function set_updated_at();

alter table interactive_activation_asset_downloads enable row level security;

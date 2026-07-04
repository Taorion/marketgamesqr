create table if not exists lead_capture_activations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  name text not null,
  description text,
  channel text not null default 'tienda_fisica',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED')),
  public_token text not null unique,
  public_code text not null,
  starts_at timestamptz,
  expires_at timestamptz,
  form_config jsonb not null default '{}'::jsonb,
  public_message jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists digital_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  activation_id uuid not null references lead_capture_activations(id) on delete cascade,
  title text not null,
  description text,
  file_name text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  storage_path text,
  file_data_url text not null,
  cover_image_path text,
  cover_image_data_url text,
  download_button_text text not null default 'Descargar ahora',
  category text not null default 'catalogo',
  is_active boolean not null default true,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_capture_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  activation_id uuid not null references lead_capture_activations(id) on delete cascade,
  asset_id uuid not null references digital_assets(id) on delete restrict,
  lead_id uuid references players(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  source text not null default 'captura_relampago',
  channel text not null,
  form_data jsonb not null default '{}'::jsonb,
  consent_accepted boolean not null default false,
  consent_text text,
  lead_was_existing boolean not null default false,
  download_count integer not null default 0,
  last_downloaded_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists digital_asset_downloads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  activation_id uuid not null references lead_capture_activations(id) on delete cascade,
  asset_id uuid not null references digital_assets(id) on delete restrict,
  lead_id uuid references players(id) on delete set null,
  submission_id uuid not null references lead_capture_submissions(id) on delete cascade,
  download_token text not null unique,
  downloaded_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_capture_business_created on lead_capture_activations(business_id, created_at desc);
create index if not exists idx_lead_capture_business_status on lead_capture_activations(business_id, status, created_at desc);
create index if not exists idx_lead_capture_token on lead_capture_activations(public_token);
create index if not exists idx_digital_assets_activation on digital_assets(activation_id, is_active);
create index if not exists idx_lead_capture_submissions_activation_created on lead_capture_submissions(activation_id, created_at desc);
create index if not exists idx_lead_capture_submissions_business_lead on lead_capture_submissions(business_id, lead_id, created_at desc);
create index if not exists idx_digital_asset_downloads_token on digital_asset_downloads(download_token);
create index if not exists idx_digital_asset_downloads_activation_downloaded on digital_asset_downloads(activation_id, downloaded_at desc);

drop trigger if exists trg_lead_capture_activations_updated_at on lead_capture_activations;
create trigger trg_lead_capture_activations_updated_at
before update on lead_capture_activations
for each row execute function set_updated_at();

drop trigger if exists trg_digital_assets_updated_at on digital_assets;
create trigger trg_digital_assets_updated_at
before update on digital_assets
for each row execute function set_updated_at();

alter table lead_capture_activations enable row level security;
alter table digital_assets enable row level security;
alter table lead_capture_submissions enable row level security;
alter table digital_asset_downloads enable row level security;

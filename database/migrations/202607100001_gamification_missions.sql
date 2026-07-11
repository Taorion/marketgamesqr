create table if not exists gamification_seasons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  name text not null,
  description text,
  type text not null default 'TEMPORADA_MG',
  status text not null default 'DRAFT',
  start_date date,
  end_date date,
  channel text,
  target_segment_json jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_seasons_business_status
  on gamification_seasons (business_id, status, start_date desc);

create table if not exists gamification_missions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  season_id uuid not null references gamification_seasons(id) on delete cascade,
  name text not null,
  description text,
  mission_type text not null default 'CUSTOM',
  frequency text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'DRAFT',
  rules_json jsonb not null default '{}'::jsonb,
  reward_config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_missions_business_season
  on gamification_missions (business_id, season_id, status);

create table if not exists gamification_points_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  season_id uuid references gamification_seasons(id) on delete cascade,
  mission_id uuid references gamification_missions(id) on delete set null,
  lead_id uuid references players(id) on delete set null,
  contact_id uuid,
  action_type text not null,
  points integer not null default 0,
  source_id uuid,
  source_type text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_gamification_points_business_season
  on gamification_points_ledger (business_id, season_id, created_at desc);

create table if not exists gamification_leaderboards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  season_id uuid not null references gamification_seasons(id) on delete cascade,
  name text not null,
  ranking_type text not null default 'POINTS',
  top_limit integer not null default 10,
  privacy_mode text not null default 'ALIAS',
  reward_rules_json jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_leaderboards_business_season
  on gamification_leaderboards (business_id, season_id, status);

create table if not exists gamification_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  season_id uuid not null references gamification_seasons(id) on delete cascade,
  mission_id uuid references gamification_missions(id) on delete set null,
  lead_id uuid references players(id) on delete set null,
  reward_type text not null default 'CUSTOM',
  reward_name text not null,
  status text not null default 'PENDING',
  related_ticket_id uuid references qr_codes(id) on delete set null,
  related_reward_pass_id uuid references reward_passes(id) on delete set null,
  expires_at timestamptz,
  delivered_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_rewards_business_status
  on gamification_rewards (business_id, status, created_at desc);

create table if not exists gamification_streaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  season_id uuid not null references gamification_seasons(id) on delete cascade,
  lead_id uuid references players(id) on delete set null,
  streak_type text not null,
  current_count integer not null default 0,
  target_count integer not null default 1,
  last_activity_at timestamptz,
  status text not null default 'ACTIVE',
  reward_unlocked boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gamification_streaks_business_season
  on gamification_streaks (business_id, season_id, status);

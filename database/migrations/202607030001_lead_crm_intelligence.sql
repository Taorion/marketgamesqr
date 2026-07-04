create table if not exists lead_interests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete cascade,
  source_type text not null default 'PLAYER',
  source_id uuid,
  interest_name text not null,
  source text not null default 'manual' check (source in ('manual', 'purchase', 'game', 'trivia', 'campaign', 'benefit', 'system')),
  weight integer not null default 1 check (weight between 1 and 100),
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete cascade,
  source_type text not null default 'PLAYER',
  source_id uuid,
  note text not null,
  note_type text not null default 'commercial' check (note_type in ('commercial', 'support', 'vip', 'observation', 'follow_up')),
  next_action text,
  reminder_at timestamptz,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete set null,
  source_type text not null default 'PLAYER',
  source_id uuid,
  event_type text not null,
  event_title text not null,
  event_description text,
  campaign_id uuid references campaigns(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  communication_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists lead_scores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete cascade,
  source_type text not null default 'PLAYER',
  source_id uuid,
  game_id uuid references games(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  activation_id uuid,
  score integer not null default 0 check (score >= 0),
  max_score integer check (max_score is null or max_score >= 0),
  score_type text not null default 'game',
  played_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists lead_activations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete set null,
  source_type text not null default 'PLAYER',
  source_id uuid,
  campaign_id uuid references campaigns(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  activation_type text not null,
  name text not null,
  description text,
  status text not null default 'CREATED' check (status in ('CREATED', 'SENT', 'OPENED', 'STARTED', 'COMPLETED', 'REDEEMED', 'EXPIRED', 'CANCELLED')),
  benefit_type benefit_type,
  benefit_value jsonb not null default '{}'::jsonb,
  channel text,
  expires_at timestamptz,
  score_min integer check (score_min is null or score_min >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activation_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete set null,
  activation_id uuid references lead_activations(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  type text not null,
  channel text,
  token text not null unique,
  public_url text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'OPENED', 'CLICKED', 'REDEEMED', 'EXPIRED', 'CANCELLED')),
  opened_at timestamptz,
  clicked_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists lead_communications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  lead_id uuid references players(id) on delete set null,
  source_type text not null default 'PLAYER',
  source_id uuid,
  campaign_id uuid references campaigns(id) on delete set null,
  activation_id uuid references lead_activations(id) on delete set null,
  ticket_id uuid references qr_codes(id) on delete set null,
  type text not null,
  channel text not null default 'manual',
  subject text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'opened', 'clicked', 'failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_interests_business_lead on lead_interests(business_id, lead_id, updated_at desc);
create index if not exists idx_lead_interests_business_name on lead_interests(business_id, lower(interest_name));
create unique index if not exists idx_lead_interests_unique_name
  on lead_interests(business_id, coalesce(lead_id, '00000000-0000-0000-0000-000000000000'::uuid), source_type, coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(interest_name));
create index if not exists idx_lead_notes_business_lead on lead_notes(business_id, lead_id, created_at desc);
create index if not exists idx_lead_events_business_lead_created on lead_events(business_id, lead_id, created_at desc);
create index if not exists idx_lead_events_business_type_created on lead_events(business_id, event_type, created_at desc);
create index if not exists idx_lead_scores_business_lead_played on lead_scores(business_id, lead_id, played_at desc);
create index if not exists idx_lead_activations_business_lead_created on lead_activations(business_id, lead_id, created_at desc);
create index if not exists idx_activation_links_business_token on activation_links(business_id, token);
create index if not exists idx_lead_communications_business_lead_created on lead_communications(business_id, lead_id, created_at desc);
create index if not exists idx_players_business_search_document on players(business_id, regexp_replace(lower(coalesce(document_id, '')), '[^a-z0-9]', '', 'g'));
create index if not exists idx_players_business_search_phone on players(business_id, regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'));
create index if not exists idx_players_business_search_email on players(business_id, lower(email));
create index if not exists idx_affiliates_business_document on affiliates(business_id, regexp_replace(lower(coalesce(document_id, '')), '[^a-z0-9]', '', 'g'));

drop trigger if exists trg_lead_interests_updated_at on lead_interests;
create trigger trg_lead_interests_updated_at
before update on lead_interests
for each row execute function set_updated_at();

drop trigger if exists trg_lead_notes_updated_at on lead_notes;
create trigger trg_lead_notes_updated_at
before update on lead_notes
for each row execute function set_updated_at();

drop trigger if exists trg_lead_activations_updated_at on lead_activations;
create trigger trg_lead_activations_updated_at
before update on lead_activations
for each row execute function set_updated_at();

alter table lead_interests enable row level security;
alter table lead_notes enable row level security;
alter table lead_events enable row level security;
alter table lead_scores enable row level security;
alter table lead_activations enable row level security;
alter table activation_links enable row level security;
alter table lead_communications enable row level security;

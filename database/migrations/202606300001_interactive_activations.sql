do $$ begin
  alter type qr_origin_type add value if not exists 'INTERACTIVE_ACTIVATION';
exception when duplicate_object then null;
end $$;

create table if not exists interactive_activations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  title text not null,
  description text,
  category text not null check (category in (
    'commercial',
    'survey',
    'touch',
    'minigame',
    'premium',
    'physical_store',
    'referral',
    'intent'
  )),
  activation_type text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'closed', 'archived')),
  reward_ticket_cost integer not null default 1 check (reward_ticket_cost > 0),
  reward_mode text not null default 'fixed' check (reward_mode in (
    'fixed',
    'by_score',
    'by_answer',
    'by_choice',
    'by_position',
    'by_profile',
    'manual_approval'
  )),
  reward_config jsonb not null default '{}'::jsonb,
  game_config jsonb,
  interaction_config jsonb,
  capture_config jsonb,
  visual_config jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer check (max_participants is null or max_participants > 0),
  max_rewards integer check (max_rewards is null or max_rewards > 0),
  public_slug text not null unique,
  access_qr_token text unique,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interactive_activation_questions (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  question_text text not null,
  question_type text not null,
  options jsonb,
  required boolean not null default true,
  order_index integer not null default 0,
  scoring_rules jsonb,
  branching_rules jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interactive_activation_participants (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  company_id uuid not null references businesses(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  name text,
  document text,
  phone text,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  score integer,
  result_profile text,
  status text not null default 'started' check (status in (
    'started',
    'completed',
    'rewarded',
    'pending_review',
    'disqualified',
    'abandoned'
  )),
  game_session_token text unique,
  game_session_started_at timestamptz,
  game_session_completed_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interactive_activation_answers (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  participant_id uuid not null references interactive_activation_participants(id) on delete cascade,
  question_id uuid references interactive_activation_questions(id) on delete set null,
  answer jsonb not null default '{}'::jsonb,
  score_delta integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interactive_activation_rewards (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  participant_id uuid not null references interactive_activation_participants(id) on delete cascade,
  company_id uuid not null references businesses(id) on delete cascade,
  qr_code_id uuid unique references qr_codes(id) on delete set null,
  qr_token text not null unique,
  public_code text not null unique,
  reward_type text not null,
  reward_value jsonb,
  reward_label text not null,
  reward_conditions text,
  reward_source text not null check (reward_source in ('fixed', 'score', 'answer', 'choice', 'position', 'profile', 'manual')),
  source_data jsonb,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'cancelled')),
  ticket_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interactive_score_reward_rules (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  min_score integer not null,
  max_score integer,
  reward_type text,
  reward_value jsonb,
  reward_label text,
  reward_conditions text,
  max_awards integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interactive_score_reward_rules_range check (max_score is null or max_score >= min_score)
);

create table if not exists interactive_touch_reward_zones (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  label text not null,
  position_percent numeric(5,2),
  start_percent numeric(5,2),
  end_percent numeric(5,2),
  reward_type text not null,
  reward_value jsonb,
  reward_label text not null,
  reward_conditions text,
  max_awards integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interactive_touch_position_bounds check (
    (position_percent is null or (position_percent >= 0 and position_percent <= 100))
    and (start_percent is null or (start_percent >= 0 and start_percent <= 100))
    and (end_percent is null or (end_percent >= 0 and end_percent <= 100))
    and (start_percent is null or end_percent is null or end_percent >= start_percent)
  )
);

create table if not exists interactive_ticket_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  activation_id uuid not null references interactive_activations(id) on delete cascade,
  participant_id uuid references interactive_activation_participants(id) on delete set null,
  reward_id uuid references interactive_activation_rewards(id) on delete set null,
  ledger_id uuid references business_qr_credit_ledger(id) on delete set null,
  tickets_debited integer not null check (tickets_debited > 0),
  balance_before integer not null,
  balance_after integer not null,
  transaction_type text not null default 'reward_qr_generated',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interactive_activations_company_created on interactive_activations(company_id, created_at desc);
create index if not exists idx_interactive_activations_public_slug on interactive_activations(public_slug);
create index if not exists idx_interactive_questions_activation_order on interactive_activation_questions(activation_id, order_index);
create index if not exists idx_interactive_participants_activation_created on interactive_activation_participants(activation_id, created_at desc);
create index if not exists idx_interactive_rewards_activation_created on interactive_activation_rewards(activation_id, created_at desc);
create index if not exists idx_interactive_rewards_qr_code on interactive_activation_rewards(qr_code_id);
create index if not exists idx_interactive_score_rules_activation on interactive_score_reward_rules(activation_id, min_score, max_score);
create index if not exists idx_interactive_touch_zones_activation on interactive_touch_reward_zones(activation_id);
create index if not exists idx_interactive_ticket_tx_company_created on interactive_ticket_transactions(company_id, created_at desc);

drop trigger if exists trg_interactive_activations_updated_at on interactive_activations;
create trigger trg_interactive_activations_updated_at
before update on interactive_activations
for each row execute function set_updated_at();

drop trigger if exists trg_interactive_questions_updated_at on interactive_activation_questions;
create trigger trg_interactive_questions_updated_at
before update on interactive_activation_questions
for each row execute function set_updated_at();

drop trigger if exists trg_interactive_participants_updated_at on interactive_activation_participants;
create trigger trg_interactive_participants_updated_at
before update on interactive_activation_participants
for each row execute function set_updated_at();

drop trigger if exists trg_interactive_rewards_updated_at on interactive_activation_rewards;
create trigger trg_interactive_rewards_updated_at
before update on interactive_activation_rewards
for each row execute function set_updated_at();

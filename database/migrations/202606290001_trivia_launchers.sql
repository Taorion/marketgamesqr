do $$ begin
  alter type qr_origin_type add value if not exists 'TRIVIA_LAUNCHER';
exception when duplicate_object then null;
end $$;

alter table questionnaires alter column game_id drop not null;

create table if not exists business_trivias (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  created_by_user_id uuid references app_users(id) on delete set null,
  title text not null,
  public_slug text not null unique,
  description text,
  questions jsonb not null default '[]'::jsonb,
  benefit_type benefit_type not null default 'CUSTOM',
  benefit_value jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  max_winners integer,
  status text not null default 'ACTIVE' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_trivias_questions_count check (
    jsonb_typeof(questions) = 'array'
    and jsonb_array_length(questions) between 1 and 5
  )
);

create table if not exists business_trivia_attempts (
  id uuid primary key default gen_random_uuid(),
  trivia_id uuid not null references business_trivias(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  player_id uuid references players(id) on delete set null,
  questionnaire_id uuid references questionnaires(id) on delete set null,
  qr_code_id uuid references qr_codes(id) on delete set null,
  participant_name text,
  participant_phone text,
  participant_email text,
  participant_document_id text,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total_questions integer not null default 0,
  passed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_trivias_business_created on business_trivias(business_id, created_at desc);
create index if not exists idx_business_trivias_public_slug on business_trivias(public_slug);
create index if not exists idx_business_trivia_attempts_trivia_created on business_trivia_attempts(trivia_id, created_at desc);
create index if not exists idx_business_trivia_attempts_business_created on business_trivia_attempts(business_id, created_at desc);

drop trigger if exists trg_business_trivias_updated_at on business_trivias;
create trigger trg_business_trivias_updated_at
before update on business_trivias
for each row execute function set_updated_at();

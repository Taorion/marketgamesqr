create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_user_created
  on password_reset_tokens(user_id, created_at desc);

create index if not exists idx_password_reset_tokens_active
  on password_reset_tokens(token_hash, expires_at)
  where used_at is null;

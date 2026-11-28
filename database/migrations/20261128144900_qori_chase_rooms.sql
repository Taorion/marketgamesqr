-- Backend-only multiplayer state. Organization scope is inherited from activation_id.
create table public.qori_chase_rooms (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.interactive_activations(id) on delete cascade,
  code varchar(6) not null,
  host_id uuid not null references public.interactive_activation_participants(id) on delete cascade,
  signature text not null,
  state jsonb not null,
  status text not null default 'waiting' check(status in ('waiting','countdown','running','finished','closed')),
  expires_at timestamptz not null default now()+interval '30 minutes',
  created_at timestamptz not null default now(),
  unique(activation_id,code)
);
create table public.qori_chase_members (
  participant_id uuid primary key references public.interactive_activation_participants(id) on delete cascade,
  room_id uuid not null references public.qori_chase_rooms(id) on delete cascade,
  result jsonb
);
create table public.qori_chase_rounds (
  id uuid primary key,
  room_id uuid not null references public.qori_chase_rooms(id) on delete cascade,
  state jsonb not null,
  created_at timestamptz not null default now()
);
create index qori_chase_members_room on public.qori_chase_members(room_id);
create index qori_chase_rounds_room on public.qori_chase_rounds(room_id);
create index qori_chase_rooms_active on public.qori_chase_rooms(expires_at) where status <> 'closed';
create table public.qori_chase_results (
  participant_id uuid primary key references public.interactive_activation_participants(id) on delete cascade,
  room_id uuid not null references public.qori_chase_rooms(id) on delete cascade,
  round_id uuid not null references public.qori_chase_rounds(id) on delete cascade,
  result jsonb,
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0
);
create index qori_chase_results_pending on public.qori_chase_results(next_attempt_at) where result is null;
create index qori_chase_results_room on public.qori_chase_results(room_id);
create index qori_chase_results_round on public.qori_chase_results(round_id);
alter table public.qori_chase_rooms enable row level security;
alter table public.qori_chase_members enable row level security;
alter table public.qori_chase_rounds enable row level security;
alter table public.qori_chase_results enable row level security;
revoke all on public.qori_chase_rooms,public.qori_chase_members,public.qori_chase_rounds from public,anon,authenticated;
grant all on public.qori_chase_rooms,public.qori_chase_members,public.qori_chase_rounds to service_role;
revoke all on public.qori_chase_results from public,anon,authenticated;
grant all on public.qori_chase_results to service_role;

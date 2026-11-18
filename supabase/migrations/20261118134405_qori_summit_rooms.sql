-- Backend-only durable race state. All reads/writes use the existing API session token.
create table public.qori_summit_rooms (
  id uuid primary key default gen_random_uuid(),
  activation_id uuid not null references public.interactive_activations(id) on delete cascade,
  code varchar(6) not null,
  host_id uuid not null references public.interactive_activation_participants(id) on delete cascade,
  seed text not null,
  signature text not null,
  config jsonb not null,
  prize text not null,
  status text not null default 'waiting' check (status in ('waiting','racing','finished','expired')),
  starts_at timestamptz,
  winner_id uuid references public.interactive_activation_participants(id),
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now(),
  unique (activation_id, code)
);
create table public.qori_summit_members (
  room_id uuid not null references public.qori_summit_rooms(id) on delete cascade,
  participant_id uuid primary key references public.interactive_activation_participants(id) on delete cascade,
  alias varchar(24) not null,
  ready boolean not null default false,
  state jsonb not null,
  trace jsonb not null default '[]'::jsonb,
  result jsonb,
  updated_at timestamptz not null default now()
);
create index qori_summit_members_room_idx on public.qori_summit_members(room_id);
create index qori_summit_rooms_expiry_idx on public.qori_summit_rooms(expires_at) where status in ('waiting','racing');
alter table public.qori_summit_rooms enable row level security;
alter table public.qori_summit_members enable row level security;
revoke all on public.qori_summit_rooms, public.qori_summit_members from public, anon, authenticated;
grant all on public.qori_summit_rooms, public.qori_summit_members to service_role;

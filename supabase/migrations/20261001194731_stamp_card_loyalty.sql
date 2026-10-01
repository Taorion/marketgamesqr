-- Stamp cards are served only through the authenticated backend and secret member links.
create table public.stamp_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  stamps_required integer not null check (stamps_required between 2 and 50),
  benefit_type benefit_type not null,
  benefit_value jsonb not null,
  minimum_purchase numeric(14,2) not null default 0 check (minimum_purchase >= 0),
  one_per_day boolean not null default true,
  allow_manual boolean not null default false,
  card_valid_days integer not null default 365 check (card_valid_days between 1 and 3650),
  ticket_valid_days integer not null default 30 check (ticket_valid_days between 1 and 3650),
  reward_cost numeric(14,2) not null default 0 check (reward_cost >= 0),
  ticket_cost numeric(14,2) not null default 0 check (ticket_cost >= 0),
  terms text not null default '',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ARCHIVED')),
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,business_id)
);
create index stamp_programs_business on public.stamp_programs(business_id,created_at desc);
create table public.stamp_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  program_id uuid not null,
  name text not null,
  document_key text not null check (length(document_key) between 3 and 80),
  phone text,
  email text,
  public_token text not null unique,
  consent_at timestamptz not null default now(),
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (program_id,document_key),
  unique (id,business_id),
  foreign key (program_id,business_id) references public.stamp_programs(id,business_id)
);
create index stamp_members_business on public.stamp_members(business_id,document_key);
create table public.stamp_cycles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid not null,
  cycle_number integer not null check (cycle_number > 0),
  rules jsonb not null,
  stamps integer not null default 0 check (stamps >= 0),
  expires_at timestamptz not null,
  completed_at timestamptz,
  claimed_at timestamptz,
  qr_code_id uuid unique references public.qr_codes(id),
  review_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (member_id,cycle_number),
  unique (id,member_id,business_id),
  foreign key (member_id,business_id) references public.stamp_members(id,business_id)
);
create index stamp_cycles_business on public.stamp_cycles(business_id,created_at desc);
create table public.stamp_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid not null,
  cycle_id uuid not null,
  source text not null check (source in ('SALE','MANUAL')),
  source_key text not null,
  sale_id uuid references public.business_sales(id),
  sale_amount numeric(14,2) not null default 0,
  daily_guard_date date,
  note text not null default '',
  actor_id uuid references public.app_users(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  unique (member_id,source_key),
  foreign key (cycle_id,member_id,business_id) references public.stamp_cycles(id,member_id,business_id)
);
create unique index stamp_events_daily on public.stamp_events(member_id,daily_guard_date) where voided_at is null;
create index stamp_events_cycle on public.stamp_events(cycle_id) where voided_at is null;
create index stamp_events_sale on public.stamp_events(sale_id) where sale_id is not null;
create index stamp_events_history on public.stamp_events(business_id,created_at desc,id);

-- All event writers use the same balance and reversal logic. A void never deletes evidence.
create function public.stamp_event_balance() returns trigger language plpgsql set search_path=public as $$
declare c stamp_cycles%rowtype; n integer;
begin
  perform 1 from stamp_members where id=new.member_id for update;
  select * into c from stamp_cycles where id=new.cycle_id for update;
  select count(*) into n from stamp_events where cycle_id=c.id and voided_at is null;
  update stamp_cycles set stamps=n,
    completed_at=case when n >= (rules->>'stamps_required')::integer then coalesce(completed_at,now()) else null end,
    review_required=review_required or (claimed_at is not null and n < (rules->>'stamps_required')::integer)
  where id=c.id;
  if c.qr_code_id is not null and n < (c.rules->>'stamps_required')::integer then
    update qr_codes set status='CANCELLED', metadata=metadata || '{"stamp_reversed":true}'::jsonb
    where id=c.qr_code_id and status in ('ACTIVE','CLAIMED','UNCLAIMED');
  end if;
  return new;
end $$;
create trigger stamp_event_balance_trigger after insert or update of voided_at on public.stamp_events
for each row execute function public.stamp_event_balance();

-- Canonical sales cover the validator, contact center, RMS and imports without parallel sale copies.
create function public.stamp_sale_event() returns trigger language plpgsql set search_path=public as $$
declare m stamp_members%rowtype; c stamp_cycles%rowtype; d text; at_time timestamptz;
begin
  if tg_op='UPDATE' then
    if new.sale_status is distinct from old.sale_status and new.sale_status <> 'PAID' then
      update stamp_events set voided_at=now(),void_reason='Venta anulada o dejó de estar pagada'
      where sale_id=new.id and voided_at is null;
    end if;
    if new.sale_status is not distinct from old.sale_status or new.sale_status <> 'PAID' then return new; end if;
    -- First payment can earn a stamp; source_key prevents restored sales earning twice.
  end if;
  if new.sale_status <> 'PAID' or new.sale_amount <= 0 then return new; end if;
  d=lower(regexp_replace(coalesce(new.customer_document_id,''),'[^a-zA-Z0-9]','','g'));
  if length(d)<3 then return new; end if;
  at_time=coalesce(new.paid_at,new.created_at);
  for m in select sm.* from stamp_members sm join stamp_programs p on p.id=sm.program_id
    where sm.business_id=new.business_id and sm.document_key=d and p.status='ACTIVE'
    order by sm.id for update of sm
  loop
    select * into c from stamp_cycles where member_id=m.id order by cycle_number desc limit 1 for update;
    if c.id is null or c.claimed_at is not null or c.expires_at<=now() or c.expires_at<=at_time
      or at_time<c.created_at or c.stamps >= (c.rules->>'stamps_required')::integer
      or new.sale_amount < (c.rules->>'minimum_purchase')::numeric then continue; end if;
    insert into stamp_events (business_id,member_id,cycle_id,source,source_key,sale_id,sale_amount,daily_guard_date,occurred_at,note,actor_id)
    values (m.business_id,m.id,c.id,'SALE','sale:'||new.id,new.id,new.sale_amount,
      case when (c.rules->>'one_per_day')::boolean then (at_time at time zone 'America/Bogota')::date end,
      at_time,'Compra pagada',new.seller_user_id) on conflict do nothing;
  end loop;
  return new;
end $$;
create trigger stamp_sale_event_trigger after insert or update of sale_status on public.business_sales
for each row execute function public.stamp_sale_event();

alter table public.stamp_programs enable row level security;
alter table public.stamp_members enable row level security;
alter table public.stamp_cycles enable row level security;
alter table public.stamp_events enable row level security;
revoke all on public.stamp_programs,public.stamp_members,public.stamp_cycles,public.stamp_events from public;
revoke all on function public.stamp_event_balance(),public.stamp_sale_event() from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke all on public.stamp_programs,public.stamp_members,public.stamp_cycles,public.stamp_events from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke all on public.stamp_programs,public.stamp_members,public.stamp_cycles,public.stamp_events from authenticated;
  end if;
end $$;

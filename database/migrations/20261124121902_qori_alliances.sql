-- Private business-to-business agreements. Public access is through allowlisted API DTOs.
create table if not exists qori_alliances (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references businesses(id) on delete restrict,
  ally_id uuid not null references businesses(id) on delete restrict,
  status text not null default 'DRAFT' check(status in ('DRAFT','PROPOSED','ACTIVE','PAUSED','REJECTED','CANCELLED','ARCHIVED')),
  rules jsonb not null, pending_rules jsonb, revision integer not null default 1,
  branding jsonb, public_token text not null unique,
  accepted_at timestamptz, created_by uuid references app_users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(issuer_id<>ally_id)
);
create index if not exists qori_alliances_issuer on qori_alliances(issuer_id,created_at desc);
create index if not exists qori_alliances_ally on qori_alliances(ally_id,created_at desc);
create table if not exists qori_alliance_batches (
  id uuid primary key default gen_random_uuid(), alliance_id uuid not null references qori_alliances(id) on delete restrict,
  request_key uuid not null, revision integer not null, rules jsonb not null,
  quantity integer not null check(quantity between 1 and 100000), delivered integer not null default 0,
  retired integer not null default 0, refunded integer not null default 0,
  included_quantity integer not null default 0, included_period text,
  created_at timestamptz not null default now(), closed_at timestamptz,
  unique(alliance_id,request_key), check(delivered>=0 and retired>=0 and delivered+retired<=quantity),
  check(refunded>=0 and refunded<=retired)
);
create index if not exists qori_alliance_batches_available on qori_alliance_batches(alliance_id,created_at) where closed_at is null;
create table if not exists qori_alliance_tickets (
  id uuid primary key default gen_random_uuid(), alliance_id uuid not null references qori_alliances(id) on delete restrict,
  batch_id uuid not null references qori_alliance_batches(id) on delete restrict,
  qr_code_id uuid not null unique references qr_codes(id) on delete restrict,
  issuer_player_id uuid not null references players(id) on delete restrict,
  ally_player_id uuid not null references players(id) on delete restrict,
  document_key text not null, request_key uuid not null, request_hash text not null,
  public_token text not null unique, branding jsonb not null, consent jsonb not null,
  created_at timestamptz not null default now(), unique(alliance_id,request_key)
);
create index if not exists qori_alliance_tickets_document on qori_alliance_tickets(alliance_id,document_key);
create index if not exists qori_alliance_tickets_batch on qori_alliance_tickets(batch_id);
create index if not exists qori_alliance_tickets_issuer_player on qori_alliance_tickets(issuer_player_id);
create index if not exists qori_alliance_tickets_ally_player on qori_alliance_tickets(ally_player_id);
create table if not exists qori_alliance_commissions (
  id uuid primary key default gen_random_uuid(), alliance_id uuid not null references qori_alliances(id) on delete restrict,
  ticket_id uuid not null unique references qori_alliance_tickets(id) on delete restrict,
  sale_id uuid not null unique references business_sales(id) on delete restrict,
  original_sale_amount numeric(14,2) not null check(original_sale_amount>0),
  original_amount numeric(14,2) not null check(original_amount>=0), amount numeric(14,2) not null check(amount>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists qori_alliance_commissions_alliance on qori_alliance_commissions(alliance_id,created_at desc);
create table if not exists qori_alliance_payments (
  id uuid primary key default gen_random_uuid(), commission_id uuid not null references qori_alliance_commissions(id) on delete restrict,
  request_key uuid not null unique, amount numeric(14,2) not null check(amount<>0),
  paid_at timestamptz not null, reference text not null, created_by uuid not null references app_users(id),
  reverses_id uuid unique references qori_alliance_payments(id), created_at timestamptz not null default now()
);
create index if not exists qori_alliance_payments_commission on qori_alliance_payments(commission_id);
create table if not exists qori_alliance_events (
  id uuid primary key default gen_random_uuid(), alliance_id uuid not null references qori_alliances(id) on delete cascade,
  actor_id uuid references app_users(id), action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists qori_alliance_events_alliance on qori_alliance_events(alliance_id,created_at desc);
-- Existing canonical sales remain the authority. Partial reductions proportionally adjust the
-- original commission, capped at its agreed value; overpayments remain visible for recovery.
create or replace function qori_alliance_sale_adjustment() returns trigger language plpgsql as $$
declare c qori_alliance_commissions; revised numeric(14,2);
begin
  select * into c from qori_alliance_commissions where sale_id=new.id for update;
  if not found then return new; end if;
  revised:=case when new.sale_status='PAID' and new.currency='COP' and new.paid_at is not null
    then round(c.original_amount*least(1,greatest(0,new.sale_amount)/c.original_sale_amount),2) else 0 end;
  if revised<>c.amount then
    update qori_alliance_commissions set amount=revised,updated_at=now() where id=c.id;
    insert into qori_alliance_events(alliance_id,action,details) values(c.alliance_id,'COMMISSION_ADJUSTED',
      jsonb_build_object('commission_id',c.id,'sale_id',new.id,'before',c.amount,'after',revised,'sale_status',new.sale_status));
  end if;
  return new;
end $$;
drop trigger if exists qori_alliance_sale_adjustment on business_sales;
create trigger qori_alliance_sale_adjustment after update of sale_status,sale_amount,currency,paid_at on business_sales
  for each row execute function qori_alliance_sale_adjustment();
revoke all on function qori_alliance_sale_adjustment() from public;
alter table qori_alliances enable row level security;
alter table qori_alliance_batches enable row level security;
alter table qori_alliance_tickets enable row level security;
alter table qori_alliance_commissions enable row level security;
alter table qori_alliance_payments enable row level security;
alter table qori_alliance_events enable row level security;
revoke all on qori_alliances,qori_alliance_batches,qori_alliance_tickets,qori_alliance_commissions,qori_alliance_payments,qori_alliance_events from public;
-- Backend-only tables: no anonymous or browser Supabase roles may read commissions or PII.
do $$ declare r text; begin foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then
    execute format('revoke all on qori_alliances,qori_alliance_batches,qori_alliance_tickets,qori_alliance_commissions,qori_alliance_payments,qori_alliance_events from %I',r);
  end if;
end loop; end $$;

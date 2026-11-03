-- Customer is an owner-scoped projection over the existing loyalty services.
create table if not exists customer_business_programs (
  business_id uuid primary key references businesses(id) on delete cascade,
  points_terms text not null default '',
  accumulation_terms text not null default '',
  gift_enabled boolean not null default false,
  gift_min numeric(14,2) not null default 10000 check(gift_min>0),
  gift_max numeric(14,2) not null default 1000000 check(gift_max>=gift_min),
  gift_terms text not null default '',
  gift_payment_instructions text not null default '',
  updated_at timestamptz not null default now()
);
create table if not exists customer_gift_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  buyer_id uuid references customer_accounts(id) on delete set null,
  request_id uuid not null,
  buyer_name text not null,
  recipient_email text not null,
  recipient_name text not null,
  message text not null default '',
  amount numeric(14,2) not null check(amount>0),
  currency text not null default 'COP' check(currency='COP'),
  terms_snapshot jsonb not null,
  state text not null default 'PENDING_PAYMENT' check(state in ('PENDING_PAYMENT','ISSUED','CANCELLED')),
  reward_pass_id uuid unique references reward_passes(id),
  recipient_customer_id uuid references customer_accounts(id) on delete set null,
  confirmed_by uuid references app_users(id) on delete set null,
  payment_reference text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(buyer_id,request_id),
  check((state='ISSUED')=(reward_pass_id is not null)),
  check(recipient_email=lower(btrim(recipient_email)))
);
create index if not exists customer_gift_orders_business_queue on customer_gift_orders(business_id,state,created_at desc);
create index if not exists customer_gift_orders_recipient on customer_gift_orders(recipient_email,created_at desc) where state='ISSUED';
create index if not exists customer_gift_orders_recipient_account on customer_gift_orders(recipient_customer_id) where recipient_customer_id is not null;
create index if not exists customer_reward_pass_document on reward_passes(company_id,(regexp_replace(lower(beneficiary_document),'[^a-z0-9]','','g')));
alter table customer_business_programs enable row level security;
alter table customer_gift_orders enable row level security;
revoke all on customer_business_programs,customer_gift_orders from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on customer_business_programs,customer_gift_orders from %I',role_name);
    end if;
  end loop;
end $$;

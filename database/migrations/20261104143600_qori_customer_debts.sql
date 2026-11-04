create table public.customer_debts (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 book_id uuid not null, request_id uuid not null,
 name text not null check(length(name) between 2 and 120), lender text not null default '',
 currency text not null check(currency in ('COP','USD','EUR')),
 principal numeric(14,2) not null check(principal>=0),
 rate_percent numeric(12,6) not null check(rate_percent between 0 and 1000),
 rate_type text not null check(rate_type in ('EA','EM','NAMV')),
 months integer not null check(months between 0 and 600),
 installment numeric(14,2) not null check(installment>0), monthly_fee numeric(14,2) not null default 0 check(monthly_fee>=0),
 as_of date not null, next_due date not null, anchor_day smallint not null check(anchor_day between 1 and 31),
 projection_mode text not null default 'AUTO' check(projection_mode in ('AUTO','EXTERNAL')),
 status text not null default 'ACTIVE' check(status in ('ACTIVE','PAID','ARCHIVED')),
 note text not null default '', revision integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(customer_id,request_id),unique(customer_id,id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id)
);
create index customer_debts_book on public.customer_debts(customer_id,book_id,status,next_due);
create table public.customer_debt_payments (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 debt_id uuid not null, request_id uuid not null,
 entry_id uuid not null references public.customer_entries(id), owns_entry boolean not null,
 kind text not null check(kind in ('INSTALLMENT','EXTRA','SETTLEMENT')),
 principal_paid numeric(14,2) not null check(principal_paid>=0),
 interest_paid numeric(14,2) not null check(interest_paid>=0),
 fees_paid numeric(14,2) not null check(fees_paid>=0),
 paid_on date not null, note text not null default '',
 before_value jsonb not null, after_revision integer not null,
 voided_at timestamptz,created_at timestamptz not null default now(),
 check(principal_paid+interest_paid+fees_paid>0),unique(customer_id,request_id),
 foreign key(customer_id,debt_id) references public.customer_debts(customer_id,id)
);
create unique index customer_debt_payment_entry on public.customer_debt_payments(entry_id) where voided_at is null;
create index customer_debt_payment_owner on public.customer_debt_payments(customer_id,debt_id,created_at);
create table public.customer_debt_events (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 debt_id uuid not null, action text not null,before_value jsonb,after_value jsonb,
 created_at timestamptz not null default now(),
 foreign key(customer_id,debt_id) references public.customer_debts(customer_id,id)
);
create index customer_debt_events_owner on public.customer_debt_events(customer_id,debt_id,created_at);
create table public.customer_debt_scenarios (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 book_id uuid not null,debt_id uuid,request_id uuid not null,
 name text not null check(length(name) between 2 and 120),input jsonb not null,
 created_at timestamptz not null default now(),unique(customer_id,request_id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id),
 foreign key(customer_id,debt_id) references public.customer_debts(customer_id,id)
);
create index customer_debt_scenarios_book on public.customer_debt_scenarios(customer_id,book_id,created_at);
do $$ declare t text; r text; begin
 foreach t in array array['customer_debts','customer_debt_payments','customer_debt_events','customer_debt_scenarios'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;
-- Keep a linked payment immutable even if two API requests race.
create function public.customer_debt_entry_guard() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
 if row(new.customer_id,new.book_id,new.amount,new.currency,new.kind,new.occurred_at,new.deleted_at,new.linked_sale_id)
    is distinct from row(old.customer_id,old.book_id,old.amount,old.currency,old.kind,old.occurred_at,old.deleted_at,old.linked_sale_id)
    and exists(select 1 from public.customer_debt_payments where entry_id=old.id and voided_at is null) then
  raise exception 'Unlink the debt payment before changing its expense' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function public.customer_debt_entry_guard() from public;
create trigger customer_debt_entry_guard before update on public.customer_entries
for each row execute function public.customer_debt_entry_guard();

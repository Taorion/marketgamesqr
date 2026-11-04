create table public.customer_wealth_items (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 book_id uuid not null, request_id uuid not null,
 kind text not null check(kind in('ASSET','LIABILITY')),
 category text not null check(category in('PROPERTY','VEHICLE','LIVESTOCK','INVESTMENT','RECEIVABLE','OTHER','PAYABLE')),
 name text not null check(length(name) between 2 and 120),
 amount numeric(14,2) not null check(amount>=0),
 valued_on date not null, note text not null default '' check(length(note)<=1000),
 revision integer not null default 1, deleted_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(customer_id,request_id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id),
 check((kind='LIABILITY' and category='PAYABLE') or (kind='ASSET' and category<>'PAYABLE'))
);
create index customer_wealth_owner_book on public.customer_wealth_items(customer_id,book_id) where deleted_at is null;
create table public.customer_wealth_events (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 item_id uuid not null references public.customer_wealth_items(id) on delete cascade,
 before_value jsonb,after_value jsonb not null,created_at timestamptz not null default now()
);
create index customer_wealth_events_owner on public.customer_wealth_events(customer_id,item_id,created_at desc);
alter table public.customer_wealth_items enable row level security;
alter table public.customer_wealth_events enable row level security;
revoke all on public.customer_wealth_items,public.customer_wealth_events from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.customer_wealth_items,public.customer_wealth_events from %I',r);end if;
 end loop;
end $$;

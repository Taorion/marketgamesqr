-- Customer identities use opaque backend sessions. These tables are not Data API resources.
create table public.customer_finance_books (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 request_id uuid not null default gen_random_uuid(),
 name text not null check(length(name) between 2 and 80),
 currency text not null check(currency in ('COP','USD','EUR')),
 is_default boolean not null default false,
 opening_amount numeric(14,2), opening_date date,
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(customer_id,id), unique(customer_id,request_id),
 check((opening_amount is null)=(opening_date is null))
);
create unique index customer_books_default on public.customer_finance_books(customer_id) where is_default;
insert into public.customer_finance_books(customer_id,name,currency,is_default)
 select id,'Personal',currency,true from public.customer_accounts;
-- Invoker privileges only; legacy inserts during a rolling release belong to Personal.
create function public.customer_default_finance_book() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.book_id is null then
  insert into customer_finance_books(customer_id,name,currency,is_default)
   select id,'Personal',currency,true from customer_accounts where id=new.customer_id
   on conflict(customer_id) where is_default do nothing;
  select id into new.book_id from customer_finance_books where customer_id=new.customer_id and is_default;
 end if;
 return new;
end $$;
revoke all on function public.customer_default_finance_book() from public;
do $$ declare t text; begin
 foreach t in array array['customer_entries','customer_recurring','customer_purchase_plans','customer_budgets','customer_goals'] loop
  execute format('alter table public.%I add column book_id uuid',t);
  execute format('update public.%I x set book_id=b.id from customer_finance_books b where b.customer_id=x.customer_id and b.is_default',t);
  execute format('alter table public.%I alter column book_id set not null',t);
  execute format('alter table public.%I add foreign key(customer_id,book_id) references customer_finance_books(customer_id,id)',t);
  execute format('create index %I on public.%I(customer_id,book_id)',t||'_book',t);
  execute format('create trigger customer_book_default before insert on public.%I for each row execute function customer_default_finance_book()',t);
 end loop;
end $$;
alter table public.customer_recurring add column priority text not null default 'ESSENTIAL' check(priority in ('ESSENTIAL','FLEXIBLE'));
-- A buyer may define the same category budget independently in different books.
alter table public.customer_budgets drop constraint customer_budgets_customer_id_category_period_currency_key;
alter table public.customer_budgets add unique(customer_id,book_id,category,period,currency);
create index customer_entries_book_date on public.customer_entries(customer_id,book_id,occurred_at) where deleted_at is null;
create table public.customer_finance_allocations (
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 kind text not null check(kind in ('SALE','GIFT')),
 source_id uuid not null,
 book_id uuid not null,
 primary key(customer_id,kind,source_id),
 foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id)
);
create index customer_allocations_book on public.customer_finance_allocations(customer_id,book_id);
create table public.customer_finance_transfers (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 request_id uuid not null,
 from_book_id uuid not null, to_book_id uuid not null,
 currency text not null check(currency in ('COP','USD','EUR')),
 amount numeric(14,2) not null check(amount>0),
 occurred_on date not null, note text not null default '',
 voided_at timestamptz, created_at timestamptz not null default now(),
 unique(customer_id,request_id), check(from_book_id<>to_book_id),
 foreign key(customer_id,from_book_id) references public.customer_finance_books(customer_id,id),
 foreign key(customer_id,to_book_id) references public.customer_finance_books(customer_id,id)
);
create index customer_transfers_from on public.customer_finance_transfers(customer_id,from_book_id,occurred_on) where voided_at is null;
create index customer_transfers_to on public.customer_finance_transfers(customer_id,to_book_id,occurred_on) where voided_at is null;
do $$ declare t text; r text; begin
 foreach t in array array['customer_finance_books','customer_finance_allocations','customer_finance_transfers'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on function public.customer_default_finance_book() from %I',r); end if;
 end loop;
end $$;

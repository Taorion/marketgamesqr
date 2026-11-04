create table public.customer_grocery_lists(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 book_id uuid not null,request_id uuid not null,
 title text not null check(length(title) between 2 and 160),
 currency text not null check(currency in('COP','USD','EUR')),
 target_date date,note text not null default '',
 items jsonb not null default '[]'::jsonb check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=200),
 status text not null default 'PLANNED' check(status in('PLANNED','PURCHASED','ARCHIVED')),
 revision integer not null default 1,
 entry_id uuid references public.customer_entries(id),sale_id uuid references public.business_sales(id),
 paid_on date,next_list_id uuid references public.customer_grocery_lists(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(customer_id,request_id),foreign key(customer_id,book_id) references public.customer_finance_books(customer_id,id),
 check(not(entry_id is not null and sale_id is not null))
);
create index customer_grocery_owner_book on public.customer_grocery_lists(customer_id,book_id,status,target_date);
create unique index customer_grocery_entry on public.customer_grocery_lists(entry_id) where entry_id is not null;
create unique index customer_grocery_sale on public.customer_grocery_lists(customer_id,sale_id) where sale_id is not null;
alter table public.customer_grocery_lists enable row level security;
revoke all on public.customer_grocery_lists from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.customer_grocery_lists from %I',r);end if;
 end loop;
end $$;

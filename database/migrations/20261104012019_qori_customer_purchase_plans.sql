create table public.customer_purchase_plans (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 request_id uuid not null,
 title text not null,
 category text not null,
 currency text not null check(currency in ('COP','USD','EUR')),
 estimated_amount numeric(14,2) not null check(estimated_amount>0),
 target_date date,
 note text not null default '',
 status text not null default 'PLANNED' check(status in ('PLANNED','PURCHASED','CANCELLED')),
 entry_id uuid references public.customer_entries(id) on delete set null,
 sale_id uuid references public.business_sales(id) on delete set null,
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(customer_id,request_id),
 check(entry_id is null or sale_id is null)
);
create index customer_purchase_plans_owner on public.customer_purchase_plans(customer_id,created_at desc,id);
create index customer_purchase_plans_entry on public.customer_purchase_plans(entry_id) where entry_id is not null;
create index customer_purchase_plans_sale on public.customer_purchase_plans(sale_id) where sale_id is not null;
create unique index customer_purchase_plans_owner_entry on public.customer_purchase_plans(customer_id,entry_id) where entry_id is not null;
create unique index customer_purchase_plans_owner_sale on public.customer_purchase_plans(customer_id,sale_id) where sale_id is not null;
alter table public.customer_purchase_plans enable row level security;
revoke all on public.customer_purchase_plans from public;
do $$ declare r text; begin
 foreach r in array array['anon','authenticated'] loop
  if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.customer_purchase_plans from %I',r); end if;
 end loop;
end $$;

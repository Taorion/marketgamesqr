alter table public.customer_invitations drop constraint customer_invitations_kind_check;
alter table public.customer_invitations add constraint customer_invitations_kind_check check(kind in ('STAMP','AFFILIATION','GIFT','ACTIVITY','TICKET','SALE'));
create table public.customer_sale_deliveries (
 sale_id uuid primary key references public.business_sales(id),
 business_id uuid not null references public.businesses(id),
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 invitation_id uuid not null unique references public.customer_invitations(id) on delete cascade,
 sent_by uuid not null references public.app_users(id),
 created_at timestamptz not null default now()
);
create index customer_sale_deliveries_owner on public.customer_sale_deliveries(customer_id,created_at desc);
create index customer_sale_deliveries_business on public.customer_sale_deliveries(business_id,created_at desc);
create index customer_sale_deliveries_sender on public.customer_sale_deliveries(sent_by);
create table public.customer_finance_connections (
 customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 auto_receive boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(customer_id,business_id)
);
create index customer_finance_connections_business on public.customer_finance_connections(business_id);
create table public.customer_recurring_posts (
 recurring_id uuid not null references public.customer_recurring(id) on delete cascade,
 due_date date not null,
 entry_id uuid not null unique references public.customer_entries(id) on delete cascade,
 primary key(recurring_id,due_date)
);
do $$ declare t text; r text; begin
 foreach t in array array['customer_sale_deliveries','customer_finance_connections','customer_recurring_posts'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;

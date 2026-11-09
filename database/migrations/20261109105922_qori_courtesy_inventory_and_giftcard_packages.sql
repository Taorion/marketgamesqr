-- Extend the once-only welcome grant without replenishing previously spent units.
alter table public.qori_giftcard_credit_accounts add column welcome_granted integer not null default 5 check(welcome_granted>=0);
update public.qori_giftcard_credit_accounts set balance=balance+15,welcome_granted=20 where welcome_granted=5;
alter table public.qori_giftcard_credit_accounts alter column balance set default 20;
alter table public.qori_giftcard_credit_accounts alter column welcome_granted set default 20;

create table public.customer_courtesy_lots(
 id uuid primary key default gen_random_uuid(),
 merchant_id uuid not null references public.businesses(id),
 owner_customer_id uuid references public.customer_accounts(id) on delete set null,
 owner_business_id uuid references public.businesses(id),
 created_by uuid references public.app_users(id),
 product_id uuid not null references public.business_inventory_products(id),
 publication_id uuid references public.customer_publications(id),
 request_id uuid not null, fingerprint text not null,
 source text not null check(source in ('OWN','PURCHASE')),
 quantity integer not null check(quantity between 1 and 500),
 unit_price numeric(14,2) not null check(unit_price>=0),
 state text not null default 'PENDING_PAYMENT' check(state in ('PENDING_PAYMENT','READY','CANCELLED')),
 snapshot jsonb not null,
 sale_id uuid unique references public.business_sales(id),
 confirmed_by uuid references public.app_users(id), branch_id uuid references public.branches(id),
 payment_reference text, payment_method text, paid_at timestamptz,
 created_at timestamptz not null default now(),
 check(num_nonnulls(owner_customer_id,owner_business_id)<=1),
 check(source<>'OWN' or (owner_business_id=merchant_id and unit_price=0)),
 check((state='READY')=(sale_id is not null and paid_at is not null))
);
create unique index customer_courtesy_customer_request on public.customer_courtesy_lots(owner_customer_id,request_id) where owner_customer_id is not null;
create unique index customer_courtesy_business_request on public.customer_courtesy_lots(owner_business_id,request_id) where owner_business_id is not null;
create index customer_courtesy_merchant on public.customer_courtesy_lots(merchant_id,state,created_at desc);
create index customer_courtesy_product on public.customer_courtesy_lots(product_id);
create index customer_courtesy_publication on public.customer_courtesy_lots(publication_id);
create index customer_courtesy_creator on public.customer_courtesy_lots(created_by);
create index customer_courtesy_confirmer on public.customer_courtesy_lots(confirmed_by);
create index customer_courtesy_branch on public.customer_courtesy_lots(branch_id);
alter table public.customer_courtesy_lots enable row level security;
revoke all on public.customer_courtesy_lots from public;
do $$ declare r text; begin foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.customer_courtesy_lots from %I',r); end if;
end loop; end $$;
alter table public.customer_product_gift_orders add column courtesy_lot_id uuid references public.customer_courtesy_lots(id);
create unique index customer_product_gifts_courtesy_request on public.customer_product_gift_orders(courtesy_lot_id,request_id) where courtesy_lot_id is not null;
alter table public.customer_product_gift_orders drop constraint customer_product_gift_orders_sale_id_key;
create unique index customer_product_gifts_single_sale on public.customer_product_gift_orders(sale_id) where courtesy_lot_id is null;
create index customer_product_gifts_sale on public.customer_product_gift_orders(sale_id);
alter table public.customer_product_gift_orders drop constraint customer_product_gift_orders_amount_check;
alter table public.customer_product_gift_orders add constraint customer_product_gifts_amount check(amount>0 or (amount=0 and courtesy_lot_id is not null));

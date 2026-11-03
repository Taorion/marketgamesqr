alter table public.customer_publications drop constraint customer_publications_kind_check;
alter table public.customer_publications drop constraint customer_publications_check;
alter table public.customer_publications add constraint customer_publications_kind_check check(kind in ('ACTIVITY','STAMP','AFFILIATION','GIFT','PRODUCT'));
alter table public.customer_publications add constraint customer_publications_check check((kind in ('ACTIVITY','STAMP','PRODUCT'))=(resource_id is not null));
create table public.customer_product_offers(
 publication_id uuid primary key references public.customer_publications(id) on delete cascade,
 price numeric(14,2) not null check(price>0),
 terms text not null,
 payment_instructions text not null,
 valid_days integer not null check(valid_days between 1 and 365),
 updated_at timestamptz not null default now()
);
create table public.customer_product_gift_orders(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 publication_id uuid not null references public.customer_publications(id),
 product_id uuid not null references public.business_inventory_products(id),
 buyer_id uuid references public.customer_accounts(id) on delete set null,
 recipient_id uuid references public.customer_accounts(id) on delete set null,
 request_id uuid not null,
 buyer_name text not null, recipient_name text not null,
 amount numeric(14,2) not null check(amount>0),
 message text not null default '', snapshot jsonb not null,
 state text not null default 'PENDING_PAYMENT' check(state in ('PENDING_PAYMENT','ISSUED','CANCELLED')),
 payment_reference text, payment_method text,
 confirmed_by uuid references public.app_users(id),
 sale_id uuid unique references public.business_sales(id),
 qr_code_id uuid unique references public.qr_codes(id),
 invitation_id uuid unique references public.customer_invitations(id),
 paid_at timestamptz, created_at timestamptz not null default now(),
 unique(buyer_id,request_id),
 check((state='ISSUED')=(sale_id is not null and qr_code_id is not null and invitation_id is not null))
);
create index customer_product_gifts_business on public.customer_product_gift_orders(business_id,state,created_at desc);
create index customer_product_gifts_recipient on public.customer_product_gift_orders(recipient_id,created_at desc);
create index customer_product_gifts_publication on public.customer_product_gift_orders(publication_id);
create index customer_product_gifts_product on public.customer_product_gift_orders(product_id);
do $$ declare t text; r text; begin
 foreach t in array array['customer_product_offers','customer_product_gift_orders'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public',t);
  foreach r in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on public.%I from %I',t,r); end if;
  end loop;
 end loop;
end $$;

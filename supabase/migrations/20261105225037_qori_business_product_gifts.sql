-- Empresa can issue a product gift directly from its inventory without a public offer.
alter table public.customer_product_gift_orders alter column publication_id drop not null;
alter table public.customer_product_gift_orders add constraint customer_product_gifts_origin_check
 check(publication_id is not null or coalesce(snapshot->>'source','')='BUSINESS');
create unique index customer_product_gifts_business_request on public.customer_product_gift_orders(business_id,request_id)
 where snapshot->>'source'='BUSINESS';

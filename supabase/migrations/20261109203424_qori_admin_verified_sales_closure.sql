-- Enrollment is not a paid sale. Only an explicit administrator review records closure.
alter table public.qori_sales_prospects
 add column closed_at timestamptz,
 add column closed_by uuid references public.app_users(id),
 add column closed_payment_order_id uuid references public.qr_credit_purchase_orders(id),
 add constraint qori_prospect_closure_complete check (
  (closed_at is null and closed_by is null and closed_payment_order_id is null)
  or (closed_at is not null and closed_by is not null and closed_payment_order_id is not null and business_id is not null and stage='WON')
 );
create index qori_prospect_closure_actor on public.qori_sales_prospects(closed_by) where closed_by is not null;
create index qori_prospect_closure_payment on public.qori_sales_prospects(closed_payment_order_id) where closed_payment_order_id is not null;

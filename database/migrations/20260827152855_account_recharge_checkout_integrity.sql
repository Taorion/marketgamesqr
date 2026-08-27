alter table qr_credit_purchase_orders
  add column if not exists checkout_key text,
  add column if not exists checkout_error text,
  add column if not exists checkout_expires_at timestamptz;

create unique index if not exists ux_qr_credit_purchase_orders_business_checkout_key
  on qr_credit_purchase_orders (business_id, checkout_key)
  where checkout_key is not null;

create index if not exists idx_qr_credit_purchase_orders_unfinished
  on qr_credit_purchase_orders (business_id, updated_at desc)
  where status in ('PENDING', 'ERROR');

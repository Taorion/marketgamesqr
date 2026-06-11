create index if not exists idx_qr_credit_purchase_orders_external_status
  on qr_credit_purchase_orders(external_reference, status);

create index if not exists idx_qr_credit_purchase_orders_signup_type
  on qr_credit_purchase_orders((metadata->'signup'->>'type'), created_at desc);

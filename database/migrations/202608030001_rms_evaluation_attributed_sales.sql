-- Guided Evaluation can route an Activation 1 contact to Negotiation or to a paid attributed sale.
-- The delivery state stays in RMS and lead_notes; these columns store durable sale economics.
alter table business_sales
  add column if not exists rms_source_type text,
  add column if not exists rms_source_id uuid,
  add column if not exists inventory_product_id uuid references business_inventory_products(id) on delete set null,
  add column if not exists quantity numeric(12, 2) not null default 1,
  add column if not exists unit_cost numeric(14, 2) not null default 0,
  add column if not exists product_cost_total numeric(14, 2) not null default 0,
  add column if not exists benefit_type text,
  add column if not exists benefit_cost numeric(14, 2) not null default 0,
  add column if not exists acquisition_cost numeric(14, 2) not null default 0,
  add column if not exists gross_profit numeric(14, 2) not null default 0,
  add column if not exists net_profit numeric(14, 2) not null default 0,
  add column if not exists roi numeric(14, 6),
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz,
  add column if not exists sale_status text not null default 'PAID',
  add column if not exists idempotency_key text;

create index if not exists business_sales_rms_source_created_idx
  on business_sales (business_id, rms_source_type, rms_source_id, created_at desc)
  where rms_source_id is not null;

create index if not exists business_sales_economics_created_idx
  on business_sales (business_id, created_at desc);

create index if not exists business_sales_inventory_product_idx
  on business_sales (inventory_product_id)
  where inventory_product_id is not null;

create unique index if not exists business_sales_idempotency_key_idx
  on business_sales (business_id, idempotency_key)
  where idempotency_key is not null;

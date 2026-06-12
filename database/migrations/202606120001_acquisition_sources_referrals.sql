alter table business_sales add column if not exists customer_document_id text;
alter table business_sales add column if not exists acquisition_source text;
alter table business_sales add column if not exists acquisition_channel text;
alter table business_sales add column if not exists referred_affiliate_id uuid references affiliates(id) on delete set null;
alter table business_sales add column if not exists referral_points_awarded integer not null default 0;

create index if not exists idx_business_sales_business_source_created
  on business_sales(business_id, acquisition_source, created_at desc);

create index if not exists idx_business_sales_referred_affiliate
  on business_sales(referred_affiliate_id, created_at desc);

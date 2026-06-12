do $$ begin
  alter type qr_origin_type add value if not exists 'AFFILIATE_REFERRAL';
exception when duplicate_object then null;
end $$;

alter table qr_codes add column if not exists affiliate_id uuid references affiliates(id) on delete set null;

create index if not exists idx_qr_codes_affiliate_status
  on qr_codes(affiliate_id, status, created_at desc);

create unique index if not exists idx_business_sales_qr_code_unique
  on business_sales(qr_code_id)
  where qr_code_id is not null;

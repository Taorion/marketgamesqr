create table if not exists business_customer_import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  idempotency_key text not null,
  original_filename text not null,
  status text not null default 'PROCESSING' check (status in ('PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED')),
  total_rows integer not null default 0 check (total_rows >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (business_id, idempotency_key)
);

create table if not exists business_customer_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references business_customer_import_batches(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  row_number integer not null check (row_number >= 2),
  outcome text not null check (outcome in ('CREATED', 'DUPLICATE', 'ERROR')),
  reason text,
  original_data jsonb not null default '{}'::jsonb,
  contact_source_type text,
  contact_source_id uuid,
  sale_id uuid references business_sales(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create index if not exists business_customer_import_batches_business_created_idx
  on business_customer_import_batches (business_id, created_at desc);

create index if not exists business_customer_import_rows_business_batch_idx
  on business_customer_import_rows (business_id, batch_id, row_number);

create index if not exists business_manual_leads_normalized_phone_idx
  on business_manual_leads (business_id, regexp_replace(coalesce(phone, ''), '\D', '', 'g'))
  where nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null;

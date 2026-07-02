create table if not exists business_manual_leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_by_user_id uuid references app_users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  company text,
  source text not null default 'Manual',
  source_detail text,
  interest text,
  preferred_channel text,
  preferred_contact_time text,
  status text not null default 'NEW' check (status in ('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST')),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_manual_leads_business_created
  on business_manual_leads(business_id, created_at desc);

create index if not exists idx_business_manual_leads_business_status
  on business_manual_leads(business_id, status, created_at desc);

create index if not exists idx_business_manual_leads_business_email
  on business_manual_leads(business_id, lower(email));

create index if not exists idx_business_manual_leads_business_phone
  on business_manual_leads(business_id, phone);

drop trigger if exists trg_business_manual_leads_updated_at on business_manual_leads;
create trigger trg_business_manual_leads_updated_at
before update on business_manual_leads
for each row execute function set_updated_at();

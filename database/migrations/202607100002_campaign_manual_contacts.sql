create table if not exists campaign_manual_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  manual_lead_id uuid not null references business_manual_leads(id) on delete cascade,
  assigned_by_user_id uuid references app_users(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, campaign_id, manual_lead_id)
);

create index if not exists idx_campaign_manual_contacts_campaign
  on campaign_manual_contacts(business_id, campaign_id, status, created_at desc);

create index if not exists idx_campaign_manual_contacts_manual_lead
  on campaign_manual_contacts(business_id, manual_lead_id, status, created_at desc);

drop trigger if exists trg_campaign_manual_contacts_updated_at on campaign_manual_contacts;
create trigger trg_campaign_manual_contacts_updated_at
before update on campaign_manual_contacts
for each row execute function set_updated_at();

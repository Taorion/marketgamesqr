-- Lifecycle ledger: no existing row is changed by this migration.
create table if not exists business_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('ARCHIVED','RESTORED','CANCELLED','VOIDED','DISABLED','DELETED','EVIDENCE_INVALIDATED')),
  previous_status text,
  next_status text,
  reason text,
  dependency_summary jsonb not null default '{}'::jsonb,
  idempotency_key text,
  actor_user_id uuid references app_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_lifecycle_events_entity_idx
  on business_lifecycle_events (business_id, entity_type, entity_id, created_at desc);
create index if not exists business_lifecycle_events_action_idx
  on business_lifecycle_events (business_id, action, created_at desc);
create unique index if not exists business_lifecycle_events_idempotency_idx
  on business_lifecycle_events (business_id, idempotency_key)
  where idempotency_key is not null;

alter table business_manual_leads
  drop constraint if exists business_manual_leads_status_check;
alter table business_manual_leads
  add constraint business_manual_leads_status_check
  check (status in ('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST', 'ARCHIVED'));

create index if not exists business_manual_leads_active_idx
  on business_manual_leads (business_id, updated_at desc)
  where status <> 'ARCHIVED';

create index if not exists business_sales_voided_created_idx
  on business_sales (business_id, created_at desc)
  where sale_status = 'VOIDED';

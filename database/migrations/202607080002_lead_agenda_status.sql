alter table lead_notes
  add column if not exists agenda_status text not null default 'OPEN'
    check (agenda_status in ('OPEN', 'DONE', 'CANCELLED')),
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references app_users(id) on delete set null;

create index if not exists idx_lead_notes_business_reminder_status
  on lead_notes(business_id, agenda_status, reminder_at)
  where reminder_at is not null;

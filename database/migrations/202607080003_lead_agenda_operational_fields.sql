alter table lead_notes
  add column if not exists agenda_priority text not null default 'MEDIUM'
    check (agenda_priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  add column if not exists progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  add column if not exists checklist jsonb not null default '[]'::jsonb;

create index if not exists idx_lead_notes_business_priority_reminder
  on lead_notes(business_id, agenda_priority, reminder_at)
  where reminder_at is not null;

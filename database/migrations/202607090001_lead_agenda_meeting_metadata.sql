alter table lead_notes
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_lead_notes_business_meeting_mode
  on lead_notes(business_id, (metadata->>'meeting_mode'), reminder_at)
  where reminder_at is not null;

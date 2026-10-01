-- Preserve issued cards, rewards, and history when removing a program from operation.
alter table public.stamp_programs
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.app_users(id),
  add constraint stamp_programs_deleted_is_archived check (deleted_at is null or status='ARCHIVED');

alter table questionnaires
  alter column player_id drop not null;

alter table questionnaires
  add column if not exists interactive_participant_id uuid
  references interactive_activation_participants(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'questionnaires_subject_check'
       and conrelid = 'questionnaires'::regclass
  ) then
    alter table questionnaires
      add constraint questionnaires_subject_check
      check (player_id is not null or interactive_participant_id is not null)
      not valid;
  end if;
end $$;

alter table questionnaires
  validate constraint questionnaires_subject_check;

create index if not exists idx_questionnaires_interactive_participant
  on questionnaires(interactive_participant_id, created_at desc)
  where interactive_participant_id is not null;

comment on column questionnaires.interactive_participant_id is
  'Canonical participant for interactive activation questionnaires when no players row exists.';

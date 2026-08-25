-- Each participation belongs to the canonical Qori contact that already exists
-- for the same business. A participant may therefore link to a manual contact
-- or affiliate without creating a duplicate PLAYER row.
alter table interactive_activation_participants
  add column if not exists source_type text,
  add column if not exists source_id uuid;

update interactive_activation_participants
   set source_type = coalesce(nullif(source_type, ''), 'PLAYER'),
       source_id = coalesce(source_id, player_id)
 where player_id is not null
   and (source_type is null or source_id is null);

create index if not exists idx_interactive_participants_contact_source
  on interactive_activation_participants(company_id, source_type, source_id, created_at desc);

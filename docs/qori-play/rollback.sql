-- Disable the flag and stop runtime first. No production execution is authorized.
-- Deliberately refuses removal of populated tables. Preserve evidence and references.
begin;
do $$ declare t text; populated boolean; begin
 foreach t in array array['play_events','play_reward_grants','play_sessions','play_join_tickets','play_assignments','play_campaigns','play_sponsors','play_pairings','play_screens','play_locations','play_organizations'] loop
 execute format('select exists(select 1 from %I)',t) into populated;
 if populated then raise exception 'Play data exists: disable the feature and retain data'; end if;
 end loop;
end $$;
drop table play_events,play_reward_grants,play_sessions,play_join_tickets,play_assignments,play_campaigns,play_sponsors,play_pairings,play_screens,play_locations,play_organizations;
delete from schema_migrations where id='20261122173811_qori_play_sandbox';
commit;

-- User-authorized opening: 1 December 2026, recurring indefinitely, existing settings retained.
select pg_advisory_xact_lock(hashtext('qori-demonstrations-v1'));
alter table public.qori_demo_sessions drop constraint qori_demo_sessions_local_date_check;
alter table public.qori_demo_sessions add constraint qori_demo_sessions_local_date_check check(local_date >= date '2026-12-01');
do $$
declare previous jsonb; change_id uuid;
begin
 select jsonb_build_object('approved',approved,'enabled',enabled,'settings',settings) into previous from public.qori_demo_config where singleton for update;
 update public.qori_demo_config set approved=true,enabled=true,
 settings=settings || jsonb_build_object('start_date','2026-12-01','end_date',null),updated_by=null,updated_at=now() where singleton;
 insert into public.qori_demo_events(action,actor_kind,detail)
 values('AGENDA_OPENED_DECEMBER','SYSTEM',jsonb_build_object('reason','Apertura solicitada expresamente por el responsable: desde el 1 de diciembre de 2026, sin fecha de cierre, con la configuración existente.','before',previous,'after',(select jsonb_build_object('approved',approved,'enabled',enabled,'settings',settings) from public.qori_demo_config where singleton))) returning id into change_id;
 insert into public.qori_commercial_audit(actor_id,action,entity_type,entity_id,detail)
 select null,'DEMO_AGENDA_OPENED_DECEMBER','demonstration',change_id,detail from public.qori_demo_events where id=change_id;
end $$;
-- Preserve exceptions, bookings, closed/cancelled sessions, and unconfirmed templates.
update public.qori_demo_sessions s set status='ENABLED'
where status='DRAFT' and confirmed_template and meet_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'
and not is_exception and not exists(select 1 from public.qori_demo_bookings b where b.session_id=s.id)
and not exists(select 1 from public.qori_demo_events e where e.session_id=s.id);

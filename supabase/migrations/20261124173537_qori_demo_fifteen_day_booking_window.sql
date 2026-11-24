-- User-requested rolling booking window. Preserve all sessions, reservations and other settings.
select pg_advisory_xact_lock(hashtext('qori-demonstrations-v1'));
do $$
declare previous jsonb; change_id uuid;
begin
 select jsonb_build_object('approved',approved,'enabled',enabled,'settings',settings)
 into previous from public.qori_demo_config where singleton for update;
 update public.qori_demo_config
 set settings=jsonb_set(settings,'{horizon_days}','15'::jsonb),updated_by=null,updated_at=now()
 where singleton;
 insert into public.qori_demo_events(action,actor_kind,detail)
 values('BOOKING_WINDOW_FIFTEEN_DAYS','SYSTEM',jsonb_build_object(
 'reason','Ventana móvil de 15 días solicitada para inscripción directa o acompañada por el embajador.',
 'before',previous,'after',(select jsonb_build_object('approved',approved,'enabled',enabled,'settings',settings) from public.qori_demo_config where singleton))) returning id into change_id;
 insert into public.qori_commercial_audit(actor_id,action,entity_type,entity_id,detail)
 select null,'DEMO_BOOKING_WINDOW_FIFTEEN_DAYS','demonstration',change_id,detail from public.qori_demo_events where id=change_id;
end $$;

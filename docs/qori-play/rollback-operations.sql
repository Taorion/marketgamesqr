-- Only after disabling callbacks/runtime. Does not discard queued or delivered evidence.
begin;
do $$ begin
 if exists(select 1 from play_webhook_deliveries) or exists(select 1 from play_webhooks) then
 raise exception 'Webhook data exists: disable delivery and retain data';
 end if;
end $$;
drop table play_webhook_deliveries,play_webhooks;
alter table play_reward_grants drop constraint play_reward_grants_customer_id_fkey;
alter table play_reward_grants add constraint play_reward_grants_customer_id_fkey foreign key(customer_id) references customer_accounts(id);
delete from schema_migrations where id='20261122233458_qori_play_operations';
commit;

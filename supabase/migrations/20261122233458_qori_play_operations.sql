-- Additive operations; no production enablement.
alter table play_reward_grants drop constraint play_reward_grants_customer_id_fkey;
alter table play_reward_grants add constraint play_reward_grants_customer_id_fkey foreign key(customer_id) references customer_accounts(id) on delete set null;
create table play_webhooks (
 id uuid primary key default gen_random_uuid(),app_id uuid not null references invoice_apps(id),url text not null,
 events text[] not null,secret_box text,active boolean not null default true,created_at timestamptz not null default now(),
 unique(app_id,id),check(not active or secret_box is not null)
);
create table play_webhook_deliveries (
 id uuid primary key default gen_random_uuid(),app_id uuid not null,webhook_id uuid not null,event_key text not null,payload jsonb not null,
 status text not null default 'PENDING' check(status in ('PENDING','SENDING','DELIVERED','DEAD','CANCELLED')),
 attempts integer not null default 0 check(attempts>=0),lease_id uuid,last_code text,
 next_attempt_at timestamptz not null default now(),created_at timestamptz not null default now(),
 foreign key(app_id,webhook_id) references play_webhooks(app_id,id),unique(webhook_id,event_key)
);
create index play_webhook_deliveries_due on play_webhook_deliveries(next_attempt_at) where status in ('PENDING','SENDING');
create index play_webhook_deliveries_app on play_webhook_deliveries(app_id,created_at);
do $$ declare t text;r text;begin
 foreach t in array array['play_webhooks','play_webhook_deliveries'] loop
 execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public',t);
 foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on %I from %I',t,r);end if;end loop;
 end loop;
end $$;

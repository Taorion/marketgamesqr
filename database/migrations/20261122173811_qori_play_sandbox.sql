-- Qori Play: additive sandbox, reuses Developer identity and canonical campaigns/QR.
create table play_organizations (
 partner_id uuid primary key references invoice_partners(id),
 enabled boolean not null default true, created_at timestamptz not null default now()
);
create table play_locations (
 id uuid primary key default gen_random_uuid(),partner_id uuid not null references play_organizations(partner_id),
 name text not null check(length(name) between 2 and 100),unique(partner_id,id)
);
create table play_screens (
 id uuid primary key default gen_random_uuid(),partner_id uuid not null references play_organizations(partner_id),
 app_id uuid not null,location_id uuid not null,name text not null,orientation text not null check(orientation in ('landscape','portrait')),
 active boolean not null default true,paused boolean not null default false,
 device_hash text unique,device_expires_at timestamptz,last_seen_at timestamptz,created_at timestamptz not null default now(),
 foreign key(partner_id,app_id) references invoice_apps(partner_id,id),
 foreign key(partner_id,location_id) references play_locations(partner_id,id),unique(app_id,id)
);
create index play_screens_location on play_screens(location_id);
create table play_pairings (
 id uuid primary key default gen_random_uuid(),code_hash text not null unique,challenge_hash text not null unique,
 screen_id uuid references play_screens(id),expires_at timestamptz not null,consumed_at timestamptz,created_at timestamptz not null default now()
);
create index play_pairings_screen on play_pairings(screen_id);
create index play_pairings_expiry on play_pairings(expires_at);
create table play_sponsors (
 id uuid primary key default gen_random_uuid(),app_id uuid not null references invoice_apps(id),
 campaign_id uuid not null references campaigns(id),granted_by uuid references app_users(id),revoked_at timestamptz,
 expires_at timestamptz not null,unique(app_id,campaign_id),unique(app_id,id)
);
create index play_sponsors_campaign on play_sponsors(campaign_id);
create index play_sponsors_actor on play_sponsors(granted_by);
create table play_campaigns (
 id uuid primary key default gen_random_uuid(),app_id uuid not null references invoice_apps(id),sponsor_id uuid not null,
 game_key text not null check(game_key in ('orbita','secuencia')),game_version integer not null default 1 check(game_version=1),
 config jsonb not null,approved_hash text,active boolean not null default false,
 reward_cap integer not null default 0 check(reward_cap between 0 and 10000),
 reward_cost_minor bigint not null default 0 check(reward_cost_minor>=0),
 budget_minor bigint not null default 0 check(budget_minor>=0),
 min_score integer not null default 0 check(min_score>=0),
 max_sessions integer not null default 100 check(max_sessions between 1 and 10000),created_at timestamptz not null default now(),
 foreign key(app_id,sponsor_id) references play_sponsors(app_id,id),unique(app_id,id)
);
create index play_campaigns_sponsor on play_campaigns(sponsor_id);
create table play_assignments (
 screen_id uuid primary key,app_id uuid not null,campaign_id uuid not null,
 foreign key(app_id,screen_id) references play_screens(app_id,id),
 foreign key(app_id,campaign_id) references play_campaigns(app_id,id)
);
create index play_assignments_campaign on play_assignments(campaign_id);
create table play_join_tickets (
 id uuid primary key default gen_random_uuid(),screen_id uuid not null references play_screens(id),campaign_id uuid not null references play_campaigns(id),
 token_hash text not null unique,token_box text not null,expires_at timestamptz not null,consumed_at timestamptz
);
create index play_tickets_screen on play_join_tickets(screen_id,expires_at);
create index play_tickets_campaign on play_join_tickets(campaign_id);
create table play_sessions (
 id uuid primary key default gen_random_uuid(),app_id uuid not null,screen_id uuid not null,campaign_id uuid not null,
 controller_hash text not null unique,controller_expires_at timestamptz not null,
 status text not null check(status in ('QUEUED','READY','PLAYING','PAUSED','COMPLETED','FAILED','DISCONNECTED','EXPIRED')),
 game_state jsonb not null default '{}',last_seq integer not null default 0,
 consent_version text not null,consented_at timestamptz not null default now(),
 created_at timestamptz not null default now(),started_at timestamptz,last_tick_at timestamptz,last_seen_at timestamptz not null default now(),
 disconnected_at timestamptz,finished_at timestamptz,verified_result jsonb,
 foreign key(app_id,screen_id) references play_screens(app_id,id),
 foreign key(app_id,campaign_id) references play_campaigns(app_id,id),unique(campaign_id,id)
);
create unique index play_single_player on play_sessions(screen_id) where status in ('READY','PLAYING','PAUSED','DISCONNECTED');
create index play_sessions_campaign on play_sessions(campaign_id,created_at);
create index play_sessions_queue on play_sessions(screen_id,created_at) where status='QUEUED';
create index play_sessions_expiry on play_sessions(controller_expires_at);
create table play_reward_grants (
 session_id uuid primary key,campaign_id uuid not null,customer_id uuid references customer_accounts(id),qr_code_id uuid unique references qr_codes(id),
 status text not null check(status in ('RESERVED','ISSUED','EXPIRED')),expires_at timestamptz not null,cost_minor bigint not null check(cost_minor>=0),
 consent_version text,claimed_at timestamptz,foreign key(campaign_id,session_id) references play_sessions(campaign_id,id)
);
create unique index play_reward_customer_once on play_reward_grants(campaign_id,customer_id) where customer_id is not null;
create index play_reward_grants_expiry on play_reward_grants(expires_at);
create table play_events (
 id bigint generated always as identity primary key,app_id uuid references invoice_apps(id),screen_id uuid references play_screens(id),
 campaign_id uuid references play_campaigns(id),session_id uuid references play_sessions(id),
 event_type text not null,dedupe_key text not null unique,metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
create index play_events_app on play_events(app_id,created_at);
create index play_events_screen on play_events(screen_id,created_at);
create index play_events_campaign on play_events(campaign_id,created_at);
create index play_events_session on play_events(session_id);
do $$ declare t text;r text;begin
 foreach t in array array['play_organizations','play_locations','play_screens','play_pairings','play_sponsors','play_campaigns','play_assignments','play_join_tickets','play_sessions','play_reward_grants','play_events'] loop
 execute format('alter table %I enable row level security',t);execute format('revoke all on %I from public',t);
 foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on %I from %I',t,r);end if;end loop;
 end loop;
 revoke all on sequence play_events_id_seq from public;
 foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then execute format('revoke all on sequence play_events_id_seq from %I',r);end if;end loop;
end $$;

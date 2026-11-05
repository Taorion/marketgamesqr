create index customer_stamp_contact_lookup on public.stamp_members(document_key,lower(trim(email)));
create index customer_affiliate_contact_lookup on public.affiliates((regexp_replace(lower(document_id),'[^a-z0-9]','','g')),lower(trim(email))) where status<>'DELETED';
create index customer_gift_contact_lookup on public.reward_passes((regexp_replace(lower(beneficiary_document),'[^a-z0-9]','','g')),lower(trim(beneficiary_email)));
create index customer_player_contact_lookup on public.players((regexp_replace(lower(document_id),'[^a-z0-9]','','g')),lower(trim(email)));
alter table public.customer_invitations alter column created_by drop not null;
create unique index customer_invitations_existing_benefit on public.customer_invitations(customer_id,kind,resource_id) where payload ? 'existing_benefit';
create index customer_accounts_master_lookup on public.customer_accounts(declared_document_key,email) where declared_document_key is not null;
create table public.customer_benefit_notifications (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customer_accounts(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,event_key text not null,kind text not null,
 title text not null,body text not null,resource_id uuid,invitation_id uuid references public.customer_invitations(id) on delete cascade,
 created_at timestamptz not null default now(),read_at timestamptz,unique(customer_id,event_key)
);
create index customer_benefit_notifications_inbox on public.customer_benefit_notifications(customer_id,created_at desc,id);
create index customer_benefit_notifications_unread on public.customer_benefit_notifications(customer_id) where read_at is null;
create table public.customer_benefit_events (
 id bigint generated always as identity primary key,event_key text not null unique,kind text not null,resource_id uuid not null,
 created_at timestamptz not null default now(),processed_at timestamptz
);
create index customer_benefit_events_pending on public.customer_benefit_events(id) where processed_at is null;
create table public.customer_benefit_push_deliveries (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.customer_benefit_notifications(id) on delete cascade,
 subscription_id uuid not null references public.customer_payment_push_subscriptions(id) on delete cascade,
 attempts integer not null default 0,retry_at timestamptz not null default now(),lease_until timestamptz,lease_token uuid,sent_at timestamptz,
 unique(notification_id,subscription_id)
);
create index customer_benefit_push_pending on public.customer_benefit_push_deliveries(retry_at) where sent_at is null and attempts<4;
create function public.customer_capture_benefit_event() returns trigger language plpgsql set search_path='' as $$
declare k text:=tg_argv[0]; rid uuid:=new.id; ek text:=tg_table_name||':'||new.id::text;
begin
 if tg_op='UPDATE' then
  if tg_table_name='stamp_events' then
   if new.voided_at is not distinct from old.voided_at then return new; end if; ek:=ek||':void';
  elsif tg_table_name='customer_invitations' then
   if new.state is not distinct from old.state then return new; end if; ek:=ek||':'||new.state;
  elsif tg_table_name='customer_gift_orders' then
   if new.state is not distinct from old.state then return new; end if; ek:=ek||':'||new.state;
  else
   if to_jsonb(new)-'updated_at' = to_jsonb(old)-'updated_at' then return new; end if;
   ek:=ek||':'||md5(to_jsonb(new)::text);
  end if;
 end if;
 insert into public.customer_benefit_events(event_key,kind,resource_id) values(ek,k,rid) on conflict do nothing;
 return new;
end $$;
create trigger customer_notice_stamp after insert or update of email on public.stamp_members for each row execute function public.customer_capture_benefit_event('STAMP');
create trigger customer_notice_stamp_event after insert or update of voided_at on public.stamp_events for each row execute function public.customer_capture_benefit_event('STAMP_EVENT');
create trigger customer_notice_affiliate after insert or update of email on public.affiliates for each row execute function public.customer_capture_benefit_event('AFFILIATION');
create trigger customer_notice_points after insert on public.affiliate_point_ledger for each row execute function public.customer_capture_benefit_event('POINTS_EVENT');
create trigger customer_notice_gift after insert or update of beneficiary_email,beneficiary_document on public.reward_passes for each row execute function public.customer_capture_benefit_event('GIFT');
create trigger customer_notice_ticket after insert on public.qr_codes for each row execute function public.customer_capture_benefit_event('TICKET');
create trigger customer_notice_invitation after insert or update of state on public.customer_invitations for each row execute function public.customer_capture_benefit_event('INVITATION');
create trigger customer_notice_gift_order after update of state on public.customer_gift_orders for each row execute function public.customer_capture_benefit_event('GIFT_ORDER');
alter table public.customer_benefit_notifications enable row level security;
alter table public.customer_benefit_events enable row level security;
alter table public.customer_benefit_push_deliveries enable row level security;
revoke all on public.customer_benefit_notifications,public.customer_benefit_events,public.customer_benefit_push_deliveries from public;
revoke all on function public.customer_capture_benefit_event() from public;
do $$ declare r text; begin foreach r in array array['anon','authenticated'] loop
 if exists(select 1 from pg_roles where rolname=r) then
 execute format('revoke all on public.customer_benefit_notifications,public.customer_benefit_events,public.customer_benefit_push_deliveries from %I',r);
 execute format('revoke all on function public.customer_capture_benefit_event() from %I',r); end if;
end loop;end $$;

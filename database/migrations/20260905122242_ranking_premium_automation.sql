-- Ranking Qori: automatic, idempotent activity scoring across every canonical writer.
alter table gamification_points_ledger add column if not exists campaign_id uuid references campaigns(id) on delete set null;
alter table gamification_points_ledger add column if not exists affiliate_id uuid references affiliates(id) on delete set null;
alter table gamification_points_ledger add column if not exists event_key text;
alter table gamification_points_ledger add column if not exists occurred_at timestamptz not null default now();
alter table gamification_points_ledger add column if not exists monetary_value numeric(14, 2);

alter table gamification_rewards add column if not exists contact_id uuid;
alter table gamification_rewards add column if not exists affiliate_id uuid references affiliates(id) on delete set null;
alter table gamification_rewards add column if not exists rank_position integer;
alter table gamification_rewards add column if not exists event_key text;

create unique index if not exists uq_gamification_points_event
  on gamification_points_ledger (business_id, season_id, event_key)
  where event_key is not null;

create unique index if not exists uq_gamification_reward_event
  on gamification_rewards (business_id, season_id, event_key)
  where event_key is not null;

create index if not exists idx_gamification_seasons_active_window
  on gamification_seasons (business_id, campaign_id, start_date, end_date)
  where status = 'ACTIVE';

create index if not exists idx_gamification_points_season_lead
  on gamification_points_ledger (business_id, season_id, lead_id, contact_id, occurred_at desc);

create index if not exists idx_gamification_rewards_pending
  on gamification_rewards (business_id, created_at desc)
  where status = 'PENDING';

create index if not exists idx_business_sales_ranking_window
  on business_sales (business_id, campaign_id, created_at desc);

create unique index if not exists uq_lead_notes_ranking_task
  on lead_notes (business_id, (metadata->>'ranking_task_key'))
  where nullif(metadata->>'ranking_task_key', '') is not null;

create or replace function qori_ranking_award_event(
  p_business_id uuid,
  p_campaign_id uuid,
  p_lead_id uuid,
  p_contact_id uuid,
  p_affiliate_id uuid,
  p_action_type text,
  p_source_id uuid,
  p_source_type text,
  p_event_key text,
  p_occurred_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb,
  p_monetary_value numeric default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  ranking_row record;
  inserted_count integer := 0;
begin
  if tg_op = 'UPDATE' then
    if coalesce(old.sale_status, 'PAID') = 'PAID'
       and coalesce(new.sale_status, 'PAID') <> 'PAID' then
      delete from gamification_points_ledger
      where business_id = new.business_id
        and source_id = new.id
        and source_type = 'BUSINESS_SALE'
        and action_type in ('PURCHASE', 'REBUY', 'REFERRAL');
      return new;
    end if;
  end if;

  if coalesce(new.sale_status, 'PAID') <> 'PAID' then
    return new;
  end if;

  if p_business_id is null or nullif(trim(p_action_type), '') is null or nullif(trim(p_event_key), '') is null then
    return 0;
  end if;

  for ranking_row in
    select distinct on (season.id)
      season.id as season_id,
      mission.id as mission_id,
      case when coalesce(rule.value->>'points', '') ~ '^-?[0-9]+$'
        then least(10000::numeric, greatest(-10000::numeric, (rule.value->>'points')::numeric))::integer else 0 end as points
    from gamification_seasons season
    join lateral jsonb_array_elements(
      case
        when jsonb_typeof(season.settings_json->'points_rules') = 'array' then season.settings_json->'points_rules'
        else '[]'::jsonb
      end
    ) rule(value) on upper(rule.value->>'action_type') = upper(p_action_type)
    left join lateral (
      select gm.id
      from gamification_missions gm
      where gm.business_id = season.business_id and gm.season_id = season.id
      order by gm.created_at asc
      limit 1
    ) mission on true
    where season.business_id = p_business_id
      and season.status = 'ACTIVE'
      and (season.campaign_id is null or season.campaign_id = p_campaign_id)
      and (season.start_date is null or (p_occurred_at at time zone 'America/Bogota')::date >= season.start_date)
      and (season.end_date is null or (p_occurred_at at time zone 'America/Bogota')::date <= season.end_date)
    order by season.id
  loop
    insert into gamification_points_ledger
      (business_id, campaign_id, season_id, mission_id, lead_id, contact_id, affiliate_id, action_type,
       points, source_id, source_type, event_key, occurred_at, monetary_value, metadata_json)
    values
      (p_business_id, p_campaign_id, ranking_row.season_id, ranking_row.mission_id,
       p_lead_id, p_contact_id, p_affiliate_id, upper(p_action_type), ranking_row.points,
       p_source_id, p_source_type, p_event_key, p_occurred_at, p_monetary_value,
       coalesce(p_metadata, '{}'::jsonb))
    on conflict (business_id, season_id, event_key) where event_key is not null do nothing;
    inserted_count := inserted_count + case when found then 1 else 0 end;
  end loop;

  return inserted_count;
end;
$$;

create or replace function qori_ranking_sales_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  matched_lead_id uuid;
  matched_contact_id uuid;
  phone_digits text := regexp_replace(coalesce(new.customer_phone, ''), '[^0-9]', '', 'g');
  is_rebuy boolean := false;
begin
  select p.id into matched_lead_id
  from players p
  where p.business_id = new.business_id
    and (
      (nullif(trim(new.customer_document_id), '') is not null and p.document_id = trim(new.customer_document_id))
      or (nullif(trim(new.customer_email), '') is not null and lower(p.email) = lower(trim(new.customer_email)))
      or (phone_digits <> '' and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = phone_digits)
    )
  order by p.created_at desc
  limit 1;

  if matched_lead_id is null then
    select ml.id into matched_contact_id
    from business_manual_leads ml
    where ml.business_id = new.business_id
      and (
        (nullif(trim(new.customer_email), '') is not null and lower(ml.email) = lower(trim(new.customer_email)))
        or (phone_digits <> '' and regexp_replace(coalesce(ml.phone, ''), '[^0-9]', '', 'g') = phone_digits)
      )
    order by ml.created_at desc
    limit 1;
  end if;

  perform qori_ranking_award_event(
    new.business_id, new.campaign_id, matched_lead_id, matched_contact_id, null,
    'PURCHASE', new.id, 'BUSINESS_SALE', 'sale:' || new.id || ':purchase',
    coalesce(new.paid_at, new.created_at, now()),
    jsonb_build_object('product_name', new.product_name, 'quantity', new.quantity, 'sale_status', new.sale_status),
    new.sale_amount
  );

  select exists (
    select 1
    from business_sales previous
    where previous.business_id = new.business_id
      and previous.id <> new.id
      and coalesce(previous.sale_status, 'PAID') = 'PAID'
      and coalesce(previous.paid_at, previous.created_at) < coalesce(new.paid_at, new.created_at, now())
      and (
        (nullif(trim(new.customer_document_id), '') is not null and previous.customer_document_id = trim(new.customer_document_id))
        or (nullif(trim(new.customer_email), '') is not null and lower(previous.customer_email) = lower(trim(new.customer_email)))
        or (phone_digits <> '' and regexp_replace(coalesce(previous.customer_phone, ''), '[^0-9]', '', 'g') = phone_digits)
      )
  ) into is_rebuy;

  if is_rebuy then
    perform qori_ranking_award_event(
      new.business_id, new.campaign_id, matched_lead_id, matched_contact_id, null,
      'REBUY', new.id, 'BUSINESS_SALE', 'sale:' || new.id || ':rebuy',
      coalesce(new.paid_at, new.created_at, now()), '{}'::jsonb, new.sale_amount
    );
  end if;

  if new.referred_affiliate_id is not null then
    perform qori_ranking_award_event(
      new.business_id, new.campaign_id, null, null, new.referred_affiliate_id,
      'REFERRAL', new.id, 'BUSINESS_SALE', 'sale:' || new.id || ':referral',
      coalesce(new.paid_at, new.created_at, now()),
      jsonb_build_object('affiliate_id', new.referred_affiliate_id), new.sale_amount
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qori_ranking_business_sale on business_sales;
create trigger trg_qori_ranking_business_sale
after insert or update of sale_status on business_sales
for each row execute function qori_ranking_sales_trigger();

create or replace function qori_ranking_trivia_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform qori_ranking_award_event(new.business_id, new.campaign_id, new.player_id, null, null,
    'TRIVIA_ANSWER', new.id, 'TRIVIA_ATTEMPT', 'trivia:' || new.id || ':answer', new.created_at,
    jsonb_build_object('score', new.score, 'total_questions', new.total_questions, 'passed', new.passed), null);
  perform qori_ranking_award_event(new.business_id, new.campaign_id, new.player_id, null, null,
    'WEEKLY_PARTICIPATION', new.id, 'TRIVIA_ATTEMPT', 'trivia:' || new.id || ':weekly', new.created_at, '{}'::jsonb, null);
  perform qori_ranking_award_event(new.business_id, new.campaign_id, new.player_id, null, null,
    'PARTICIPATION', new.id, 'TRIVIA_ATTEMPT', 'trivia:' || new.id || ':participation', new.created_at, '{}'::jsonb, null);
  if new.passed then
    perform qori_ranking_award_event(new.business_id, new.campaign_id, new.player_id, null, null,
      'TRIVIA_CORRECT', new.id, 'TRIVIA_ATTEMPT', 'trivia:' || new.id || ':correct', new.created_at,
      jsonb_build_object('score', new.score, 'total_questions', new.total_questions), null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qori_ranking_trivia_attempt on business_trivia_attempts;
create trigger trg_qori_ranking_trivia_attempt
after insert on business_trivia_attempts
for each row execute function qori_ranking_trivia_trigger();

create or replace function qori_ranking_participation_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  activation_campaign_id uuid;
  contact_id_value uuid;
begin
  if new.status not in ('completed', 'rewarded')
     or (tg_op = 'UPDATE' and old.status in ('completed', 'rewarded')) then
    return new;
  end if;
  select campaign_id into activation_campaign_id from interactive_activations where id = new.activation_id;
  if upper(coalesce(new.source_type, '')) = 'MANUAL' then contact_id_value := new.source_id; end if;
  perform qori_ranking_award_event(new.company_id, activation_campaign_id, new.player_id, contact_id_value, null,
    'PARTICIPATION', new.id, 'INTERACTIVE_ACTIVATION', 'activation:' || new.id || ':participation',
    coalesce(new.completed_at, new.updated_at, now()),
    jsonb_build_object('activation_id', new.activation_id, 'score', new.score, 'status', new.status), null);
  return new;
end;
$$;

drop trigger if exists trg_qori_ranking_participation on interactive_activation_participants;
create trigger trg_qori_ranking_participation
after insert or update of status on interactive_activation_participants
for each row execute function qori_ranking_participation_trigger();

create or replace function qori_ranking_redemption_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'REDEEMED' and old.status is distinct from 'REDEEMED' then
    perform qori_ranking_award_event(new.business_id, new.campaign_id, coalesce(new.player_id, new.claimed_by_player_id), null, null,
      'TICKET_REDEEMED', new.id, 'QR_CODE', 'qr:' || new.id || ':redeemed', coalesce(new.redeemed_at, now()),
      jsonb_build_object('origin_type', new.origin_type), null);
    perform qori_ranking_award_event(new.business_id, new.campaign_id, coalesce(new.player_id, new.claimed_by_player_id), null, null,
      'REDEMPTION', new.id, 'QR_CODE', 'qr:' || new.id || ':redemption', coalesce(new.redeemed_at, now()),
      jsonb_build_object('origin_type', new.origin_type), null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qori_ranking_qr_redemption on qr_codes;
create trigger trg_qori_ranking_qr_redemption
after update of status on qr_codes
for each row execute function qori_ranking_redemption_trigger();

-- These functions are internal trigger infrastructure, not public Data API endpoints.
revoke all on function qori_ranking_award_event(uuid, uuid, uuid, uuid, uuid, text, uuid, text, text, timestamptz, jsonb, numeric) from public;
revoke all on function qori_ranking_sales_trigger() from public;
revoke all on function qori_ranking_trivia_trigger() from public;
revoke all on function qori_ranking_participation_trigger() from public;
revoke all on function qori_ranking_redemption_trigger() from public;

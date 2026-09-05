-- Repair ranking automation after trigger-only variables leaked into the shared award helper.
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

revoke all on function qori_ranking_award_event(uuid, uuid, uuid, uuid, uuid, text, uuid, text, text, timestamptz, jsonb, numeric) from public;
revoke all on function qori_ranking_sales_trigger() from public;

alter table gamification_seasons
  add column if not exists archived_at timestamptz;

create index if not exists idx_gamification_seasons_visible
  on gamification_seasons (business_id, status, created_at desc)
  where archived_at is null;

create index if not exists idx_gamification_points_ranking_action
  on gamification_points_ledger (business_id, season_id, action_type, created_at desc);

create or replace function qori_ranking_affiliate_redemption_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform qori_ranking_award_event(
    new.business_id,
    null,
    null,
    null,
    new.affiliate_id,
    'REDEMPTION',
    new.id,
    'AFFILIATE_POINT_REDEMPTION',
    'affiliate-redemption:' || new.id,
    new.created_at,
    jsonb_build_object(
      'points_redeemed', new.points_redeemed,
      'description', new.description,
      'inventory_product_id', new.inventory_product_id,
      'reward_rule_id', new.reward_rule_id
    ),
    null
  );
  return new;
end;
$$;

drop trigger if exists trg_qori_ranking_affiliate_redemption on affiliate_point_redemptions;
create trigger trg_qori_ranking_affiliate_redemption
after insert on affiliate_point_redemptions
for each row execute function qori_ranking_affiliate_redemption_trigger();

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
        (nullif(trim(new.customer_document_id), '') is not null and ml.document_id = trim(new.customer_document_id))
        or (nullif(trim(new.customer_email), '') is not null and lower(ml.email) = lower(trim(new.customer_email)))
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

revoke all on function qori_ranking_affiliate_redemption_trigger() from public;
revoke all on function qori_ranking_sales_trigger() from public;

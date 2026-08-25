-- RMS inventory contract: current operations reference the tenant inventory ID;
-- snapshots preserve the commercial evidence when catalog records later change.
alter table if exists business_sales
  add column if not exists product_name_snapshot text,
  add column if not exists product_price_snapshot numeric(14,2),
  add column if not exists product_currency_snapshot text,
  add column if not exists product_source text;

update business_sales
   set product_name_snapshot = coalesce(product_name_snapshot, product_name),
       product_currency_snapshot = coalesce(product_currency_snapshot, currency),
       product_source = coalesce(product_source, case when inventory_product_id is null then 'HISTORICAL_UNLINKED' else 'INVENTORY' end)
 where product_name_snapshot is null
    or product_currency_snapshot is null
    or product_source is null;

create index if not exists rms_lead_state_recycling_schedule_idx
  on rms_lead_state (business_id, (metadata -> 'recycling' ->> 'reactivate_at'))
  where rms_phase = 'reciclaje';

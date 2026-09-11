-- A QR purchase is both an attributed sale and a canonical customer sale.
-- Backfill historical validator purchases without requiring a catalog product.
insert into business_sales (
  business_id,
  campaign_id,
  qr_code_id,
  customer_name,
  customer_phone,
  customer_email,
  customer_document_id,
  product_name,
  sale_amount,
  currency,
  seller_user_id,
  created_by_user_id,
  branch_id,
  acquisition_source,
  acquisition_channel,
  acquisition_channel_name_snapshot,
  acquisition_channel_source,
  notes,
  rms_source_type,
  rms_source_id,
  quantity,
  payment_method,
  paid_at,
  sale_status,
  idempotency_key,
  created_at,
  metadata
)
select
  sales.business_id,
  sales.campaign_id,
  sales.qr_code_id,
  player.name,
  player.phone,
  player.email,
  player.document_id,
  coalesce(
    nullif(btrim(sales.product_or_service), ''),
    nullif(btrim(items.product_summary), ''),
    'Compra registrada desde Validador'
  ),
  sales.sale_amount,
  sales.currency,
  sales.sale_confirmed_by_user_id,
  sales.sale_confirmed_by_user_id,
  sales.branch_id,
  'QR_REDEMPTION',
  coalesce(
    nullif(qr.metadata->>'acquisition_channel_name_snapshot', ''),
    nullif(qr.metadata->>'acquisition_channel', ''),
    nullif(qr.metadata->>'channel', ''),
    'Validador QR'
  ),
  coalesce(
    nullif(qr.metadata->>'acquisition_channel_name_snapshot', ''),
    nullif(qr.metadata->>'acquisition_channel', ''),
    nullif(qr.metadata->>'channel', ''),
    'Validador QR'
  ),
  'SYSTEM_SPECIAL',
  sales.notes,
  'PLAYER',
  sales.player_id,
  greatest(coalesce(items.total_quantity, 1), 1),
  sales.payment_method,
  sales.created_at,
  'PAID',
  'validator-qr-sale:' || sales.qr_code_id::text,
  sales.created_at,
  jsonb_build_object(
    'source_module', 'qr_validator',
    'crm_source_type', 'PLAYER',
    'crm_source_id', sales.player_id,
    'redemption_id', sales.redemption_id,
    'attributed_sale_id', sales.id,
    'product_catalog_required', false,
    'line_items', coalesce(sales.line_items, '[]'::jsonb),
    'benefit_application', coalesce(sales.application_summary, '{}'::jsonb),
    'historical_backfill', true
  )
from attributed_sales sales
join qr_codes qr
  on qr.id = sales.qr_code_id
 and qr.business_id = sales.business_id
left join players player
  on player.id = sales.player_id
 and player.business_id = sales.business_id
left join lateral (
  select
    string_agg(nullif(btrim(item->>'name'), ''), ', ' order by position) as product_summary,
    sum(case when coalesce(item->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$' then (item->>'quantity')::numeric else 0 end) as total_quantity
  from jsonb_array_elements(coalesce(sales.line_items, '[]'::jsonb)) with ordinality as line(item, position)
) items on true
where sales.application_mode = 'PURCHASE'
  and sales.qr_code_id is not null
  and sales.player_id is not null
  and not exists (
    select 1
    from business_sales existing
    where existing.business_id = sales.business_id
      and existing.qr_code_id = sales.qr_code_id
  )
on conflict (qr_code_id) where qr_code_id is not null do nothing;

update qr_codes qr
set sale_id = sales.id
from business_sales sales
where sales.qr_code_id = qr.id
  and sales.business_id = qr.business_id
  and qr.sale_id is distinct from sales.id;

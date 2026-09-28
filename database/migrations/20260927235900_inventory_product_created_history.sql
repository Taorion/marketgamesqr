alter table business_lifecycle_events
  drop constraint if exists business_lifecycle_events_action_check;

alter table business_lifecycle_events
  add constraint business_lifecycle_events_action_check
  check (action in ('CREATED','ARCHIVED','RESTORED','CANCELLED','VOIDED','DISABLED','DELETED','EVIDENCE_INVALIDATED'));

insert into business_lifecycle_events
  (business_id, entity_type, entity_id, action, previous_status, next_status,
   idempotency_key, actor_user_id, metadata, created_at)
select product.business_id,
       'INVENTORY_PRODUCT',
       product.id,
       'CREATED',
       null,
       null,
       concat('inventory-created:', product.id),
       product.created_by_user_id,
       jsonb_build_object(
         'product_name', product.name,
         'internal_id', product.internal_id,
         'sku', product.sku,
         'barcode', product.barcode,
         'initial_stock_quantity', null,
         'current_stock_snapshot', product.stock_quantity,
         'unit_label', product.unit_label,
         'unit_price', product.unit_price,
         'redemption_points_cost', product.redemption_points_cost,
         'source', 'HISTORICAL_BACKFILL',
         'initial_stock_known', false,
         'current_status_snapshot', product.status
       ),
       product.created_at
  from business_inventory_products product
on conflict (business_id, idempotency_key) where idempotency_key is not null
do nothing;

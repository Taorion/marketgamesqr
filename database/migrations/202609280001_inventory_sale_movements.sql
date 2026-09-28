alter table business_lifecycle_events
  drop constraint if exists business_lifecycle_events_action_check;

alter table business_lifecycle_events
  add constraint business_lifecycle_events_action_check
  check (action in ('CREATED','STOCK_SOLD','ARCHIVED','RESTORED','CANCELLED','VOIDED','DISABLED','DELETED','EVIDENCE_INVALIDATED'));

-- Purchases redeemed with a benefit were historically written as sales but did
-- not pass through the inventory synchronizer. Reconcile only that identifiable
-- flow and only when its movement ledger entry does not exist.
with pending_movements as (
  select sale.id as sale_id,
         sale.business_id,
         coalesce(sale.created_by_user_id, sale.seller_user_id) as actor_user_id,
         sale.qr_code_id,
         sale.created_at,
         product.id as product_id,
         product.name as product_name,
         product.unit_label,
         sum(greatest(0, coalesce(nullif(line->>'quantity', '')::numeric, 0))) as quantity_sold
    from business_sales sale
    cross join lateral jsonb_array_elements(coalesce(sale.metadata->'line_items', '[]'::jsonb)) line
    join business_inventory_products product
      on product.business_id = sale.business_id
     and product.id::text = line->>'inventory_product_id'
   where sale.metadata->>'source_module' = 'qr_validator'
     and sale.sale_status = 'PAID'
     and not exists (
       select 1
         from business_lifecycle_events event
        where event.business_id = sale.business_id
          and event.idempotency_key = concat('inventory-sale:validator-qr:', sale.qr_code_id, ':', product.id)
     )
   group by sale.id, sale.business_id, sale.created_by_user_id, sale.seller_user_id,
            sale.qr_code_id, sale.created_at, product.id, product.name, product.unit_label
), movement_totals as (
  select business_id, product_id, sum(quantity_sold) as quantity_sold
    from pending_movements
   group by business_id, product_id
)
update business_inventory_products product
   set stock_quantity = greatest(0, product.stock_quantity - movement.quantity_sold),
       updated_at = now()
  from movement_totals movement
 where product.business_id = movement.business_id
   and product.id = movement.product_id;

insert into business_lifecycle_events
  (business_id, entity_type, entity_id, action, previous_status, next_status,
   reason, idempotency_key, actor_user_id, metadata, created_at)
select sale.business_id,
       'INVENTORY_PRODUCT',
       product.id,
       'STOCK_SOLD',
       product.status,
       product.status,
       concat('Venta histórica reconciliada: salida de ',
              sum(greatest(0, coalesce(nullif(line->>'quantity', '')::numeric, 0))),
              ' ', coalesce(product.unit_label, 'unidad(es)'), '.'),
       concat('inventory-sale:validator-qr:', sale.qr_code_id, ':', product.id),
       coalesce(sale.created_by_user_id, sale.seller_user_id),
       jsonb_build_object(
         'product_name', product.name,
         'quantity_sold', sum(greatest(0, coalesce(nullif(line->>'quantity', '')::numeric, 0))),
         'stock_before_sale', null,
         'stock_after_sale', null,
         'unit_label', product.unit_label,
         'source', 'HISTORICAL_VALIDATOR_REPAIR',
         'sale_reference', sale.id,
         'qr_code_id', sale.qr_code_id
       ),
       sale.created_at
  from business_sales sale
  cross join lateral jsonb_array_elements(coalesce(sale.metadata->'line_items', '[]'::jsonb)) line
  join business_inventory_products product
    on product.business_id = sale.business_id
   and product.id::text = line->>'inventory_product_id'
 where sale.metadata->>'source_module' = 'qr_validator'
   and sale.sale_status = 'PAID'
 group by sale.id, sale.business_id, sale.created_by_user_id, sale.seller_user_id,
          sale.qr_code_id, sale.created_at, product.id, product.name, product.unit_label, product.status
on conflict (business_id, idempotency_key) where idempotency_key is not null
do nothing;

update business_sales
   set metadata = jsonb_set(metadata, '{products}', coalesce(metadata->'line_items', '[]'::jsonb), true)
 where metadata->>'source_module' = 'qr_validator'
   and jsonb_typeof(coalesce(metadata->'line_items', '[]'::jsonb)) = 'array'
   and not (metadata ? 'products');

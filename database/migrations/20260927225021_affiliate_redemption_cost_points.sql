alter table business_inventory_products
  add column if not exists redemption_points_cost integer not null default 0;

alter table business_inventory_products
  drop constraint if exists business_inventory_products_redemption_points_cost_check;

alter table business_inventory_products
  add constraint business_inventory_products_redemption_points_cost_check
  check (redemption_points_cost >= 0) not valid;

alter table business_inventory_products
  validate constraint business_inventory_products_redemption_points_cost_check;

comment on column business_inventory_products.redemption_points_cost is
  'Costo independiente en puntos para redimir el producto. Cero indica que aun no esta configurado para redencion.';

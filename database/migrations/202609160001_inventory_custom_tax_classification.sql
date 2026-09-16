-- Allow products to retain a stable legacy classification while their
-- tenant-defined tax_base_id remains the canonical source of the exact rate.

alter table business_inventory_products
  drop constraint if exists business_inventory_products_tax_classification_check;

alter table business_inventory_products
  add constraint business_inventory_products_tax_classification_check
  check (tax_classification in ('EXEMPT', 'EXCLUDED', 'VAT_0', 'VAT_5', 'VAT_8', 'VAT_11', 'VAT_19', 'CUSTOM'))
  not valid;

alter table business_inventory_products
  validate constraint business_inventory_products_tax_classification_check;

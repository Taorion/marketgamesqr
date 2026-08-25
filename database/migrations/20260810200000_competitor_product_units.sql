alter table business_competitor_products
  add column if not exists unit_of_measure text not null default 'unidad';

comment on column business_competitor_products.unit_of_measure is
  'Unidad comercial observada para interpretar precios comparables: unidad, kg, m, L, paquete, caja o servicio.';

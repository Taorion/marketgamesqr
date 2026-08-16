const { badRequest } = require("../utils/http");

function cleanText(value, max = 180) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : null;
}

function cleanNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function normalizeSaleProducts(products) {
  if (!Array.isArray(products)) return [];
  return products
    .map((item) => {
      const name = cleanText(item?.name || item?.product_name);
      const quantity = Math.max(1, cleanNumber(item?.quantity, 1));
      const unitPrice = cleanNumber(item?.unit_price);
      const lineTotal = cleanNumber(item?.line_total, quantity * unitPrice);
      return {
        ...item,
        name,
        inventory_product_id: item?.inventory_product_id || item?.product_id || null,
        sku: cleanText(item?.sku, 80),
        barcode: cleanText(item?.barcode, 120),
        category: cleanText(item?.category, 120),
        brand: cleanText(item?.brand, 120),
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal || quantity * unitPrice,
        currency: cleanText(item?.currency, 12),
      };
    })
    .filter((item) => item.name && item.line_total > 0);
}

async function findCatalogProduct(client, businessId, item) {
  if (item.inventory_product_id) {
    const result = await client.query(
      `select *
       from business_inventory_products
       where id = $1
         and business_id = $2
         and status <> 'ARCHIVED'
       limit 1`,
      [item.inventory_product_id, businessId]
    );
    if (!result.rowCount) {
      throw badRequest("Uno de los productos seleccionados no existe en productos activos del negocio.");
    }
    return result.rows[0];
  }

  const result = await client.query(
    `select *
     from business_inventory_products
     where business_id = $1
       and status <> 'ARCHIVED'
       and (
         lower(name) = lower($2)
         or ($3::text is not null and nullif(sku, '') = $3)
         or ($4::text is not null and nullif(barcode, '') = $4)
       )
     order by updated_at desc
     limit 1`,
    [businessId, item.name, item.sku, item.barcode]
  );
  return result.rows[0] || null;
}

async function updateCatalogProductAfterSale(client, businessId, item, product) {
  const result = await client.query(
    `update business_inventory_products
     set stock_quantity = greatest(0, stock_quantity - $3::numeric),
         unit_price = case
           when coalesce(unit_price, 0) = 0 and $4::numeric > 0 then $4::numeric
           else unit_price
         end,
         updated_at = now()
     where id = $1
       and business_id = $2
       and status <> 'ARCHIVED'
     returning *`,
    [product.id, businessId, item.quantity, item.unit_price]
  );
  if (!result.rowCount) {
    throw badRequest("Uno de los productos seleccionados no existe en productos activos del negocio.");
  }
  return result.rows[0];
}

async function createCatalogProductFromSale(client, businessId, userId, item, options = {}) {
  const metadata = {
    source: "sale_auto_product",
    source_module: options.sourceModule || "sales",
    auto_created_from_sale: true,
    created_from_sale_at: new Date().toISOString(),
    sku_from_sale: item.sku || null,
    barcode_from_sale: item.barcode || null,
  };
  const result = await client.query(
    `insert into business_inventory_products
      (business_id, internal_id, sku, barcode, name, category, brand, unit_price, price_before_tax,
       tax_classification, currency, stock_quantity, min_stock_quantity, unit_label, status, metadata, created_by_user_id)
     values ($1, concat('AUTO-', replace(gen_random_uuid()::text, '-', '')), $2, $3, $4, $5, $6, $7, $7,
             'EXEMPT', $8, 0, 0, 'unidad', 'ACTIVE', $9::jsonb, $10)
     returning *`,
    [
      businessId,
      item.sku,
      item.barcode,
      item.name,
      item.category || options.category || null,
      item.brand || null,
      item.unit_price,
      item.currency || options.currency || "COP",
      JSON.stringify(metadata),
      userId || null,
    ]
  );
  return result.rows[0];
}

function productPayload(item, product, source) {
  return {
    name: product.name,
    inventory_product_id: product.id,
    sku: product.sku || item.sku || null,
    barcode: product.barcode || item.barcode || null,
    quantity: item.quantity,
    unit_price: item.unit_price || Number(product.unit_price || 0),
    line_total: item.line_total,
    source,
  };
}

async function syncSaleProductsWithCatalog(client, businessId, userId, products, options = {}) {
  const normalizedProducts = normalizeSaleProducts(products);
  const syncedProducts = [];
  const autoCreatedProducts = [];
  const matchedProducts = [];

  for (const item of normalizedProducts) {
    const existingProduct = await findCatalogProduct(client, businessId, item);
    if (existingProduct) {
      const updatedProduct = await updateCatalogProductAfterSale(client, businessId, item, existingProduct);
      syncedProducts.push(productPayload(item, updatedProduct, item.inventory_product_id ? "catalog_selected" : "catalog_matched"));
      matchedProducts.push({ id: updatedProduct.id, name: updatedProduct.name });
      continue;
    }

    const createdProduct = await createCatalogProductFromSale(client, businessId, userId, item, options);
    syncedProducts.push(productPayload(item, createdProduct, "catalog_auto_created"));
    autoCreatedProducts.push({ id: createdProduct.id, name: createdProduct.name });
  }

  return {
    products: syncedProducts,
    autoCreatedProducts,
    matchedProducts,
  };
}

module.exports = {
  normalizeSaleProducts,
  syncSaleProductsWithCatalog,
};

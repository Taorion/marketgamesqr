const { badRequest } = require("../utils/http");

const MAX_PRODUCT_PHOTO_BYTES = 500000;
const MAX_PRODUCT_PHOTO_DATA_URL_LENGTH = Math.ceil(MAX_PRODUCT_PHOTO_BYTES / 3) * 4 + 32;

function parseInventoryPhoto(value) {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string" || value.length > MAX_PRODUCT_PHOTO_DATA_URL_LENGTH) {
    throw badRequest("La foto debe pesar como máximo 500 KB.");
  }
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw badRequest("Selecciona una foto JPG, PNG o WebP válida.");
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > MAX_PRODUCT_PHOTO_BYTES || data.toString("base64") !== match[2]) {
    throw badRequest("La foto debe ser válida y pesar como máximo 500 KB.");
  }
  const mime = match[1];
  const valid = mime === "image/png"
    ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mime === "image/jpeg"
      ? data[0] === 255 && data[1] === 216 && data[2] === 255
      : data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw badRequest("El contenido del archivo no corresponde a una foto JPG, PNG o WebP.");
  return { mime, data, size: data.length };
}

async function saveInventoryPhoto(client, businessId, productId, photo) {
  if (photo === undefined) return;
  if (photo === null) {
    await client.query("delete from business_inventory_product_photos where business_id = $1 and product_id = $2", [businessId, productId]);
    return;
  }
  const result = await client.query(
    `insert into business_inventory_product_photos (business_id, product_id, mime_type, image_data)
     select business_id, id, $3, $4 from business_inventory_products where business_id = $1 and id = $2
     on conflict (product_id) do update
       set mime_type = excluded.mime_type, image_data = excluded.image_data, updated_at = now()
       where business_inventory_product_photos.business_id = excluded.business_id
     returning product_id`,
    [businessId, productId, photo.mime, photo.data]
  );
  if (!result.rowCount) throw badRequest("Producto de inventario no encontrado.");
}

module.exports = { MAX_PRODUCT_PHOTO_BYTES, MAX_PRODUCT_PHOTO_DATA_URL_LENGTH, parseInventoryPhoto, saveInventoryPhoto };

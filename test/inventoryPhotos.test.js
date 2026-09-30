const test = require("node:test");
const assert = require("node:assert/strict");
const { parseInventoryPhoto, saveInventoryPhoto, MAX_PRODUCT_PHOTO_BYTES } = require("../backend/src/services/inventoryPhotoService");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=", "base64");
const url = (bytes, mime = "image/png") => `data:${mime};base64,${bytes.toString("base64")}`;

test("photo limit accepts exactly 500 KB and rejects one byte more", () => {
  const exact = Buffer.alloc(MAX_PRODUCT_PHOTO_BYTES);
  png.copy(exact);
  assert.equal(parseInventoryPhoto(url(exact)).size, 500000);
  assert.throws(() => parseInventoryPhoto(url(Buffer.concat([exact, Buffer.from([0])]))), /500 KB/);
});

test("photo validation rejects unsupported, malformed and falsely labelled files", () => {
  for (const value of [url(png, "image/svg+xml"), "data:image/png;base64,invalid", url(Buffer.from("not a photo")), url(png, "image/jpeg"), "https://example.com/photo.png", ""]) {
    assert.throws(() => parseInventoryPhoto(value));
  }
  assert.deepEqual(parseInventoryPhoto(url(png)).data, png);
});

test("omitting photo preserves it; explicit null removes only this tenant product photo", async () => {
  const calls = [];
  const client = { query: async (...args) => { calls.push(args); return { rowCount: 1 }; } };
  await saveInventoryPhoto(client, "business-a", "product-a", parseInventoryPhoto(undefined));
  assert.equal(calls.length, 0);
  await saveInventoryPhoto(client, "business-a", "product-a", parseInventoryPhoto(null));
  assert.match(calls[0][0], /business_id = \$1 and product_id = \$2/);
  assert.deepEqual(calls[0][1], ["business-a", "product-a"]);
});

test("saving checks product ownership and does not permit cross-business replacement", async () => {
  let request;
  const photo = parseInventoryPhoto(url(png));
  await saveInventoryPhoto({ query: async (...args) => { request = args; return { rowCount: 1 }; } }, "business-a", "product-a", photo);
  assert.match(request[0], /from business_inventory_products where business_id = \$1 and id = \$2/);
  assert.match(request[0], /business_inventory_product_photos.business_id = excluded.business_id/);
  assert.deepEqual(request[1], ["business-a", "product-a", "image/png", png]);
  await assert.rejects(saveInventoryPhoto({ query: async () => ({ rowCount: 0 }) }, "business-b", "product-a", photo), /no encontrado/);
});

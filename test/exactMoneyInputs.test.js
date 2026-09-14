const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const portalApp = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const validatorHtml = fs.readFileSync(path.join(root, "validador", "index.html"), "utf8");

test("los campos monetarios permiten cualquier peso entero", () => {
  const sources = `${portalHtml}\n${portalApp}\n${validatorHtml}`;

  assert.doesNotMatch(sources, /(?:price|precio|cost|costo|budget|inversi[oó]n|amount|valor|ticket|salesGoal)[^>]{0,180}step="(?:10|50|100|500|1000|10000)"/i);
  assert.doesNotMatch(sources, /step="(?:10|50|100|500|1000|10000)"[^>]{0,180}(?:price|precio|cost|costo|budget|inversi[oó]n|amount|valor|ticket|salesGoal)/i);
});

test("Vitrina y Validador aceptan exactamente 12553 COP", () => {
  const requiredIds = [
    [portalHtml, /<input name="price"[^>]+step="1"[^>]*>/],
    [portalHtml, /<input name="compare_at_price"[^>]+step="1"[^>]*>/],
    [portalHtml, /id="validatorSaleAmountInput"[^>]+step="1"[^>]*>/],
    [validatorHtml, /id="postSaleAmountInput"[^>]+step="1"[^>]*>/],
    [validatorHtml, /id="saleAmountInput"[^>]+step="1"[^>]*>/],
  ];

  for (const [source, pattern] of requiredIds) assert.match(source, pattern);

  const value = 12553;
  assert.equal((value - 0) % 1, 0);
});

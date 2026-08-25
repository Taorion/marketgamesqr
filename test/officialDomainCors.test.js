const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const appSource = fs.readFileSync(path.join(__dirname, "../backend/src/app.js"), "utf8");

test("the official Qori domain and its www variant are allowed by CORS", () => {
  assert.match(appSource, /addOriginVariant\(origins, "https:\/\/gosqori\.com"\)/);
  assert.match(appSource, /const variantHost = host\.startsWith\("www\."\)/);
});

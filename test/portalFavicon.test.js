const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(projectRoot, "empresa", "index.html"), "utf8");

test("portal declares the official Qori browser-tab icons", () => {
  assert.match(
    portalHtml,
    /<link rel="canonical" href="https:\/\/gosqori\.com\/empresa\/">/,
  );
  assert.match(
    portalHtml,
    /<link rel="icon" href="\/favicon\.ico\?v=qori-favicon-[^"]+" sizes="any">/,
  );
  assert.match(
    portalHtml,
    /<link rel="icon" type="image\/png" sizes="32x32" href="\/img\/qori-favicon-32\.png\?v=qori-favicon-[^"]+">/,
  );
  assert.match(
    portalHtml,
    /<link rel="apple-touch-icon" sizes="180x180" href="\/img\/qori-apple-touch-icon\.png\?v=qori-favicon-[^"]+">/,
  );
  assert.match(
    portalHtml,
    /<link rel="manifest" href="\/site\.webmanifest\?v=qori-favicon-[^"]+">/,
  );
});

test("official Qori favicon files exist and are not empty", () => {
  const files = [
    path.join("Pagina web MG", "favicon.ico"),
    path.join("Pagina web MG", "img", "qori-favicon-32.png"),
    path.join("Pagina web MG", "img", "qori-apple-touch-icon.png"),
    path.join("Pagina web MG", "site.webmanifest"),
  ];

  for (const file of files) {
    const stats = fs.statSync(path.join(projectRoot, file));
    assert.ok(stats.isFile(), `${file} must be a file`);
    assert.ok(stats.size > 0, `${file} must not be empty`);
  }
});

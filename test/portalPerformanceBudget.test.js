const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(projectRoot, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(projectRoot, "empresa", "js", "app.js"), "utf8");

test("portal starts downloading its core script from the document head", () => {
  assert.match(portalHtml, /<link rel="preload" as="script" href="js\/app\.js\?v=gosqori-staging-promotion-v358-20260825">/);
  assert.match(portalHtml, /<script src="js\/app\.js\?v=gosqori-staging-promotion-v358-20260825" defer><\/script>/);
});

test("feature-specific styles do not block the login screen", () => {
  const deferredStyles = portalHtml.match(/<link rel="stylesheet"[^>]+data-deferred-portal-style>/g) || [];
  assert.ok(deferredStyles.length >= 10, "expected feature-specific styles to be deferred");
  deferredStyles.forEach((tag) => assert.match(tag, /media="print"/));
  assert.match(app, /link\[data-deferred-portal-style\][\s\S]*link\.media = "all"/);
});

test("jsQR is loaded only when a scanner needs the compatibility fallback", () => {
  assert.doesNotMatch(portalHtml, /<script src="\/vendor\/jsqr\/jsQR\.js"/);
  assert.match(app, /function ensureJsQrLoaded\(\)[\s\S]*script\.src = "\/vendor\/jsqr\/jsQR\.js"/);
  assert.match(app, /async function startValidatorScanner\(\)[\s\S]*await ensureJsQrLoaded\(\)/);
  assert.match(app, /async function startAffiliateFinderScanner\(\)[\s\S]*await ensureJsQrLoaded\(\)/);
});

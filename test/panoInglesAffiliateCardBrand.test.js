const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const portalApp = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const portalHtml = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const publicApp = fs.readFileSync(path.join(root, "carnet-afiliado", "app.js"), "utf8");
const publicCss = fs.readFileSync(path.join(root, "carnet-afiliado", "styles.css"), "utf8");
const publicHtml = fs.readFileSync(path.join(root, "carnet-afiliado", "index.html"), "utf8");
const panoInglesLogoPath = path.join(root, "carnet-afiliado", "img", "el-pano-ingles-crown.png");

test("El Paño Inglés is the only business that activates its affiliate card theme", () => {
  assert.match(publicApp, /e76b6824-918f-419c-b71c-1fa2ac92fef5/);
  assert.match(publicApp, /isPanoInglesBusiness\(businessName, affiliate\.business_id\)/);
  assert.match(publicApp, /normalized\.includes\("pano ingles"\)/);
  assert.match(portalApp, /isPanoInglesAffiliate\(affiliate, businessName\)/);
  assert.ok(fs.statSync(panoInglesLogoPath).size > 1000);
});

test("digital and downloadable cards share the El Paño Inglés palette", () => {
  ["#02070d", "#07111c", "#132a40", "#234f7d", "#c7ad70", "#f6f1e6"].forEach((color) => {
    assert.match(publicCss.toLowerCase(), new RegExp(color));
    assert.match(portalApp.toLowerCase(), new RegExp(color));
  });
  assert.match(publicCss, /body\.brand-pano-ingles/);
  assert.match(publicCss, /\.brand-pano-ingles \.digital-card/);
  assert.match(publicCss, /\.brand-pano-ingles \.status-pill/);
  assert.match(publicCss, /\.brand-pano-ingles \.pano-brand-lockup/);
  assert.match(publicHtml, /el-pano-ingles-crown\.png/);
  assert.match(portalApp, /const panoInglesLogo = isPanoInglesTheme/);
  assert.match(portalApp, /drawContainedImage\(panoInglesLogo/);
});

test("both affiliate-card surfaces are cache-busted", () => {
  assert.match(publicHtml, /pano-ingles-brand-v473-20260910/g);
  assert.match(portalHtml, /affiliate-card=pano-ingles-v473-20260910/g);
  assert.match(portalApp, /empresa-20260910-qori-public-links-v472/);
  assert.match(portalApp, /pano-ingles-affiliate-card-v473-20260910/);
});

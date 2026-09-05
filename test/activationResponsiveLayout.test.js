const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const portalCss = fs.readFileSync(path.join(root, "empresa", "css", "activations-premium.css"), "utf8");
const portalJs = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const publicHtml = fs.readFileSync(path.join(root, "activacion", "index.html"), "utf8");
const publicCss = fs.readFileSync(path.join(root, "activacion", "styles.css"), "utf8");

test("portal loads the final activation containment layer after legacy styles", () => {
  const rankingIndex = portalHtml.indexOf("ranking-premium.css");
  const activationIndex = portalHtml.indexOf("activations-premium.css?v=activation-layout-v436-20260905");
  assert.ok(rankingIndex >= 0);
  assert.ok(activationIndex > rankingIndex);
  assert.match(portalJs, /empresa-20260905-activation-layout-v436/);
  assert.match(portalJs, /activation-layout-v436-20260905/);
});

test("builder uses viewport containment, fluid fields and reachable actions", () => {
  assert.match(portalCss, /#gamingActivationBuilderModal \.gaming-activation-builder-interstitial[\s\S]*100dvh/);
  assert.match(portalCss, /#gamingActivationBuilderModal \.gaming-activation-builder-modal-body[\s\S]*overflow-y: auto !important/);
  assert.match(portalCss, /#gamingActivationBuilderModal \.activation-form-field-row[\s\S]*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(portalCss, /@media \(max-width: 640px\)[\s\S]*activation-form-field-row[\s\S]*grid-template-columns: 1fr !important/);
  assert.match(portalCss, /gaming-activation-wizard-footer button[\s\S]*min-height: 46px !important/);
});

test("published activation rows become readable cards on mobile", () => {
  assert.match(portalCss, /gaming-activation-list-card table[\s\S]*min-width: 920px !important/);
  assert.match(portalCss, /@media \(max-width: 640px\)[\s\S]*gaming-activation-list-row[\s\S]*border-radius: 18px !important/);
  assert.match(portalCss, /content: attr\(data-label\)/);
  assert.match(portalCss, /activation-primary-row-action[\s\S]*min-height: 44px !important/);
});

test("public activation contains canvases, media and controls", () => {
  assert.match(publicHtml, /styles\.css\?v=responsive-containment-v436-20260905/);
  assert.match(publicCss, /Public activation responsive containment v436/);
  assert.match(publicCss, /\.game-canvas[\s\S]*max-width: 100%/);
  assert.match(publicCss, /\.game-controls[\s\S]*repeat\(auto-fit,minmax\(76px,1fr\)\)/);
  assert.match(publicCss, /@media \(max-width: 520px\)[\s\S]*\.ticket-actions[\s\S]*grid-template-columns: 1fr/);
});

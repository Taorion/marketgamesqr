const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("empresa/js/app.js", "utf8");
const markup = fs.readFileSync("empresa/index.html", "utf8");

test("manual refresh actions invalidate the shared API cache", () => {
  assert.match(app, /const MANUAL_PORTAL_REFRESH_SELECTOR =/);
  assert.match(app, /button\[id\^="refresh"\]/);
  assert.match(app, /button\[id\$="RefreshButton"\]/);
  assert.match(app, /\[data-recycling-refresh\]/);
  assert.match(app, /\[data-revenue-command-refresh\]/);
  assert.match(app, /document\.addEventListener\("click",[\s\S]*?clearApiResponseCache\(\);[\s\S]*?}, true\);/);
});

test("the header refresh updates the active portal view", () => {
  const handler = app.slice(
    app.indexOf("async function refreshCurrentPortalViewFromHeader"),
    app.indexOf("async function refreshLiveBusinessData")
  );
  assert.match(handler, /await refreshActivePortalView\(\)/);
  assert.match(handler, /refreshButton\.setAttribute\("aria-busy", "true"\)/);
  assert.match(handler, /refreshButton\.removeAttribute\("aria-busy"\)/);
  assert.match(app, /refreshButton\.addEventListener\("click", refreshCurrentPortalViewFromHeader\)/);
  assert.doesNotMatch(app, /refreshButton\.addEventListener\("click", loadWorkspace\)/);
});

test("the affiliates refresh fetches fresh data before rendering", () => {
  const handler = app.slice(
    app.indexOf('refreshAffiliatesButton?.addEventListener("click"'),
    app.indexOf("affiliateOpenCreateButton?.addEventListener")
  );
  assert.match(handler, /state\.affiliatesLoaded = false/);
  assert.match(handler, /await loadAffiliatesData\(\)/);
  assert.match(handler, /await renderAffiliatesView\(\)/);
  assert.match(handler, /setButtonLoading\(refreshAffiliatesButton, true/);
  assert.match(handler, /setButtonLoading\(refreshAffiliatesButton, false\)/);
  assert.match(markup, /manual-refresh=consistent-v469-20260910/g);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "..", "empresa", "js", "app.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "..", "empresa", "index.html"), "utf8");
const routesSource = fs.readFileSync(path.join(__dirname, "..", "backend", "src", "routes", "businessPortalRoutes.js"), "utf8");
const controllerSource = fs.readFileSync(path.join(__dirname, "..", "backend", "src", "controllers", "businessPortalController.js"), "utf8");

test("activation builder refreshes tenant branches whenever it opens", () => {
  assert.match(appSource, /const branchLoad = loadBusinessBranches\(\{ force: true \}\);/);
  assert.match(appSource, /branchLoad\.then\(\(\) => \{\s*renderInteractiveActivationBranchOptions\(\);/);
  assert.match(appSource, /options\.force \? "\/api\/business\/branches\?fresh=1" : "\/api\/business\/branches"/);
  assert.match(appSource, /"Cache-Control": "no-cache"/);
});

test("a forced branch refresh supersedes an older in-flight account request", () => {
  assert.match(appSource, /!options\.force && state\.businessBranchesLoading && state\.businessBranchesLoadPromise/);
  assert.match(appSource, /return state\.businessBranchesLoadPromise;/);
  assert.match(appSource, /state\.businessBranchesLoadSeq = loadSeq;/);
  assert.match(appSource, /state\.businessBranchesLoadSeq !== loadSeq/);
  assert.match(appSource, /state\.businessBranchesLoadPromise = loadPromise;/);
});

test("branch endpoint is never served from a stale response cache", () => {
  assert.match(routesSource, /router\.get\("\/branches", listBranches\);/);
  assert.doesNotMatch(routesSource, /router\.get\("\/branches", standardBusinessCache, listBranches\);/);
  assert.match(controllerSource, /res\.set\("Cache-Control", "private, no-store"\);/);
});

test("branch selector keeps all active account branches and the all-branches option", () => {
  assert.match(indexSource, /<select id="triviaBranchInput">[\s\S]*?<option value="__ALL_BRANCHES__">Todas las sedes<\/option>/);
  assert.match(appSource, /const rows = \(state\.businessBranches \|\| \[\]\)\.filter\(\(branch\) => branch\.is_active !== false\);/);
  assert.match(appSource, /\.\.\.rows\.map\(\(branch\) => `<option value="\$\{escapeHtml\(branch\.id\)\}">\$\{escapeHtml\(branch\.name\)\}<\/option>`\)/);
});

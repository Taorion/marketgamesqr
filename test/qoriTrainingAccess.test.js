const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const appSource = read("backend", "src", "app.js");
const authSource = read("backend", "src", "middleware", "auth.js");
const portalSource = read("empresa", "js", "app.js");
const accessBridgeSource = read("empresa", "js", "portal-training-access.js");
const { portalWebAccessRequired } = require("../backend/src/middleware/auth");

function responseDouble() {
  return {
    headers: {},
    locals: {},
    statusCode: 200,
    body: "",
    location: "",
    set(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    type(value) { this.headers["content-type"] = value; return this; },
    send(value) { this.body = value; return this; },
    redirect(status, value) { this.statusCode = status; this.location = value; return this; },
  };
}

test("all Qori training routes and assets require an active portal account", () => {
  assert.match(appSource, /"\/academia-vendedores"[\s\S]*"\/cultivar-ventas"[\s\S]*"\/js\/flipbook-turn\.js"[\s\S]*"\/js\/flipbook-zoom\.js"[\s\S]*portalWebAccessRequired/);
  assert.match(authSource, /requestCookie\(req, PORTAL_WEB_ACCESS_COOKIE\)/);
  assert.match(authSource, /authenticatedUserFromToken/);
  assert.match(authSource, /res\.locals\.qoriPortalProtectedAsset = true/);
  assert.match(appSource, /private, no-store, max-age=0/);
});

test("guests return to the requested book after logging into Cuenta Qori", () => {
  assert.match(authSource, /\/empresa\/\?continue=\$\{encodeURIComponent\(requestPath\)\}/);
  assert.match(portalSource, /requestedTrainingContinuePath/);
  assert.match(portalSource, /syncPortalAccessCookie\(nextSession\)/);
  assert.match(accessBridgeSource, /training-access-v448|qori_portal_access|requestedTrainingPath/);
  assert.match(accessBridgeSource, /window\.location\.replace\(target\)/);
  assert.match(accessBridgeSource, /#logoutButton/);
});

test("training URLs are allowlisted and cannot become an open redirect", () => {
  assert.match(portalSource, /target\.origin === window\.location\.origin/);
  assert.match(portalSource, /\["\/academia-vendedores", "\/cultivar-ventas"\]/);
  assert.match(accessBridgeSource, /target\.origin === window\.location\.origin/);
  assert.doesNotMatch(accessBridgeSource, /document\.location\s*=\s*requested/);
});

test("a guest document request is redirected and a guest asset request is denied", async () => {
  const documentResponse = responseDouble();
  await portalWebAccessRequired({ headers: {}, originalUrl: "/cultivar-ventas/?pagina=3" }, documentResponse, () => assert.fail("guest document continued"));
  assert.equal(documentResponse.statusCode, 302);
  assert.equal(documentResponse.location, "/empresa/?continue=%2Fcultivar-ventas%2F%3Fpagina%3D3");
  assert.equal(documentResponse.headers["cache-control"], "private, no-store, max-age=0");

  const assetResponse = responseDouble();
  await portalWebAccessRequired({ headers: {}, originalUrl: "/academia-vendedores/pages/page-001.webp" }, assetResponse, () => assert.fail("guest asset continued"));
  assert.equal(assetResponse.statusCode, 401);
  assert.match(assetResponse.body, /Cuenta Qori/);
});

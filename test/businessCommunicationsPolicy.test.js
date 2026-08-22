const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("communications API is restricted to business management roles", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.match(routes, /router\.use\("\/communications", requireRoles\("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"\)\)/);
  assert.doesNotMatch(routes, /ADMIN_Qori/);
});

test("bulk dispatches require idempotency and persist dispatch state", () => {
  const controller = read("backend/src/controllers/businessCommunicationController.js");
  const service = read("backend/src/services/businessCommunicationService.js");
  const migration = read("database/migrations/202608220001_communication_delivery_safety.sql");
  assert.match(controller, /idempotency_key: z\.string\(\)\.uuid\(\)/);
  assert.match(service, /beginCommunicationDispatch/);
  assert.match(service, /idempotent_replay: true/);
  assert.match(migration, /business_communication_dispatches/);
  assert.match(migration, /unique index[\s\S]+business_id, idempotency_key/);
});

test("email recipients receive auditable consent and unsubscribe protection", () => {
  const service = read("backend/src/services/businessCommunicationService.js");
  const mail = read("backend/src/services/businessCommunicationMailService.js");
  const publicRoutes = read("backend/src/routes/publicCommunicationPreferenceRoutes.js");
  assert.match(service, /consent_confirmed_at/);
  assert.match(service, /opted_out/);
  assert.match(service, /List-Unsubscribe/);
  assert.match(mail, /Object\.keys\(headers\)\.length/);
  assert.match(publicRoutes, /communications\/unsubscribe\/\:token/);
});

test("communication history redacts heavy payloads and hydrates only on edit", () => {
  const service = read("backend/src/services/businessCommunicationService.js");
  const frontend = read("empresa/js/communications.js");
  assert.match(service, /payloads_redacted/);
  assert.match(service, /getBusinessCommunication/);
  assert.match(frontend, /hydrateCommunicationPayload/);
  assert.match(frontend, /communicationCommandStrip/);
});

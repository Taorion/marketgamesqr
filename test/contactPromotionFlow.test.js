const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("buyer, recurrent and VIP states are canonical customer segments", () => {
  const service = read("backend/src/services/leadCrmService.js");
  const app = read("empresa/js/app.js");
  assert.match(service, /upper\(coalesce\(stored_status, ''\)\) in \('BUYER', 'RECURRENT', 'VIP'\)/);
  assert.match(service, /coalesce\(nullif\(ml\.metadata->>'commercial_status', ''\), ml\.status\) as stored_status/);
  assert.match(app, /\["BUYER", "RECURRENT", "VIP"\]\.includes\(commercialStatus\)/);
});

test("contact editing can promote an additional affiliate role atomically", () => {
  const controller = read("backend/src/controllers/leadCrmController.js");
  const service = read("backend/src/services/leadCrmService.js");
  assert.match(controller, /is_affiliate: z\.boolean\(\)\.optional\(\)/);
  assert.match(service, /async function ensureAffiliateRole/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /insert into affiliates/);
  assert.match(service, /payload\.is_affiliate[\s\S]*ensureAffiliateRole/);
  assert.match(service, /affiliate_created: Boolean/);
});

test("affiliate promotion is idempotently linked to the source contact", () => {
  const migration = read("database/migrations/20260905133419_contact_customer_affiliate_promotion.sql");
  assert.match(migration, /create unique index if not exists affiliates_crm_source_unique/);
  assert.match(migration, /card_metadata->>'crm_source_type'/);
  assert.match(migration, /card_metadata->>'crm_source_id'/);
});

test("editor moves promoted contacts to Clientes and refreshes Afiliados", () => {
  const html = read("empresa/index.html");
  const contacts = read("empresa/js/contacts-premium-v333.js");
  const css = read("empresa/css/contacts-premium-v333.css");
  assert.match(html, /id="contactEditorIsAffiliate"/);
  assert.match(contacts, /state\.leadDirectoryAudience = "customers"/);
  assert.match(contacts, /state\.affiliatesLoaded = false/);
  assert.match(contacts, /affiliate_created/);
  assert.match(css, /contact-affiliate-field\.is-linked/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const accountMarkup = (html) => {
  const start = html.indexOf('<section class="view-section" data-view="account">');
  const end = html.indexOf('<section class="view-section" data-view="communications">', start);
  return html.slice(start, end);
};

test("Account exposes six synchronized administration areas", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const account = accountMarkup(html);
  ["Company", "Channels", "Data", "Assets", "Users", "Security"].forEach((section) => {
    assert.match(account, new RegExp(`accountSection${section}`));
  });
  assert.match(app, /accountSectionChannels:\s*"channels"/);
  assert.match(app, /supportedScreens\.includes\(screen\)/);
  assert.match(app, /APP_VERSION = "empresa-20260827-account-command-center-v376"/);
  assert.match(html, /account-premium\.css\?v=account-command-center-v1-20260827/);
  assert.equal((html.match(/app\.js\?v=gos-brand-v362-20260826-account-command-center-v376-20260827/g) || []).length, 2);
});

test("Account follows the Qori premium visual system and a real mobile breakpoint", () => {
  const css = read("empresa/css/account-premium.css");
  assert.match(css, /--account-navy:\s*#012268/);
  assert.match(css, /--account-cyan:\s*#07cefb/);
  assert.match(css, /account-command-hero/);
  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(css, /account-admin-nav[\s\S]+overflow-x:\s*auto\s*!important/);
  assert.match(css, /account-company-card #accountProfileForm \{ grid-template-columns: 1fr !important; \}/);
  assert.match(css, /#accountProfileOverview, \.account-settings-grid\) \{ padding-inline: 0 !important; \}/);
});

test("official Account copy does not instruct customers to edit staging", () => {
  const html = read("empresa/index.html");
  const account = accountMarkup(html);
  assert.doesNotMatch(account, /Render staging|WHATSAPP_APP_SECRET/);
  assert.doesNotMatch(account, />Cambiar password</);
  assert.match(account, /Contraseña actual/);
});

test("business profile mutation excludes validator accounts", () => {
  const routes = read("backend/src/routes/businessPortalRoutes.js");
  assert.match(routes, /router\.patch\("\/profile", requireRoles\("BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"\), updateBusinessProfile\)/);
});

test("Manager cannot create an Owner and billing stays Owner-controlled", () => {
  const controller = read("backend/src/controllers/businessPortalController.js");
  const paymentRoutes = read("backend/src/routes/paymentRoutes.js");
  assert.match(controller, /req\.user\?\.role === "BUSINESS_MANAGER" && body\.role === "BUSINESS_OWNER"/);
  assert.match(paymentRoutes, /requireBillingAdmin = requireRoles\("BUSINESS_OWNER", "ADMIN", "ADMIN_MARKET_GAMES"\)/);
  assert.match(paymentRoutes, /subscriptions\/checkout", authRequired, requireBillingAdmin/);
  assert.match(paymentRoutes, /qr-credits\/checkout", authRequired, requireBillingAdmin/);
});

test("password changes invalidate previously issued sessions", () => {
  const migration = read("database/migrations/202608270001_account_security_hardening.sql");
  const auth = read("backend/src/middleware/auth.js");
  const controller = read("backend/src/controllers/authController.js");
  assert.match(migration, /password_version integer not null default 0/);
  assert.match(migration, /before update of password_hash/);
  assert.match(auth, /payload\.password_version/);
  assert.match(controller, /password_version: Number\(user\.password_version \|\| 0\)/);
});

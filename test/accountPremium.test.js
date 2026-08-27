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
  assert.match(app, /APP_VERSION = "empresa-20260827-plan-entitlements-v382"/);
  assert.match(html, /account-premium\.css\?v=account-plan-change-v12-20260827/);
  assert.equal((html.match(/app\.js\?v=gos-brand-v362-20260826-plan-entitlements-v382-20260827/g) || []).length, 2);
  assert.match(html, /qori-favicon\.png\?v=qori-account-brand-v2-20260827/);
});

test("Account follows the Qori premium visual system and a real mobile breakpoint", () => {
  const html = read("empresa/index.html");
  const css = read("empresa/css/account-premium.css");
  assert.match(css, /--account-navy:\s*#012268/);
  assert.match(css, /--account-cyan:\s*#07cefb/);
  assert.match(css, /account-command-hero/);
  assert.match(css, /#subscriptionBanner[\s\S]+linear-gradient\(112deg, #012268/);
  assert.match(css, /account-command-mark img/);
  assert.match(css, /account-profile-kicker/);
  assert.match(css, /Account Atelier v4/);
  assert.match(css, /grid-template-columns:\s*248px minmax\(0, 1fr\)/);
  assert.match(css, /background:\s*transparent !important;[\s\S]+box-shadow:\s*none !important/);
  assert.match(css, /accountAtelierHiddenA#accountAtelierHiddenB[\s\S]+\.account-screen-hidden/);
  assert.match(css, /Account v6 alignment lock/);
  assert.match(css, /accountPolishA#accountPolishB[\s\S]+grid-template-rows:\s*1fr/);
  assert.match(css, /account-email-connection-steps li[\s\S]+padding:\s*18px 16px 18px 54px !important/);
  assert.match(css, /Account v7 team command center/);
  assert.match(css, /accountTeamA#accountTeamB[\s\S]+\.account-users-card\s*\{[\s\S]+grid-column:\s*1 \/ -1 !important/);
  assert.match(css, /\.account-users-card #accountUserForm[\s\S]+border-radius:\s*20px/);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]+\.account-users-card tbody tr[\s\S]+border-radius:\s*18px/);
  assert.match(css, /td:nth-child\(6\)::before\s*\{\s*content:\s*"Acciones"/);
  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(html, /account-admin-nav-head[\s\S]+Dentro de Cuenta[\s\S]+Configura tu empresa/);
  assert.match(html, /aria-label="Navegación interna de Cuenta"/);
  assert.match(css, /Account v11[\s\S]+account-admin-nav[\s\S]+position:\s*static\s*!important/);
  assert.match(css, /account-admin-nav[\s\S]+grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)\s*!important/);
  assert.match(css, /account-company-card #accountProfileForm \{ grid-template-columns: 1fr !important; \}/);
  assert.match(css, /#accountProfileOverview, \.account-settings-grid\) \{ padding-inline: 0 !important; \}/);
  assert.match(css, /Account v12 · plan change command/);
  assert.match(css, /#accountPortalPlansCard[\s\S]+grid-column: 1 \/ -1 !important/);
  assert.match(css, /#subscriptionPlansGrid[\s\S]+grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
});

test("Account exposes a real plan change action through the existing checkout", () => {
  const html = read("empresa/index.html");
  const app = read("empresa/js/app.js");
  const css = read("empresa/css/account-premium.css");
  assert.match(html, /Renovar o cambiar plan/);
  assert.match(html, /Plan seleccionado/);
  assert.match(app, /data-choose-subscription-plan=/);
  assert.match(app, /subscriptionPlansGrid\?\.addEventListener\("click"/);
  assert.match(app, /subscriptionRenewalPlanSelect\.value = selectedPlanCode/);
  assert.match(app, /Cambiar a \$\{selectedRenewalPlan\.name\}/);
  assert.match(app, /\/api\/payments\/subscriptions\/checkout/);
  assert.match(css, /\.portal-plan-select-button[\s\S]+width: 100% !important/);
});

test("official Account copy does not instruct customers to edit staging", () => {
  const html = read("empresa/index.html");
  const account = accountMarkup(html);
  assert.doesNotMatch(account, /Render staging|WHATSAPP_APP_SECRET/);
  assert.doesNotMatch(account, />Cambiar password</);
  assert.match(account, /Contraseña actual/);
});

test("Account preserves human plan states instead of rendering NaN", () => {
  const app = read("empresa/js/app.js");
  assert.match(app, /if \(typeof value === "number" && Number\.isFinite\(value\)\)/);
  assert.match(app, /return normalized \|\| "-"/);
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

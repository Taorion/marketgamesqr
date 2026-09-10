const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  OFFICIAL_QORI_ORIGIN,
  canonicalizePublicUrl,
  canonicalizePublicUrlsInText,
  resolvePublicAppUrl,
} = require("../backend/src/utils/publicUrl");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("production always replaces legacy MarketGames public origins with gosqori", () => {
  assert.equal(OFFICIAL_QORI_ORIGIN, "https://gosqori.com");
  assert.equal(resolvePublicAppUrl({ isProduction: true }), OFFICIAL_QORI_ORIGIN);
  assert.equal(resolvePublicAppUrl({ isProduction: true, configuredPublicAppUrl: "https://www.marketgamesqr.com/" }), OFFICIAL_QORI_ORIGIN);
  assert.equal(resolvePublicAppUrl({ isProduction: true, configuredPublicAppUrl: "https://market-games-portal.onrender.com" }), OFFICIAL_QORI_ORIGIN);
  assert.equal(resolvePublicAppUrl({ isProduction: true, configuredPublicAppUrl: "https://www.gosqori.com/" }), OFFICIAL_QORI_ORIGIN);
  assert.equal(resolvePublicAppUrl({ isProduction: true, configuredPublicAppUrl: "https://qori-staging.example" }), "https://qori-staging.example");
  assert.equal(resolvePublicAppUrl({ isProduction: false }), "http://localhost:3000");
});

test("historical links preserve their route token and query while changing only the origin", () => {
  assert.equal(
    canonicalizePublicUrl("https://www.marketgamesqr.com/carnet-afiliado/abc-123?source=qr#card"),
    "https://gosqori.com/carnet-afiliado/abc-123?source=qr#card"
  );
  assert.equal(
    canonicalizePublicUrl("https://market-games-portal.onrender.com/claim/ticket-9"),
    "https://gosqori.com/claim/ticket-9"
  );
  assert.equal(
    canonicalizePublicUrl("https://externo.example/pieza"),
    "https://externo.example/pieza"
  );
  assert.equal(
    canonicalizePublicUrlsInText("Abre https://www.marketgamesqr.com/activacion/demo y conserva el código."),
    "Abre https://gosqori.com/activacion/demo y conserva el código."
  );
});

test("portal fallbacks canonicalize carnets tickets catalogs campaigns and communication art", () => {
  const app = read("empresa", "js", "app.js");
  const communications = read("empresa", "js", "communications.js");
  assert.match(app, /function canonicalQoriPublicUrl/);
  assert.match(app, /return path \? canonicalQoriPublicUrl\(path\)/);
  assert.match(app, /return canonicalQoriPublicUrl\(catalog\.public_url/);
  assert.match(app, /return canonicalQoriPublicUrl\(affiliate\.digital_card_url\)/);
  assert.match(app, /const publicTicketUrl = canonicalQoriPublicUrl/);
  assert.match(app, /function ticketPublicUrl[\s\S]*canonicalQoriPublicUrl/);
  assert.match(communications, /const communicationActionUrl = \(item\) => canonicalPublicLink/);
  assert.match(communications, /url: communicationActionUrl\(item\)/);
  const delivery = read("backend", "src", "services", "businessCommunicationService.js");
  assert.match(delivery, /canonicalizePublicUrlsInText\(personalize\(communication\.email_body/);
  assert.match(delivery, /whatsappTemplateParameters\(template, contact, canonicalActionUrl\)/);
});

test("public-facing page metadata no longer advertises MarketGamesQR URLs", () => {
  [
    ["paquetes", "index.html"],
    ["privacidad", "index.html"],
    ["reward-pass-public", "index.html"],
    ["smart-catalog", "index.html"],
    ["terminos", "index.html"],
    ["trivia", "index.html"],
    ["validador", "index.html"],
  ].forEach((parts) => {
    const source = read(...parts);
    assert.doesNotMatch(source, /https:\/\/www\.marketgamesqr\.com/i, parts.join("/"));
  });
  assert.match(read("empresa", "index.html"), /qori-public-links-v472-20260910/);
  assert.match(read("empresa", "js", "app.js"), /empresa-20260910-qori-public-links-v472/);
});

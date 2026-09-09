const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const portalHtml = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const portalApp = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const publicHtml = fs.readFileSync(path.join(root, "activacion", "index.html"), "utf8");
const player = fs.readFileSync(path.join(root, "activacion", "activation.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "activacion", "styles.css"), "utf8");

test("Carta sellada permite redactar una comunicación formal y la persiste", () => {
  assert.match(portalHtml, /id="sealedLetterOccasionInput"/);
  assert.match(portalHtml, /id="sealedLetterSalutationInput"/);
  assert.match(portalHtml, /id="sealedLetterMessageInput"[\s\S]*maxlength="700"/);
  assert.match(portalHtml, /id="sealedLetterClosingInput"/);
  assert.match(portalHtml, /id="sealedLetterSignatureInput"/);
  assert.match(portalHtml, /Cóctel de bienvenida u Obsequio especial de cumpleaños/);
  assert.match(portalApp, /occasion: document\.getElementById\("sealedLetterOccasionInput"\)/);
  assert.match(portalApp, /salutation: document\.getElementById\("sealedLetterSalutationInput"\)/);
  assert.match(portalApp, /closing: document\.getElementById\("sealedLetterClosingInput"\)/);
  assert.match(portalApp, /signature: document\.getElementById\("sealedLetterSignatureInput"\)/);
});

test("la experiencia publica abre un sobre y revela el beneficio configurado", () => {
  assert.match(player, /currentActivation\.activation_type === "SEALED_LETTER"/);
  assert.match(player, /function renderSealedLetterExperience/);
  assert.match(player, /currentActivation\.reward_config\?\.reward_label/);
  assert.match(player, /id="sealedLetterEnvelope"/);
  assert.match(player, /id="sealedLetterSheet"/);
  assert.match(player, /La cortesía que hemos preparado para ti/);
  assert.match(player, /sealed_letter_opened: true/);
  assert.match(player, /completeActivation\(\{/);
});

test("Carta sellada adapta la llamada a la entrega física, ecommerce o digital", () => {
  assert.match(player, /fulfillmentMode === "DIGITAL_ASSET"/);
  assert.match(player, /Recibir mi obsequio digital/);
  assert.match(player, /fulfillmentMode === "ECOMMERCE_CODE"/);
  assert.match(player, /Generar pase para reclamar/);
});

test("el sobre y la carta tienen presentación formal, móvil y movimiento reducido", () => {
  assert.match(styles, /\.sealed-envelope-flap/);
  assert.match(styles, /\.sealed-envelope-seal/);
  assert.match(styles, /\.sealed-letter-sheet/);
  assert.match(styles, /\.sealed-letter-benefit/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(publicHtml, /sealed-letter=v456-20260909/);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const player = fs.readFileSync(path.join(root, "activacion", "activation.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "activacion", "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "activacion", "index.html"), "utf8");
const service = fs.readFileSync(path.join(root, "backend", "src", "services", "interactiveActivationService.js"), "utf8");

test("Gira y descubre and Toca y revela use the dedicated hidden flip-card experience", () => {
  assert.match(player, /\["SPIN_DISCOVER", "TAP_REVEAL"\]\.includes\(currentActivation\.activation_type\)[\s\S]*renderSpinDiscoverExperience\(fallbackChoices\)/);
  assert.match(player, /spin-discover-card-front[\s\S]*Gira para descubrir/);
  assert.match(player, /spin-discover-card-back[\s\S]*Premio revelado/);
  assert.doesNotMatch(player, /spin-discover-card-front[\s\S]{0,300}rewardLabel/);
  assert.match(styles, /backface-visibility:\s*hidden/);
  assert.match(styles, /\.spin-discover-card-back\s*\{[\s\S]*visibility:\s*hidden/);
  assert.match(styles, /\.spin-discover-card\.is-flipped \.spin-discover-card-back\s*\{[\s\S]*visibility:\s*visible/);
  assert.match(styles, /\.spin-discover-card\.is-flipped \.spin-discover-card-inner[\s\S]*rotateY\(180deg\)/);
});

test("the first flipped card locks every option and owns the QR reward", () => {
  assert.match(player, /if \(choiceLocked\) return;[\s\S]*choiceLocked = true;[\s\S]*selectedChoice = button\.dataset\.choice/);
  assert.match(player, /cards\.forEach\(\(item\) => \{[\s\S]*item\.disabled = true/);
  assert.match(player, /item\.classList\.toggle\("is-locked", !selected\)/);
  assert.match(player, /completeActivation\(\{ selected_choice: selectedChoice \}\)/);
  assert.match(player, /Este será el beneficio asociado a tu QR/);
});

test("the server rejects a missing or unknown reveal card instead of issuing a mismatched prize", () => {
  assert.match(service, /\["SPIN_DISCOVER", "TAP_REVEAL"\]\.includes\(activation\.activation_type\) && !reward/);
  assert.match(service, /Debes elegir una carta valida para generar el beneficio/);
});

test("the public player cache marker ships both animation and behavior together", () => {
  assert.match(html, /styles\.css\?v=reveal-cards-hidden-v438-20260905/);
  assert.match(html, /activation\.js\?v=reveal-cards-hidden-v438-20260905/);
});

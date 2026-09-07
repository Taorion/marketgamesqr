const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const service = require("../backend/src/services/interactiveActivationService");
const portalSource = read("empresa", "js", "app.js");
const portalHtml = read("empresa", "index.html");
const publicSource = read("activacion", "activation.js");

test("diagnostic answers add the configured points for one or several checked values", () => {
  const rules = { option_points: { low: 0, medium: 2, high: 4 } };
  assert.equal(service.scoreAnswerWithRules(rules, "high"), 4);
  assert.equal(service.scoreAnswerWithRules(rules, ["medium", "high"]), 6);
  assert.equal(service.scoreAnswerWithRules(rules, "unknown"), 0);
});

test("diagnostic range boundaries are inclusive and return business-authored text", () => {
  const activation = {
    activation_type: "PREMIUM_NEED_DIAGNOSTIC",
    interaction_config: {
      diagnostic_ranges: [
        { key: "low", min_score: 0, max_score: 3, title: "Nivel inicial", text: "Texto inicial" },
        { key: "high", min_score: 4, max_score: 12, title: "Nivel prioritario", text: "Texto prioritario" },
      ],
    },
  };
  assert.equal(service.resolveDiagnosticResult(activation, 3).key, "low");
  assert.deepEqual(service.resolveDiagnosticResult(activation, 4), {
    key: "high",
    min_score: 4,
    max_score: 12,
    title: "Nivel prioritario",
    text: "Texto prioritario",
    score: 4,
  });
});

test("portal builds scored questions and contiguous result ranges without JSON fields", () => {
  assert.match(portalHtml, /id="diagnosticQuestionBuilder"/);
  assert.match(portalHtml, /id="diagnosticRangeBuilder"/);
  assert.match(portalHtml, /id="diagnosticQuestionCountInput"[\s\S]*<option value="5">5 preguntas<\/option>/);
  assert.doesNotMatch(portalHtml.slice(portalHtml.indexOf('data-activation-config="NEED_DIAGNOSTIC"'), portalHtml.indexOf('data-activation-config="WAITLIST"')), /textarea[^>]+JSON|Código de valor|Costo de crédito/i);
  assert.match(portalSource, /scoring_rules: \{ option_points: Object\.fromEntries/);
  assert.match(portalSource, /diagnostic_ranges: collectDiagnosticRanges\(\)/);
  assert.match(portalSource, /deben empezar en 0, continuar sin espacios/);
  assert.match(portalSource, /Se mostrarán y publicarán exactamente \$\{diagnosticCount\}/);
  assert.match(portalSource, /\.slice\(0, count\)/);
});

test("server owns diagnostic score and public result appears before the benefit", () => {
  const completion = read("backend", "src", "services", "interactiveActivationService.js");
  assert.match(completion, /const score = diagnosticActivation \|\| body\.score === undefined/);
  assert.match(completion, /diagnostic_result: diagnosticResult/);
  assert.match(publicSource, /Tu puntuación/);
  assert.match(publicSource, /\$\{diagnosticMarkup\}[\s\S]*Activo digital desbloqueado/);
  assert.match(publicSource, /Ver mi diagnóstico y beneficio/);
});

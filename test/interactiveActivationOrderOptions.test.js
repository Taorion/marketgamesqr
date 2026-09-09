const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const service = require("../backend/src/services/interactiveActivationService");

test("Orden correcto usa un editor visual, reordenable y limitado a pasos claros", () => {
  const portal = read("empresa", "js", "app.js");
  const styles = read("empresa", "css", "styles.css");
  assert.match(portal, /key: "order_steps"[\s\S]*type: "order_steps"/);
  assert.match(portal, /function orderStepsEditorMarkup/);
  assert.match(portal, /data-order-step-move="up"/);
  assert.match(portal, /data-order-step-move="down"/);
  assert.match(portal, /data-order-step-add/);
  assert.match(portal, /rows\.length <= 3/);
  assert.match(portal, /rows\.length >= 8/);
  assert.match(portal, /Cada paso debe ser diferente/);
  assert.match(styles, /\.order-step-row/);
  assert.match(styles, /@media \(max-width: 600px\)/);
});

test("la creación persiste la instrucción, el mensaje final y la secuencia estructurada", () => {
  const portal = read("empresa", "js", "app.js");
  assert.match(portal, /key: "order_prompt"/);
  assert.match(portal, /key: "order_success_message"/);
  assert.match(portal, /config\.sequences = \[orderStepDrafts\(\)\]/);
  assert.match(portal, /effectiveMinScore = type === "ORDER_OPTIONS" \? 1/);
  assert.match(portal, /\["BATTLESHIP_COORDS", "ORDER_OPTIONS"\]\.includes\(type\)/);
});

test("el servidor recalcula el score solo cuando coincide el orden configurado", () => {
  const activation = {
    activation_type: "ORDER_OPTIONS",
    game_config: { sequences: [["Reservar", "Confirmar", "Asistir"]], points_per_target: 40 },
  };
  const completed = { answers: { order_completed: true, order_sequence: ["Reservar", "Confirmar", "Asistir"] }, score: 99999 };
  service.applyOrderOptionsResult(activation, completed);
  assert.equal(completed.score, 200);
  assert.equal(completed.metadata.order_options_completed, true);

  const failed = { answers: {}, score: 99999 };
  service.applyOrderOptionsResult(activation, failed);
  assert.equal(failed.score, 0);
  assert.equal(failed.answers.order_completed, false);

  assert.throws(() => service.applyOrderOptionsResult(activation, {
    answers: { order_completed: true, order_sequence: ["Asistir", "Confirmar", "Reservar"] },
  }), /no coincide con el orden configurado/);
});

test("la API de creación normaliza los pasos y rechaza secuencias ambiguas", () => {
  assert.deepEqual(
    service.normalizeOrderOptionsGameConfig("ORDER_OPTIONS", { sequences: [[" Entrada ", "Plato", "Postre"]] }).sequences,
    [["Entrada", "Plato", "Postre"]]
  );
  assert.throws(
    () => service.normalizeOrderOptionsGameConfig("ORDER_OPTIONS", { sequences: [["Entrada", "entrada", "Postre"]] }),
    /Cada paso de Orden correcto debe ser diferente/
  );
  assert.throws(
    () => service.normalizeOrderOptionsGameConfig("ORDER_OPTIONS", { sequences: [["Entrada", "Postre"]] }),
    /entre 3 y 8 pasos/
  );
});

test("el juego termina al acertar, informa errores y espera antes de entregar", () => {
  const player = read("activacion", "activation.js");
  const portalHtml = read("empresa", "index.html");
  const publicHtml = read("activacion", "index.html");
  assert.match(player, /order_completed: true/);
  assert.match(player, /runtime\.onControl = \(key\)/);
  assert.match(player, /PASO \$\{step \+ 1\} DE/);
  assert.doesNotMatch(player, /SIGUIENTE: \$\{sequence\.labels/);
  assert.match(player, /order_sequence: sequence\.labels/);
  assert.match(player, /Ese no es el siguiente paso/);
  assert.match(player, /¡Orden perfecto! Preparando tu beneficio/);
  assert.match(player, /window\.setTimeout\(\(\) => runtime\.finish\(\), 1200\)/);
  assert.match(player, /function drawOrderSuccess/);
  assert.match(portalHtml, /order-options-editor=v459-20260909/);
  assert.match(publicHtml, /order-options=v459-20260909/);
});

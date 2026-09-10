const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "affiliates-modal-premium.css"), "utf8");

function expect(pattern, message) {
  if (!pattern.test(css)) throw new Error(message);
}

if (!/css\/affiliates-modal-premium\.css\?v=affiliate-modal-premium-v478-20260910/.test(html)) {
  throw new Error("El portal debe cargar la capa final del modal de afiliados.");
}

expect(/body\s*>\s*#affiliateOperationBackdrop\.affiliate-operation-backdrop[\s\S]*backdrop-filter:\s*blur\(12px\)/, "El backdrop debe ser una capa oscura desenfocada.");
expect(/body:has\(>\s*#affiliateOperatePanel\.is-modal-open\)[\s\S]*overflow:\s*hidden/, "El fondo de la pagina debe bloquear su scroll cuando abre el modal.");
expect(/#affiliateOperatePanel\.is-modal-open[\s\S]*max-height:\s*calc\(100dvh[\s\S]*overflow-y:\s*auto/, "El modal debe caber en el viewport y tener scroll interno.");
expect(/>\s*\.table-card-head[\s\S]*position:\s*sticky/, "El encabezado del modal debe permanecer visible.");
expect(/\.affiliate-points-history-summary[\s\S]*grid-area:\s*history/, "El historial de puntos debe tener una zona propia en la composicion.");
expect(/@media\s*\(max-width:\s*760px\)[\s\S]*width:\s*calc\(100vw\s*-\s*12px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, "La vista movil debe usar una sola columna sin desbordamiento.");

console.log("affiliateOperationModalPremium.test.js: ok");

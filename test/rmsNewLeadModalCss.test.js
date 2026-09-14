const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "rms-new-lead-modal.css"), "utf8");

test("Nuevo lead carga una capa exclusiva después de las capas globales", () => {
  const readable = html.indexOf("portal-readable-density.css");
  const modal = html.indexOf("rms-new-lead-modal.css?v=rms-new-lead-modal-v1-20260914");
  assert.ok(readable >= 0);
  assert.ok(modal > readable);
  assert.match(html, /rms-lead-modal=v491-20260914/g);
});

test("elimina la inyección conflictiva que estrechaba y desalineaba el modal", () => {
  assert.doesNotMatch(app, /width:\s*min\(760px, calc\(100vw - 28px\)\)/);
  assert.doesNotMatch(app, /#rmsCollectorModal \.rms-collector-form[\s\S]{0,240}padding-right:\s*6px/);
});

test("el overlay usa cabecera estable y desplazamiento interno", () => {
  assert.match(css, /\.rms-collector-card[\s\S]*?grid-template-rows:\s*max-content minmax\(0, 1fr\) !important/);
  assert.match(css, /\.rms-collector-form[\s\S]*?overflow-y:\s*auto !important/);
  assert.match(css, /\.modal-actions[\s\S]*?position:\s*static !important[\s\S]*?bottom:\s*auto !important/);
  assert.doesNotMatch(css, /\.modal-actions[\s\S]{0,260}position:\s*sticky !important/);
  assert.match(css, /border-radius:\s*0 !important/);
});

test("a 390 por 844 usa una columna sin desbordamiento lateral", () => {
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?width:\s*100vw !important[\s\S]*?height:\s*100dvh !important/);
  assert.match(css, /\.rms-collector-form[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /\.modal-actions[\s\S]*?display:\s*grid !important[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /\.rms-collector-lead-submit :is\(strong, small\)[\s\S]*?display:\s*block !important/);
});

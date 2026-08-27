const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("los mensajes inline usan colores semánticos y no convierten información en error", () => {
  const html = read("empresa/index.html");
  const css = read("empresa/css/semantic-messages.css");
  const app = read("empresa/js/app.js");

  assert.match(html, /semantic-messages\.css\?v=semantic-messages-v1-20260827/);
  assert.match(css, /data-kind="info"[\s\S]+--qori-message-info-surface/);
  assert.match(css, /data-kind="success"[\s\S]+--qori-message-success-surface/);
  assert.match(css, /data-kind="warning"[\s\S]+--qori-message-warning-surface/);
  assert.match(css, /data-kind="error"[\s\S]+--qori-message-error-surface/);
  assert.match(app, /setInlineMessage\(loginError, "Validando credenciales\.\.\.", "info"\)/);
  assert.match(app, /setInlineMessage\(loginError, "Credenciales correctas\. Cargando portal\.\.\.", "success"\)/);
  assert.match(app, /kind === "error" \|\| kind === "danger" \? "alert" : "status"/);
  assert.match(app, /kind === "error" \|\| kind === "danger" \? "assertive" : "polite"/);
});

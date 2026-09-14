const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "portal-menu-toggle.css"), "utf8");

test("el control identifica el menú y declara su estado inicial", () => {
  assert.match(html, /<aside class="sidebar" id="portalSidebar">/);
  assert.match(html, /id="menuToggleButton"[^>]*aria-label="Contraer menú principal"[^>]*aria-controls="portalSidebar"[^>]*aria-expanded="true"[^>]*data-menu-state="expanded"/);
  assert.match(html, /portal-menu-toggle\.css\?v=portal-menu-toggle-v1-20260914/);
  assert.equal((html.match(/menu-toggle=v494-20260914/g) || []).length, 2);
});

test("el estado visual y accesible se sincroniza en escritorio y móvil", () => {
  assert.match(app, /function syncPortalMenuToggleState\(\)/);
  assert.match(app, /stateName = mobile[\s\S]*?"mobile-open"[\s\S]*?"collapsed"/);
  assert.match(app, /menuToggleButton\.setAttribute\("aria-expanded", String\(expanded\)\)/);
  assert.match(app, /menuToggleButton\.setAttribute\("aria-label", actionLabel\)/);
  assert.match(app, /icon\.textContent = iconName/);
  assert.match(app, /workspace\?\.classList\.remove\("sidebar-open"\);\s*\n\s*syncPortalMenuToggleState\(\)/);
});

test("el menú de escritorio no se repliega automáticamente", () => {
  const start = app.indexOf("function syncPortalResponsiveSidebar()");
  const end = app.indexOf("function syncPortalMenuToggleState()", start);
  const responsiveFunction = app.slice(start, end);
  assert.doesNotMatch(responsiveFunction, /min-width: 961px/);
  assert.doesNotMatch(responsiveFunction, /sidebarAutoCollapsed/);
  assert.match(responsiveFunction, /sidebarDesktopChoice === "collapsed"/);
});

test("el botón conserva área de clic, foco y estados diferenciados", () => {
  assert.match(css, /#menuToggleButton\.menu-toggle-button \{[\s\S]*?width: 44px !important;[\s\S]*?height: 42px !important/);
  assert.match(css, /:is\(:hover, :focus-visible\)[\s\S]*?box-shadow: 0 0 0 3px/);
  assert.match(css, /data-menu-state="collapsed"[\s\S]*?background: #075f8e !important/);
  assert.match(css, /@media \(max-width: 960px\)[\s\S]*?height: 44px !important/);
  assert.match(css, /data-menu-state="mobile-open"[\s\S]*?background: #174d70 !important/);
  assert.match(css, /data-menu-state="mobile-open"[\s\S]*?position: fixed !important;[\s\S]*?z-index: 91 !important/);
});

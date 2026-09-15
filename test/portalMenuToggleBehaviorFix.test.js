const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "empresa", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "empresa", "js", "app.js"), "utf8");
const fix = fs.readFileSync(path.join(root, "empresa", "js", "sidebar-toggle-state-fix.js"), "utf8");
const css = fs.readFileSync(path.join(root, "empresa", "css", "portal-sidebar-collapse.css"), "utf8");

test("la correccion del menu se carga despues de la aplicacion", () => {
  const appScript = html.lastIndexOf('src="js/app.js');
  const fixScript = html.indexOf("sidebar-toggle-state-fix.js?v=sidebar-toggle-state-fix-v1-20260914");
  assert.ok(appScript >= 0);
  assert.ok(fixScript > appScript);
  assert.ok(html.indexOf("portal-sidebar-collapse-v1-20260914") > html.indexOf("activation-studio-refinement.css"));
});

test("el ancho del escritorio y el desplazamiento movil obedecen el estado", () => {
  assert.match(css, /@media \(min-width: 961px\)/);
  assert.match(css, /#workspace\.sidebar-collapsed \.sidebar \{[\s\S]*?width: 76px !important/);
  assert.match(css, /#workspace\.sidebar-collapsed \.app-main \{[\s\S]*?margin-left: 76px !important/);
  assert.match(css, /#workspace\.sidebar-collapsed \.topbar \{[\s\S]*?left: 76px !important/);
  assert.match(css, /#workspace:not\(\.sidebar-open\) \.sidebar \{[\s\S]*?translateX\(-105%\)/);
  assert.match(css, /#workspace\.sidebar-open \.sidebar \{[\s\S]*?translateX\(0\)/);
  assert.match(css, /#workspace\.sidebar-open \.topbar \{[\s\S]*?z-index: 92 !important;[\s\S]*?pointer-events: none !important/);
  assert.match(css, /#workspace\.sidebar-open \.topbar #menuToggleButton \{[\s\S]*?pointer-events: auto !important/);
});

test("la alineacion principal distingue estados expandido y replegado", () => {
  assert.match(app, /setImportantStyle\(toggle, "display", isDesktopCollapsed \? "none" : "grid"\)/);
  assert.match(app, /setImportantStyle\(row, "grid-template-columns", isDesktopCollapsed \? "1fr" : "28px minmax\(0, 1fr\) 34px"\)/);
  assert.match(app, /setImportantStyle\(text, "display", isDesktopCollapsed \? "none" : "flex"\)/);
  assert.match(app, /setImportantStyle\(badge, "display", isDesktopCollapsed \? "none" : "inline-flex"\)/);
});

test("la capa de compatibilidad corrige sesiones con app cacheada", () => {
  assert.match(fix, /workspace\.classList\.contains\("sidebar-collapsed"\)/);
  assert.match(fix, /important\(group, "display", collapsed \? "none" : "grid"\)/);
  assert.match(fix, /important\(text, "display", collapsed \? "none" : "flex"\)/);
  assert.match(fix, /toggleButton\.addEventListener\("click", syncSidebarPresentation\)/);
  assert.match(fix, /window\.addEventListener\("resize", syncSidebarPresentation/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../empresa/js/app.js"), "utf8");
const start = source.indexOf("let portalLayoutWidth = window.innerWidth;");
const end = source.indexOf('window.addEventListener("beforeunload"', start);

test("height-only changes do not redraw modules; width changes coalesce and redraw only the active view", () => {
  const pending = new Map();
  const renders = [];
  let resize;
  let id = 0;
  const state = { currentView: "leads", dashboard: {}, selectedCampaign: {}, strategicQrLoaded: true };
  const window = { innerWidth: 390, innerHeight: 844,
    clearTimeout: key => pending.delete(key),
    setTimeout: fn => { pending.set(++id, fn); return id; },
    matchMedia: () => ({ matches: true }),
    addEventListener: (name, fn) => { if (name === "resize") resize = fn; },
  };
  vm.runInNewContext(source.slice(start, end), { window, state, closePortalMenu() {},
    renderDashboard: () => renders.push("dashboard"),
    renderCampaignView: () => renders.push("campaigns"),
    renderStrategicQrView: () => renders.push("strategic-qr"),
  });
  for (let h = 800; h > 600; h -= 10) { window.innerHeight = h; resize(); }
  assert.equal(pending.size, 0);
  for (let w = 391; w < 410; w++) { window.innerWidth = w; resize(); }
  assert.equal(pending.size, 1);
  const flush = () => { const jobs = [...pending.values()]; pending.clear(); jobs.forEach(fn => fn()); };
  flush();
  assert.deepEqual(renders, []);
  for (const view of ["dashboard", "campaigns", "strategic-qr"]) {
    state.currentView = view;
    window.innerWidth++;
    resize(); flush();
  }
  assert.deepEqual(renders, ["dashboard", "campaigns", "strategic-qr"]);
});

test("campaign presentation observes only its own content and batches work while visible", () => {
  const observers = [];
  const frames = [];
  let writes = 0;
  const view = { querySelector: () => null, querySelectorAll: () => [] };
  const workspace = { closest: () => view, style: { setProperty: () => writes++ }, querySelector: () => null, querySelectorAll: () => [] };
  const body = { dataset: { currentView: "leads" } };
  const document = { body, querySelector: () => view, getElementById: () => workspace, addEventListener() {} };
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
  }
  const script = fs.readFileSync(path.join(__dirname, "../empresa/js/campaign-command-center-v318.js"), "utf8");
  vm.runInNewContext(script, { document, MutationObserver, requestAnimationFrame: fn => frames.push(fn) });
  assert.equal(observers[0].target, view);
  assert.equal(observers[1].target, body);
  observers[0].callback();
  assert.equal(frames.length, 0);
  body.dataset.currentView = "campaigns";
  for (let i = 0; i < 20; i++) observers[0].callback();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(writes, 1);
});

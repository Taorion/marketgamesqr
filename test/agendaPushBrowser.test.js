const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const workerCode = fs.readFileSync(path.join(__dirname, "../empresa/agenda-sw.js"), "utf8");
function worker() {
  const listeners = {}; const notices = []; const opened = [];
  const context = vm.createContext({ URL, Date, Promise, self: {
    location: { origin: "https://gosqori.com" }, addEventListener: (event, fn) => { listeners[event] = fn; },
    registration: { showNotification: async (title, options) => notices.push({ title, ...options }) },
    clients: { openWindow: async (url) => opened.push(url) },
  } });
  vm.runInContext(workerCode, context);
  vm.runInContext("bindingStore = async () => 'b:u'", context);
  const payload = { title: "Agenda", body: "Reunión", business_id: "b", user_id: "u", tag: "unique", expires_at: new Date(Date.now() + 60000).toISOString(), url: "/empresa/?agenda=1" };
  async function push(data) { let wait; listeners.push({ data: { json: () => data }, waitUntil: (value) => { wait = value; } }); await wait; }
  return { listeners, notices, opened, payload, push };
}
test("background worker displays valid push with stable tag", async () => {
  const w = worker(); await w.push(w.payload);
  assert.equal(w.notices.length, 1); assert.equal(w.notices[0].tag, "unique");
  assert.equal(w.notices[0].data.identity, "b:u");
});
test("worker drops stale, cross-account, cross-business and external-link messages", async () => {
  const w = worker();
  for (const change of [{ user_id: "other" }, { business_id: "other" }, { expires_at: "bad" },
    { expires_at: new Date(Date.now() - 1).toISOString() }, { url: "https://attacker.test/empresa/" }, { url: "/admin/" }]) {
    await w.push({ ...w.payload, ...change });
  }
  assert.equal(w.notices.length, 0);
});
test("notification click opens agenda only for the current identity", async () => {
  const w = worker();
  for (const identity of ["b:other", "b:u"]) {
    let wait;
    w.listeners.notificationclick({ notification: { close() {}, data: { identity, url: "https://gosqori.com/empresa/?agenda=1" } }, waitUntil(value) { wait = value; } });
    await wait;
  }
  assert.deepEqual(w.opened, ["https://gosqori.com/empresa/?agenda=1"]);
});

function frontend({ ios = false, supported = true, enabled = true, stored = false, subscribeError = null } = {}) {
  const nodes = new Map(); const handlers = {}; const calls = [];
  for (const id of ["agendaPushPanel", "agendaPushStatus", "agendaPushEnable", "agendaPushDisable", "agendaPushTest"]) {
    nodes.set(id, { hidden: false, disabled: false, dataset: {}, textContent: "", addEventListener(event, fn) { handlers[`${id}:${event}`] = fn; } });
  }
  const sub = { endpoint: "https://fcm.googleapis.com/test", toJSON() { return { endpoint: this.endpoint, keys: {} }; }, async unsubscribe() { calls.push("unsubscribe"); } };
  const registration = { active: { postMessage(_value, ports) { queueMicrotask(() => ports[0].other.onmessage()); } },
    pushManager: { async getSubscription() { return stored ? sub : null; }, async subscribe() { if (subscribeError) throw subscribeError; return sub; } } };
  const window = { isSecureContext: true, PushManager() {}, Notification: {}, matchMedia: () => ({ matches: false }), addEventListener() {} };
  if (!supported) delete window.PushManager;
  const context = vm.createContext({ window, document: { getElementById: (id) => nodes.get(id) },
    session: { token: "test", user: { id: "u", business_id: "b", role: "BUSINESS_OWNER" } },
    navigator: { userAgent: ios ? "iPhone" : "Desktop", platform: "", maxTouchPoints: 0,
      serviceWorker: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } },
    Notification: { permission: "granted", requestPermission: async () => { calls.push("permission"); return "granted"; } },
    MessageChannel: class { constructor() { this.port1 = { close() {} }; this.port2 = { other: this.port1 }; } },
    setTimeout, clearTimeout, queueMicrotask, Uint8Array, atob, AbortController,
    fetch: async (url, options) => {
      calls.push(url);
      return { ok: true, json: async () => url.endsWith("config") ? { enabled, public_key: "AAAA" }
        : url.endsWith("status") ? { active: stored } : { ok: true } };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../empresa/js/agenda-push.js"), "utf8"), context);
  return { nodes, handlers, calls, context, flush: () => new Promise((resolve) => setImmediate(resolve)) };
}
test("iPhone outside installed app explains installation without prompting permission", async () => {
  const ui = frontend({ ios: true }); await ui.flush();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /pantalla de inicio/);
  assert.equal(ui.nodes.get("agendaPushEnable").disabled, true);
  assert.equal(ui.calls.length, 0);
});
test("missing backend configuration never claims notifications are active", async () => {
  const ui = frontend({ enabled: false }); await ui.flush();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /pendiente en el servidor/);
  assert.equal(ui.nodes.get("agendaPushEnable").disabled, true);
});
test("enabling requests permission on click, persists subscription and supports revocation", async () => {
  const ui = frontend(); await ui.flush();
  assert.equal(ui.calls.includes("permission"), false);
  await ui.handlers["agendaPushEnable:click"]();
  assert.equal(ui.nodes.get("agendaPushTest").hidden, false);
  assert.ok(ui.calls.indexOf("permission") < ui.calls.indexOf("/api/business/agenda-push/subscription"));
  await ui.context.window.QoriAgendaPush.deactivate();
  assert.ok(ui.calls.includes("unsubscribe"));
});
test("existing registered device survives page reload", async () => {
  const ui = frontend({ stored: true }); await ui.flush();
  assert.equal(ui.nodes.get("agendaPushTest").hidden, false);
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /Activas/);
});

test("push provider registration failure explains recovery and never claims activation", async () => {
  const ui = frontend({ subscribeError: new Error("Registration failed - push service error") });
  await ui.flush();
  await ui.handlers["agendaPushEnable:click"]();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /Brave.*Google/);
  assert.equal(ui.nodes.get("agendaPushStatus").dataset.error, "true");
  assert.equal(ui.nodes.get("agendaPushEnable").disabled, false);
  assert.equal(ui.nodes.get("agendaPushTest").hidden, true);
  assert.equal(ui.calls.includes("/api/business/agenda-push/subscription"), false);
});

test("blocked permission error explains site settings", async () => {
  const error = new Error("Permission denied"); error.name = "NotAllowedError";
  const ui = frontend({ subscribeError: error }); await ui.flush();
  await ui.handlers["agendaPushEnable:click"]();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /gosqori.com/);
  assert.equal(ui.nodes.get("agendaPushTest").hidden, true);
});

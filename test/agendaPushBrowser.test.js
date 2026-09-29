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
  assert.equal(w.notices[0].renotify, false);
});

test("explicit repeated tests request a new alert without changing reminder retry behavior", async () => {
  const w = worker();
  await w.push({ ...w.payload, tag: "qori-agenda-test" });
  await w.push({ ...w.payload, tag: "qori-agenda-test" });
  assert.equal(w.notices.length, 2);
  assert.ok(w.notices.every((notice) => notice.renotify === true));
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

function frontend({ ios = false, supported = true, enabled = true, stored = false, subscribeError = null, testNotices = [],
  storage = new Map(), device = { subscribed: stored, saved: stored }, permission = "granted", fetchHook = null } = {}) {
  const nodes = new Map(); const handlers = {}; const calls = [];
  const retries = [];
  for (const id of ["agendaPushPanel", "agendaPushStatus", "agendaPushEnable", "agendaPushDisable", "agendaPushTest"]) {
    nodes.set(id, { hidden: false, disabled: false, dataset: {}, textContent: "", addEventListener(event, fn) { handlers[`${id}:${event}`] = fn; } });
  }
  const sub = { endpoint: "https://fcm.googleapis.com/test", toJSON() { return { endpoint: this.endpoint, keys: {} }; }, async unsubscribe() { calls.push("unsubscribe"); device.subscribed = false; } };
  const registration = { active: { postMessage(_value, ports) { queueMicrotask(() => ports[0].other.onmessage()); } },
    async getNotifications() { return testNotices; },
    pushManager: { async getSubscription() { return device.subscribed ? sub : null; }, async subscribe() { calls.push("subscribe"); if (subscribeError) throw subscribeError; device.subscribed = true; return sub; } } };
  const window = { isSecureContext: true, PushManager() {}, Notification: {}, matchMedia: () => ({ matches: false }),
    addEventListener(event, fn) { handlers[`window:${event}`] = fn; },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
  if (!supported) delete window.PushManager;
  const context = vm.createContext({ window, document: { getElementById: (id) => nodes.get(id) },
    session: { token: "test", user: { id: "u", business_id: "b", role: "BUSINESS_OWNER" } },
    navigator: { userAgent: ios ? "iPhone" : "Desktop", platform: "", maxTouchPoints: 0,
      serviceWorker: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } },
    Notification: { permission, requestPermission: async () => { calls.push("permission"); return permission; } },
    MessageChannel: class { constructor() { this.port1 = { close() {} }; this.port2 = { other: this.port1 }; } },
    setTimeout: (fn, ms) => {
      if (ms === 3000 || ms === 6000) {
        const timer = { fn, ms, cancelled: false }; retries.push(timer); return timer;
      }
      return setTimeout(fn, ms === 1500 ? 0 : ms);
    },
    clearTimeout: (timer) => { if (timer?.fn) timer.cancelled = true; else clearTimeout(timer); },
    queueMicrotask, Uint8Array, atob, AbortController,
    fetch: async (url, options) => {
      calls.push(url);
      if (fetchHook) await fetchHook(url, options);
      if (url.endsWith("/subscription")) device.saved = options.method !== "DELETE";
      return { ok: true, json: async () => url.endsWith("config") ? { enabled, public_key: "AAAA" }
        : url.endsWith("status") ? { active: device.saved } : { ok: true } };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../empresa/js/agenda-push.js"), "utf8"), context);
  return { nodes, handlers, calls, context, storage, device, retries, flush: () => new Promise((resolve) => setImmediate(resolve)) };
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

test("activation is restored in a new page context without asking for permission again", async () => {
  const first = frontend(); await first.flush();
  await first.handlers["agendaPushEnable:click"]();
  const reopened = frontend({ storage: first.storage, device: first.device }); await reopened.flush();
  assert.equal(reopened.nodes.get("agendaPushEnable").hidden, true);
  assert.match(reopened.nodes.get("agendaPushStatus").textContent, /Activas/);
  assert.equal(reopened.calls.includes("permission"), false);
  assert.equal(reopened.calls.includes("subscribe"), false);
});

test("reopening recovers a lost browser subscription only for the opted-in account", async () => {
  const storage = new Map([["qori:agenda-push:enabled:b:u", "true"]]);
  const ui = frontend({ storage }); await ui.flush();
  assert.equal(ui.calls.includes("subscribe"), true);
  assert.equal(ui.calls.includes("permission"), false);
  assert.equal(ui.device.saved, true);
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /Activas/);
  for (const options of [{}, { storage: new Map([["qori:agenda-push:enabled:b:other", "true"]]) },
    { storage, permission: "denied" }, { storage, enabled: false }]) {
    const other = frontend(options); await other.flush();
    assert.equal(other.calls.includes("subscribe"), false);
    assert.equal(other.calls.includes("permission"), false);
  }
});

test("startup failure exposes recheck and focus recovers the same account", async () => {
  let offline = true;
  const ui = frontend({ stored: true, fetchHook: async () => { if (offline) throw new Error("Sin conexión"); } });
  await ui.flush();
  assert.equal(ui.nodes.get("agendaPushEnable").textContent, "Volver a comprobar");
  assert.equal(ui.nodes.get("agendaPushEnable").disabled, false);
  assert.equal(ui.nodes.get("agendaPushTest").hidden, true);
  offline = false;
  await ui.handlers["window:focus"](); await ui.flush();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /Activas/);
  assert.equal(ui.calls.includes("permission"), false);
});

test("refresh does not flash activation or duplicate a pending check", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const ui = frontend({ stored: true, fetchHook: () => gate });
  assert.equal(ui.nodes.get("agendaPushEnable").hidden, true);
  await ui.context.window.QoriAgendaPush.refresh();
  assert.equal(ui.calls.length, 1);
  release(); await ui.flush();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /Activas/);
});

test("a temporary startup error retries automatically without user activation", async () => {
  let failures = 1;
  const ui = frontend({ stored: true, fetchHook: async () => { if (failures-- > 0) throw new Error("Sin conexión"); } });
  await ui.flush();
  const retry = ui.retries.find((timer) => !timer.cancelled);
  assert.ok(retry);
  retry.fn(); await ui.flush();
  assert.match(ui.nodes.get("agendaPushStatus").textContent, /Activas/);
  assert.equal(ui.calls.includes("permission"), false);
});

test("logout during a pending check cannot restore the previous account state", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const ui = frontend({ stored: true, fetchHook: () => gate });
  ui.context.session = null;
  await ui.context.window.QoriAgendaPush.refresh();
  release(); await ui.flush();
  assert.equal(ui.nodes.get("agendaPushPanel").hidden, true);
  assert.equal(ui.storage.size, 0);
  assert.equal(ui.calls.includes("/api/business/agenda-push/status"), false);
});

test("explicit deactivation clears consent and stays disabled after reopening", async () => {
  const first = frontend({ stored: true }); await first.flush();
  await first.handlers["agendaPushDisable:click"]();
  const reopened = frontend({ storage: first.storage, device: first.device }); await reopened.flush();
  assert.equal(reopened.calls.includes("subscribe"), false);
  assert.equal(reopened.nodes.get("agendaPushEnable").hidden, false);
  assert.equal(reopened.nodes.get("agendaPushTest").hidden, true);
});

test("server revocation is not silently reactivated by remembered consent", async () => {
  const storage = new Map([["qori:agenda-push:enabled:b:u", "true"]]);
  const ui = frontend({ storage, device: { subscribed: true, saved: false } }); await ui.flush();
  assert.equal(ui.nodes.get("agendaPushTest").hidden, true);
  assert.equal(ui.calls.includes("/api/business/agenda-push/subscription"), false);
  assert.equal(storage.size, 0);
});

test("failed recovery can retry without leaving an unregistered browser subscription", async () => {
  let offline = true;
  const ui = frontend({ storage: new Map([["qori:agenda-push:enabled:b:u", "true"]]),
    fetchHook: async (url) => { if (offline && url.endsWith("/subscription")) throw new Error("Sin conexión"); } });
  await ui.flush();
  assert.equal(ui.device.subscribed, false);
  offline = false;
  await ui.handlers["agendaPushEnable:click"]();
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

test("test distinguishes browser receipt from provider acceptance", async () => {
  for (const confirmed of [true, false]) {
    const ui = frontend({ stored: true, testNotices: [{ data: {
      identity: "b:u", received_at: confirmed ? Date.now() + 60000 : Date.now() - 60000,
    } }] });
    await ui.flush();
    await ui.handlers["agendaPushTest:click"]();
    assert.match(ui.nodes.get("agendaPushStatus").textContent,
      confirmed ? /Prueba recibida por este navegador/ : /aún no confirma recepción/);
    assert.equal(ui.nodes.get("agendaPushTest").disabled, false);
  }
});

/* Agenda notifications only. No fetch handler or cached authenticated pages. */
function bindingStore(mode, operation) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("qori-agenda-push", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("settings", mode);
      const result = operation(transaction.objectStore("settings"));
      transaction.oncomplete = () => { db.close(); resolve(result?.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (event.data?.type !== "AGENDA_PUSH_BIND") return;
  if (!event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  event.waitUntil((async () => {
    await bindingStore("readwrite", (store) => store.put(event.data.identity || null, "identity"));
    const existing = await self.registration.getNotifications();
    for (const notification of existing) {
      if (notification.data?.identity !== event.data.identity) notification.close();
    }
    event.ports[0]?.postMessage({ ok: true });
  })());
});
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    if (!payload || !Number.isFinite(Date.parse(payload.expires_at)) || Date.parse(payload.expires_at) <= Date.now()) return;
    const identity = await bindingStore("readonly", (store) => store.get("identity"));
    if (!identity || identity !== `${payload.business_id}:${payload.user_id}`) return;
    const url = new URL(payload.url || "/empresa/", self.location.origin);
    if (url.origin !== self.location.origin || url.pathname !== "/empresa/") return;
    await self.registration.showNotification(String(payload.title || "Qori · Agenda"), {
      body: String(payload.body || "Tienes una actividad pendiente"),
      icon: "/img/qori-icon-192.png", badge: "/img/qori-favicon-32.png",
      tag: payload.tag, renotify: false,
      data: { url: url.href, identity, received_at: Date.now() },
    });
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const identity = await bindingStore("readonly", (store) => store.get("identity"));
    if (!identity || identity !== event.notification.data?.identity) return;
    const url = new URL(event.notification.data.url, self.location.origin);
    if (url.origin !== self.location.origin || url.pathname !== "/empresa/") return;
    await self.clients.openWindow(url.href);
  })());
});

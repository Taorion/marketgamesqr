(() => {
  "use strict";
  const panel = document.getElementById("agendaPushPanel");
  if (!panel) return;
  const status = document.getElementById("agendaPushStatus");
  const enable = document.getElementById("agendaPushEnable");
  const disable = document.getElementById("agendaPushDisable");
  const test = document.getElementById("agendaPushTest");
  let config = null;
  let registration = null;
  let subscription = null;
  let active = false;
  let busy = false;
  let sequence = 0;
  let scope = "";
  const identity = () => session?.user?.business_id ? `${session.user.business_id}:${session.user.id}` : "";
  const supported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const iosNeedsInstall = () => (/iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    && !window.matchMedia("(display-mode: standalone)").matches && !navigator.standalone;

  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
  function controls() {
    enable.hidden = active;
    disable.hidden = !subscription;
    test.hidden = !active;
    enable.disabled = busy || !config?.enabled || !supported() || iosNeedsInstall();
    disable.disabled = busy;
    test.disabled = busy || !active;
  }
  async function request(path, method = "GET", body, token = session?.token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`/api/business/agenda-push/${path}`, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "No se pudo actualizar este dispositivo.");
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("La conexión tardó demasiado. Vuelve a intentarlo.");
      throw error;
    } finally { clearTimeout(timeout); }
  }
  async function bind(value) {
    if (!registration?.active) return;
    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error("No se pudo preparar el dispositivo. Vuelve a intentarlo.")); }, 6000);
      channel.port1.onmessage = () => { clearTimeout(timeout); channel.port1.close(); resolve(); };
      registration.active.postMessage({ type: "AGENDA_PUSH_BIND", identity: value || null }, [channel.port2]);
    });
  }
  async function localRegistration() {
    registration = await navigator.serviceWorker.register("/empresa/agenda-sw.js", { scope: "/empresa/", updateViaCache: "none" });
    if (!registration.active) {
      const worker = registration.installing || registration.waiting;
      if (!worker) throw new Error("No se pudo preparar el dispositivo. Vuelve a cargar el portal.");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { worker.removeEventListener("statechange", changed); reject(new Error("Vuelve a cargar el portal para activar los avisos.")); }, 8000);
        function changed() {
          if (worker.state === "activated" || worker.state === "redundant") {
            clearTimeout(timeout);
            worker.removeEventListener("statechange", changed);
            if (worker.state === "activated") resolve();
            else reject(new Error("No se pudo preparar el dispositivo. Vuelve a intentarlo."));
          }
        }
        worker.addEventListener("statechange", changed);
        changed();
      });
    }
    return registration;
  }
  async function refresh() {
    const current = identity();
    if (!current || session?.user?.role === "BUSINESS_SELLER") { panel.hidden = true; return; }
    panel.hidden = false;
    scope = current;
    const seq = ++sequence;
    active = false;
    config = null;
    controls();
    if (iosNeedsInstall()) {
      message("En iPhone o iPad: abre el portal en Safari, pulsa Compartir → Añadir a pantalla de inicio. Abre Qori desde ese icono y activa los avisos aquí.");
      return;
    }
    if (!supported()) { message("Abre el portal con HTTPS en un navegador compatible con notificaciones, como Chrome, Edge, Firefox o Safari."); return; }
    try {
      const nextConfig = await request("config");
      if (seq !== sequence || current !== identity()) return;
      config = nextConfig;
      await localRegistration();
      if (seq !== sequence || current !== identity()) return;
      subscription = await registration.pushManager.getSubscription();
      await bind(current);
      if (subscription) {
        const saved = await request("status", "POST", { endpoint: subscription.endpoint });
        if (seq !== sequence || current !== identity()) return;
        active = saved.active && Notification.permission === "granted" && config.enabled;
      }
      message(!config.enabled ? "La activación de notificaciones está pendiente en el servidor."
        : Notification.permission === "denied" ? "Las notificaciones están bloqueadas. Permítelas en la configuración de este sitio y vuelve a cargar el portal."
          : active ? "Activas en este dispositivo: 24 horas, 30 minutos y 10 minutos antes."
            : "Actívalas en cada computador o celular donde quieras recibir tus recordatorios.");
    } catch (error) { if (seq === sequence) message(error.message, true); }
    finally { if (seq === sequence) controls(); }
  }
  function applicationKey(value) {
    const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }
  enable.addEventListener("click", async () => {
    if (busy || !config?.enabled || !identity()) return;
    busy = true;
    controls();
    const current = identity();
    try {
      // Must happen directly in the click gesture, notably on iOS.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("No se activaron los avisos. Puedes permitirlos desde la configuración de este sitio.");
      if (current !== identity()) return;
      await localRegistration();
      // A fresh subscription avoids linking a shared browser to its previous account or VAPID key.
      if (subscription && !active) { await subscription.unsubscribe(); subscription = null; }
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.public_key) });
      if (current !== identity()) { await subscription.unsubscribe(); subscription = null; return; }
      await bind(current);
      await request("subscription", "POST", {
        subscription: subscription.toJSON(), device_name: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? "Celular o tablet" : "Computador",
      });
      active = true;
      message("Notificaciones activadas. Usa Enviar prueba para comprobar que llegan a este dispositivo.");
    } catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  });
  async function deactivate() {
    const token = session?.token;
    ++sequence;
    if (!supported()) return;
    registration = registration || await navigator.serviceWorker.getRegistration("/empresa/");
    if (!registration) return;
    await bind(null);
    const existing = subscription || await registration.pushManager.getSubscription();
    if (existing) {
      // Local unsubscribe also works when the login token has already expired.
      await existing.unsubscribe();
      await request("subscription", "DELETE", { endpoint: existing.endpoint }, token).catch(() => {});
    }
    subscription = null;
    active = false;
  }
  disable.addEventListener("click", async () => {
    busy = true; controls();
    try { await deactivate(); message("Notificaciones desactivadas en este dispositivo."); }
    catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  });
  test.addEventListener("click", async () => {
    if (!subscription || !active) return;
    busy = true; controls();
    try {
      await request("test", "POST", { endpoint: subscription.endpoint });
      message("Prueba enviada. Busca el aviso de Qori entre las notificaciones de tu dispositivo.");
    } catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  });
  window.QoriAgendaPush = { refresh, deactivate };
  window.addEventListener("focus", () => { if (!busy && identity() && identity() !== scope) refresh(); });
  refresh();
})();

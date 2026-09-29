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
  let active = null;
  let busy = false;
  let checking = false;
  let retryTimer = null;
  let retries = 0;
  let sequence = 0;
  let scope = "";
  const identity = () => session?.user?.business_id ? `${session.user.business_id}:${session.user.id}` : "";
  // Remember consent, never use it as proof that a subscription is active.
  const preferenceKey = (current) => `qori:agenda-push:enabled:${current}`;
  function optedIn(current) {
    try { return window.localStorage.getItem(preferenceKey(current)) === "true"; } catch { return false; }
  }
  function remember(current, enabled) {
    if (!current) return;
    try {
      if (enabled) window.localStorage.setItem(preferenceKey(current), "true");
      else window.localStorage.removeItem(preferenceKey(current));
    } catch { /* The browser subscription remains the source of truth. */ }
  }
  const supported = () => window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const iosNeedsInstall = () => (/iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    && !window.matchMedia("(display-mode: standalone)").matches && !navigator.standalone;

  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
  function activationError(error) {
    if (/push service|registration failed/i.test(error.message || "")) {
      return "El navegador no pudo conectarse al servicio de notificaciones. Si usas Brave, revisa Configuración → Privacidad y seguridad → Usar servicios de Google para mensajería push. Después vuelve aquí y pulsa Activar. En otros navegadores, revisa tu conexión y los permisos de notificaciones.";
    }
    if (error.name === "NotAllowedError") {
      return "El navegador bloqueó las notificaciones. Permítelas para gosqori.com en la configuración del sitio y vuelve a pulsar Activar.";
    }
    return error.message || "No se pudo activar este dispositivo. Vuelve a intentarlo.";
  }
  function controls() {
    enable.hidden = active === true || checking;
    enable.textContent = active === null ? "Volver a comprobar" : "Activar en este dispositivo";
    disable.hidden = !subscription;
    test.hidden = !active;
    enable.disabled = busy || checking || (active !== null && !config?.enabled) || !supported() || iosNeedsInstall();
    disable.disabled = busy || checking;
    test.disabled = busy || checking || !active;
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
    if (busy || (checking && current === scope)) return;
    clearTimeout(retryTimer);
    retryTimer = null;
    const seq = ++sequence;
    if (!current || session?.user?.role === "BUSINESS_SELLER") {
      scope = ""; active = null; subscription = null; checking = false;
      panel.hidden = true; return;
    }
    panel.hidden = false;
    if (scope !== current) { active = null; subscription = null; retries = 0; }
    scope = current;
    const isCurrent = () => seq === sequence && current === identity();
    checking = true;
    message("Comprobando notificaciones guardadas en este dispositivo…");
    controls();
    if (iosNeedsInstall()) {
      checking = false; active = false; controls();
      message("En iPhone o iPad: abre el portal en Safari, pulsa Compartir → Añadir a pantalla de inicio. Abre Qori desde ese icono y activa los avisos aquí.");
      return;
    }
    if (!supported()) { checking = false; active = false; controls(); message("Abre el portal con HTTPS en un navegador compatible con notificaciones, como Chrome, Edge, Firefox o Safari."); return; }
    try {
      const nextConfig = await request("config");
      if (!isCurrent()) return;
      config = nextConfig;
      await localRegistration();
      if (!isCurrent()) return;
      let existing = await registration.pushManager.getSubscription();
      if (!isCurrent()) return;
      // A browser can lose/expire its subscription while retaining notification permission.
      // Restore only this account's explicit choice, without asking permission on page load.
      if (!existing && optedIn(current) && Notification.permission === "granted" && config.enabled) {
        existing = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.public_key) });
        if (!isCurrent()) return;
        try { await saveSubscription(existing); }
        catch (error) {
          // Leave no orphan subscription that would block the next recovery attempt.
          await existing.unsubscribe().catch(() => {});
          throw error;
        }
        if (!isCurrent()) return;
      }
      subscription = existing;
      let nextActive = false;
      if (subscription) {
        const saved = await request("status", "POST", { endpoint: subscription.endpoint });
        if (!isCurrent()) return;
        nextActive = Boolean(saved.active && Notification.permission === "granted" && config.enabled);
        if (!saved.active) remember(current, false);
      }
      await bind(nextActive ? current : null);
      if (!isCurrent()) return;
      active = nextActive;
      if (active) remember(current, true);
      retries = 0;
      message(!config.enabled ? "La activación de notificaciones está pendiente en el servidor."
        : Notification.permission === "denied" ? "Las notificaciones están bloqueadas. Permítelas en la configuración de este sitio y vuelve a cargar el portal."
          : active ? "Activas en este dispositivo: 24 horas, 30 minutos y 10 minutos antes."
            : "Actívalas en cada computador o celular donde quieras recibir tus recordatorios.");
    } catch (error) {
      if (isCurrent()) {
        active = null;
        message(`No pudimos comprobar las notificaciones. ${error.message}`, true);
        if (retries < 2) {
          retries += 1;
          retryTimer = setTimeout(() => { if (isCurrent()) refresh(); }, 3000 * retries);
        }
      }
    } finally { if (seq === sequence) { checking = false; controls(); } }
  }
  async function saveSubscription(value) {
    return request("subscription", "POST", {
      subscription: value.toJSON(), device_name: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? "Celular o tablet" : "Computador",
    });
  }
  function applicationKey(value) {
    const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }
  enable.addEventListener("click", async () => {
    if (active === null) { await refresh(); return; }
    if (busy || !config?.enabled || !identity()) return;
    ++sequence;
    clearTimeout(retryTimer);
    busy = true;
    controls();
    const current = identity();
    try {
      message("Esperando el permiso de notificaciones del navegador…");
      // Must happen directly in the click gesture, notably on iOS.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("No se activaron los avisos. Puedes permitirlos desde la configuración de este sitio.");
      if (current !== identity()) return;
      message("Conectando este dispositivo al servicio de notificaciones…");
      await localRegistration();
      // A fresh subscription avoids linking a shared browser to its previous account or VAPID key.
      if (subscription && !active) { await subscription.unsubscribe(); subscription = null; }
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.public_key) });
      if (current !== identity()) { await subscription.unsubscribe(); subscription = null; return; }
      await bind(current);
      await saveSubscription(subscription);
      if (current !== identity()) return;
      remember(current, true);
      active = true;
      message("Notificaciones activadas. Usa Enviar prueba para comprobar que llegan a este dispositivo.");
    } catch (error) { message(activationError(error), true); }
    finally { busy = false; controls(); }
  });
  async function deactivate() {
    const token = session?.token;
    remember(identity(), false);
    ++sequence;
    clearTimeout(retryTimer);
    checking = false;
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
      const started = Date.now();
      await request("test", "POST", { endpoint: subscription.endpoint });
      message("Prueba enviada. Comprobando si este navegador la recibe…");
      let received = false;
      if (registration?.getNotifications) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const notices = await registration.getNotifications({ tag: "qori-agenda-test" });
          if (notices.some((notice) => notice.data?.identity === identity() && notice.data?.received_at >= started)) {
            received = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      message(received
        ? "Prueba recibida por este navegador. Si no ves el aviso, revisa el centro de notificaciones del sistema, los permisos de Brave/Chrome/Edge/Firefox/Safari y el modo No molestar."
        : "El proveedor aceptó la prueba, pero este navegador aún no confirma recepción. Revisa la conexión, los permisos y los ajustes de notificaciones del navegador; después vuelve a probar.");
    } catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  });
  window.QoriAgendaPush = { refresh, deactivate };
  window.addEventListener("focus", () => { if (!busy && identity()) refresh(); });
  window.addEventListener("online", () => { if (!busy && identity()) refresh(); });
  window.addEventListener("pageshow", (event) => { if (event.persisted && !busy) refresh(); });
  refresh();
})();

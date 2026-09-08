(() => {
  const SESSION_KEY = "qr_business_portal_session_v1";
  const COOKIE_NAME = "qori_portal_access";
  const TRAINING_PREFIXES = ["/academia-vendedores", "/cultivar-ventas"];

  function sessionFromStorage() {
    try {
      const session = JSON.parse(window.localStorage.getItem(SESSION_KEY));
      const encoded = String(session?.token || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(encoded.padEnd(encoded.length + ((4 - encoded.length % 4) % 4), "=")));
      if (!session?.token || !payload?.exp || payload.exp * 1000 <= Date.now()) return null;
      return { ...session, expiresAt: payload.exp * 1000 };
    } catch {
      return null;
    }
  }

  function clearAccessCookie() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }

  function syncAccessCookie(session) {
    if (!session?.token) {
      clearAccessCookie();
      return false;
    }
    const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(session.token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    return true;
  }

  function requestedTrainingPath() {
    const requested = new URLSearchParams(window.location.search).get("continue");
    if (!requested) return "";
    try {
      const target = new URL(requested, window.location.origin);
      const allowed = target.origin === window.location.origin
        && TRAINING_PREFIXES.some((prefix) => target.pathname === prefix || target.pathname.startsWith(`${prefix}/`));
      const continuationHash = target.hash || window.location.hash;
      return allowed ? `${target.pathname}${target.search}${continuationHash}` : "";
    } catch {
      return "";
    }
  }

  function syncAndContinue() {
    const session = sessionFromStorage();
    if (!syncAccessCookie(session)) return false;
    const target = requestedTrainingPath();
    if (target) window.location.replace(target);
    return true;
  }

  syncAndContinue();

  document.addEventListener("submit", (event) => {
    if (event.target?.id !== "loginForm" || !requestedTrainingPath()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (syncAndContinue() || attempts >= 100) window.clearInterval(timer);
    }, 100);
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#logoutButton")) clearAccessCookie();
  }, true);
})();

(() => {
  'use strict';
  const key = 'qori_commercial_referral_v1', lifetime = 30 * 86400000;
  const params = new URLSearchParams(location.search);
  let current = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved.id === 'string' && saved.expires_at > Date.now()) current = saved;
    else localStorage.removeItem(key);
  } catch { /* Browsers may block storage; the current link still works. */ }
  const explicit = params.get('advisor') ?? params.get('seller');
  if (explicit !== null) {
    // Keep even an invalid explicit link: never silently fall back to a different seller.
    current = { id: explicit, expires_at: Date.now() + lifetime };
    try { localStorage.setItem(key, JSON.stringify(current)); } catch {}
  }
  function decorate() {
    if (!current) return;
    document.querySelectorAll('a[href]').forEach(a => {
      let url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch { return; }
      // Carry the referral through Home too, including browsers without storage.
      if (url.origin !== location.origin || !/^\/(?:(?:paquetes|pense-en-ti)(?:\/(?:index\.html)?)?|index\.html)?$/.test(url.pathname)) return;
      if (!a.dataset.qoriReferral && (url.searchParams.has('advisor') || url.searchParams.has('seller'))) return;
      url.searchParams.delete('advisor'); url.searchParams.delete('seller');
      url.searchParams.set(url.pathname.startsWith('/pense-en-ti') ? 'seller' : 'advisor', current.id);
      a.href = url.href;
      a.dataset.qoriReferral = 'true';
    });
  }
  window.QoriReferral = {
    get: () => current ? current.id : null,
    clear() {
      current = null;
      try { localStorage.removeItem(key); } catch {}
      const url = new URL(location.href); url.searchParams.delete('advisor'); url.searchParams.delete('seller');
      history.replaceState(history.state, '', url);
      document.querySelectorAll('a[data-qori-referral]').forEach(a => {
        const link = new URL(a.href); link.searchParams.delete('advisor'); link.searchParams.delete('seller'); a.href = link.href; delete a.dataset.qoriReferral;
      });
    },
    decorate
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate);
  else decorate();
})();

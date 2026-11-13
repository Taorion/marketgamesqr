(() => {
  'use strict';
  const token = new URLSearchParams(location.hash.slice(1)).get('recuperar');
  if (!token && !new URLSearchParams(location.search).has('recuperar')) return;
  window.QoriSellerActivation = { active: true };
  history.replaceState(null, '', location.pathname);
  sessionStorage.removeItem('qori-seller-token');
  const panel = document.createElement('section');
  panel.className = 'section';
  panel.id = 'sellerPasswordRecovery';
  panel.setAttribute('aria-labelledby', 'sellerRecoveryTitle');
  document.querySelector('#main').prepend(panel);
  document.querySelector('#landing').hidden = true;
  document.querySelector('#loginOpen').hidden = true;
  panel.innerHTML = `<span class="eyebrow">QORI SELLER · ACCESO AL PORTAL</span>
    <h1 id="sellerRecoveryTitle">${token ? 'Crea tu nueva contraseña' : 'Recupera tu contraseña'}</h1>
    <p>Este cambio corresponde a tu acceso al Portal de embajadores y Demo Qori. La contraseña de tu correo Qori se administra por separado.</p>
    <form class="card form-grid">
      ${token ? '<label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><label>Confirma la nueva contraseña<input name="password_confirm" type="password" autocomplete="new-password" minlength="12" maxlength="72" required></label><p class="full">Usa al menos 12 caracteres. El enlace vence en 30 minutos y solo puede usarse una vez.</p>' : '<label class="full">Correo de tu cuenta de embajador<input name="email" type="email" autocomplete="email" maxlength="180" required></label>'}
      <button class="primary full" type="submit">${token ? 'Guardar nueva contraseña' : 'Solicitar enlace por correo'}</button>
      <p class="status full" role="status" aria-live="polite"></p>
    </form>
    <p><a href="/seller/">Volver al ingreso de Qori Seller</a>${token ? ' · <a href="/seller/?recuperar=1">Solicitar otro enlace</a>' : ''}</p>`;
  const form = panel.querySelector('form');
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector('button'), status = form.querySelector('[role=status]');
    if (button.disabled) return;
    if (!form.reportValidity()) return;
    if (token && form.elements.password.value !== form.elements.password_confirm.value) {
      status.textContent = 'Las contraseñas no coinciden.';
      return;
    }
    button.disabled = true;
    status.textContent = token ? 'Guardando tu contraseña…' : 'Solicitando enlace…';
    try {
      const body = token ? { token, password: form.elements.password.value, password_confirm: form.elements.password_confirm.value } : { email: form.elements.email.value.trim() };
      const response = await fetch('/api/auth/password/' + (token ? 'reset' : 'request-reset'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message || 'No pudimos completar la solicitud. Inténtalo nuevamente.');
      form.reset();
      if (token) {
        form.innerHTML = '<div class="full"><h2>Contraseña actualizada</h2><p>Ya puedes ingresar con tu correo y tu nueva contraseña. Las sesiones anteriores se cerraron.</p><a class="primary" href="/seller/">Ingresar a Qori Seller</a></div>';
      } else {
        status.textContent = data.message + ' Revisa también la carpeta de correo no deseado. Si no recibes el enlace, solicita uno al administrador de Qori.';
      }
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
})();

(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = v => v === null ? 'Por confirmar' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v || 0));
  const base = '/api/public/catalog-orders';
  const statuses = { NEW: 'Solicitud enviada', PENDING: 'Pendiente de confirmar', ACCEPTED: 'Aceptado', PREPARING: 'En preparación', READY: 'Listo para despacho', ON_THE_WAY: 'En camino', DELIVERED: 'Entregado', CANCELLED: 'Cancelado', REJECTED: 'Rechazado', UNPAID: 'Pendiente de cobro', PAID: 'Cobro registrado por el negocio', REFUNDED: 'Devolución registrada por el negocio', VOIDED: 'Venta anulada' };
  async function api(path, body, token) {
    const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Order-Token': token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json(); if (!res.ok) { const error = new Error(data.error?.message || 'No se pudo completar la solicitud.'); error.status = res.status; throw error; } return data;
  }
  let session;
  try { session = sessionStorage.getItem('qori-order-session'); if (!session) { session = crypto.randomUUID(); sessionStorage.setItem('qori-order-session', session); } } catch { session = crypto.randomUUID(); }
  let catalog, cfg, products = [], cart = [], dialog, quote, requestId, busy = false, pending = null;
  const key = () => 'qori-cart:' + catalog.slug;
  function persist() { try { sessionStorage.setItem(key(), JSON.stringify(cart)); } catch { /* memory fallback */ } }
  function track(event_type, step, product_id) { return api('/catalogs/' + encodeURIComponent(catalog.slug) + '/events', { session_id: session, event_type, step, product_id: product_id || null }).catch(() => {}); }
  const pendingKey = () => 'qori-order-pending:' + catalog.slug;
  const receiptKey = () => 'qori-order-receipt:' + catalog.slug;
  function updateBar() {
    const label = document.getElementById('qo-count');
    if (label) label.textContent = `${cart.reduce((n, i) => n + i.quantity, 0)} productos en tu carrito`;
    const state = document.getElementById('qo-bar-state'); if (state) state.textContent = cfg.receiving ? 'Revisa tu pedido antes de enviarlo' : 'Recepción pausada o fuera de horario';
  }
  function pendingDialog() {
    const body = open('<span class="qo-kicker">Solicitud pendiente de respuesta</span><h2>Recupera tu pedido</h2><p>La conexión se interrumpió. Consulta la misma solicitud para evitar enviarla dos veces.</p><button class="qo-primary" id="qo-recover">Recuperar solicitud</button><p id="qo-recover-error" role="alert"></p>');
    body.querySelector('#qo-recover').onclick = async e => {
      e.target.disabled = true;
      try { complete(await api('/catalogs/' + encodeURIComponent(catalog.slug) + '/orders', pending.body), body); }
      catch (err) { body.querySelector('#qo-recover-error').textContent = err.message; if (err.status === 400) { pending = null; try { sessionStorage.removeItem(pendingKey()); } catch {} body.querySelector('#qo-recover').textContent = 'Volver a revisar mi carrito'; body.querySelector('#qo-recover').onclick = showCart; } e.target.disabled = false; }
    };
  }
  function complete(result, body) {
    cart = []; pending = null; persist(); updateBar();
    const url = '/smart-catalog/pedido.html#' + result.token;
    try { sessionStorage.removeItem(pendingKey()); sessionStorage.setItem(receiptKey(), url); } catch {}
    body.innerHTML = `<span class="qo-success-mark" aria-hidden="true">✓</span><span class="qo-badge">Pedido #${result.order.number}</span><h2>Tu solicitud fue enviada.</h2><p>El establecimiento debe confirmar disponibilidad y entrega.</p><p>Conserva este enlace privado para consultar tu pedido${result.order.total === null ? ' y aceptar el costo del domicilio' : ''}.</p><a class="qo-primary qo-link" href="${url}">Consultar mi pedido →</a><label>Tu enlace privado<input readonly value="${esc(location.origin + url)}"></label><p class="qo-note">Enviar la solicitud no confirma pago ni entrega. No compartas tu enlace privado con terceros.</p>`;
    const h = body.querySelector('h2'); h.tabIndex = -1; h.focus();
  }
  function open(content) {
    dialog?.remove(); dialog = document.createElement('dialog'); dialog.className = 'qo-dialog'; dialog.setAttribute('aria-label', 'Tu pedido a domicilio');
    dialog.innerHTML = `<div class="qo-content"><button type="button" class="qo-close">Cerrar</button><div id="qo-body" class="qo-step">${content}</div></div>`;
    document.body.append(dialog); const prior = document.activeElement;
    dialog.querySelector('.qo-close').onclick = () => dialog.close(); dialog.addEventListener('close', () => prior?.focus()); dialog.showModal(); const title = dialog.querySelector('h2'); if (title) { title.tabIndex = -1; title.focus(); } return dialog.querySelector('#qo-body');
  }
  function addProduct(id) {
    if (pending) return pendingDialog();
    const p = products.find(p => p.id === id); if (!p) return;
    track('product_view', 'CATALOG', p.id);
    const body = open(`<span class="qo-kicker">Elige a tu gusto</span>${p.image_url ? `<img class="qo-detail-photo" src="${esc(p.image_url)}" alt="${esc(p.name)}">` : ''}<h2>${esc(p.name)}</h2><p>${esc(p.description || p.short_description || '')}</p>${p.variants.length ? `<label>Presentación<select id="qo-variant">${p.variants.map(v => `<option value="${esc(v.id)}" ${!v.available ? 'disabled' : ''}>${esc(v.name)} · ${money(v.price)}${v.available ? '' : ' · Agotado'}</option>`).join('')}</select></label>` : `<p>${money(p.price)}</p>`}<label>Cantidad<input type="number" id="qo-quantity" value="1" min="1" max="99" step="1"></label><button id="qo-add" class="qo-primary" ${!cfg.receiving || p.unavailable || p.price === null || p.currency !== 'COP' || (p.variants.length && !p.variants.some(v => v.available)) ? 'disabled' : ''}>Añadir al carrito</button><p class="qo-note">El negocio confirmará disponibilidad. Añadir al carrito no reserva existencias.</p>`);
    body.querySelector('#qo-add').onclick = () => {
      const qty = Number(body.querySelector('#qo-quantity').value), variant = body.querySelector('#qo-variant')?.value || null;
      if (!Number.isInteger(qty) || qty < 1 || qty > 99 || (p.variants.length && !p.variants.some(v => v.id === variant && v.available))) return;
      const existing = cart.find(i => i.product_id === id && i.variant_id === variant);
      if (existing) existing.quantity = Math.min(99, existing.quantity + qty); else cart.push({ product_id: id, variant_id: variant, quantity: qty });
      persist(); updateBar(); track('info_click', 'CART'); dialog.close();
    };
  }
  function showCart() {
    if (pending) return pendingDialog();
    const body = open(`<span class="qo-kicker">Paso 1 de 2 · Tu carrito</span><h2>¿Te llevamos algo más?</h2><p>Revisa las cantidades y elige tu zona de entrega.</p><div id="qo-lines" class="qo-step"></div><p id="qo-estimate" class="qo-subtotal"></p><label>Zona de entrega<select id="qo-zone">${cfg.config.zones.map(z => `<option value="${esc(z.id)}">${esc(z.name)} · ${money(z.fee)}</option>`).join('')}</select></label><p class="qo-note">${esc(cfg.config.payment_instructions)}<br>${esc(cfg.config.terms)}<br>El establecimiento prepara, entrega y cobra. Qori organiza tu solicitud.</p><p class="qo-error" id="qo-error" role="alert"></p><button id="qo-review" class="qo-primary">Revisar precios y continuar</button>`);
    const render = () => {
      body.querySelector('#qo-lines').innerHTML = cart.map((i, index) => { const p = products.find(p => p.id === i.product_id), v = p?.variants.find(v => v.id === i.variant_id); return `<div class="qo-item"><div><strong>${esc(p?.name || 'Producto ya no disponible')}</strong><p>${esc(v?.name || '')} · ${money(v?.price ?? p?.price ?? null)} c/u</p></div><label>Cantidad<input type="number" min="1" max="99" step="1" data-qty="${index}" value="${i.quantity}"></label><button data-remove="${index}">Quitar</button></div>`; }).join('') || '<p>Tu carrito está vacío. Elige productos de la vitrina.</p>';
      body.querySelector('#qo-estimate').textContent = 'Productos estimados: ' + money(cart.reduce((sum, i) => { const p = products.find(p => p.id === i.product_id), v = p?.variants.find(v => v.id === i.variant_id); return sum + Number(v?.price ?? p?.price ?? 0) * i.quantity; }, 0));
      body.querySelector('#qo-review').disabled = !cart.length || !cfg.receiving;
      body.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { cart.splice(Number(b.dataset.remove), 1); persist(); updateBar(); render(); });
      body.querySelectorAll('[data-qty]').forEach(input => input.onchange = () => { const value = Number(input.value); if (!Number.isInteger(value) || value < 1 || value > 99) return input.reportValidity(); cart[Number(input.dataset.qty)].quantity = value; persist(); updateBar(); render(); });
    }; render();
    body.querySelector('#qo-review').onclick = async e => {
      e.target.disabled = true;
      try { quote = await api('/catalogs/' + encodeURIComponent(catalog.slug) + '/quote', { session_id: session, zone_id: body.querySelector('#qo-zone').value, items: cart }); requestId = crypto.randomUUID(); checkout(); } catch (err) { body.querySelector('#qo-error').textContent = err.message; e.target.disabled = false; }
    };
  }
  function checkout() {
    const q = quote.quote;
    const body = open(`<span class="qo-kicker">Paso 2 de 2 · Datos de entrega</span><h2>¿Dónde lo recibes?</h2><p>Revisa el total y deja los datos para que el negocio atienda tu pedido.</p><ul>${q.items.map(i => `<li>${i.quantity} × ${esc(i.name)} ${esc(i.variant_name || '')} · ${money(i.line_total)}</li>`).join('')}</ul><p>Productos: ${money(q.subtotal)}<br>Domicilio (${esc(q.zone.name)}): ${money(q.delivery_fee)}</p><p class="qo-total">${q.total === null ? 'Total pendiente de acordar domicilio' : 'Total: ' + money(q.total)}</p><form id="qo-checkout" class="qo-step"><label>Nombre<input name="name" autocomplete="name" minlength="2" maxlength="160" required></label><label>Teléfono de contacto<input name="phone" type="tel" autocomplete="tel" minlength="7" maxlength="24" required></label><label>Dirección de entrega<input name="address" autocomplete="street-address" minlength="5" maxlength="300" required></label><label>Referencias para llegar<input name="references" maxlength="300"></label><label>Observaciones<textarea name="notes" maxlength="1000"></textarea></label><p class="qo-note">${esc(q.terms)}<br>${esc(q.payment_instructions)}</p><label><input type="checkbox" name="terms" required>Acepto estas condiciones y el uso de mis datos para atender esta solicitud. <a href="/privacidad/" target="_blank" rel="noopener">Privacidad</a></label><label><input type="checkbox" name="marketing">${esc(cfg.consent_text)}</label><p class="qo-note">Tu solicitud será enviada. El establecimiento debe confirmar disponibilidad y entrega. No constituye un pago ni una compra confirmada.</p><p class="qo-error" id="qo-submit-error" role="alert"></p><button class="qo-primary" id="qo-submit">Enviar solicitud</button></form>`);
    let submittedBody;
    body.querySelector('form').onsubmit = async e => {
      e.preventDefault(); if (busy) return; busy = true;
      const form = e.target, button = body.querySelector('#qo-submit'); button.disabled = true;
      // Keep the exact body and id for uncertain network retries. A fresh quote needs a new request.
      if (!submittedBody) submittedBody = { request_id: requestId, session_id: session, quote_token: quote.quote_token, name: form.elements.name.value, phone: form.elements.phone.value, address: form.elements.address.value, references: form.elements.references.value, notes: form.elements.notes.value, terms_accepted: form.elements.terms.checked, marketing_consent: form.elements.marketing.checked };
      pending = { body: submittedBody }; try { sessionStorage.setItem(pendingKey(), JSON.stringify(pending)); } catch {}
      try {
        const result = await api('/catalogs/' + encodeURIComponent(catalog.slug) + '/orders', submittedBody);
        complete(result, body);
      } catch (err) {
        if (err.status === 400) { submittedBody = null; pending = null; try { sessionStorage.removeItem(pendingKey()); } catch {} requestId = crypto.randomUUID(); }
        body.querySelector('#qo-submit-error').textContent = err.message + (err.status === 400 ? ' Corrige los datos o cierra esta ventana y revisa de nuevo el carrito.' : ' Si hubo un problema de conexión, pulsa de nuevo para recuperar la misma solicitud.'); button.disabled = false;
      } finally { busy = false; }
    };
  }
  async function init(c, visibleProducts = []) {
    catalog = c;
    try {
      cfg = await api('/catalogs/' + encodeURIComponent(c.slug) + '/config'); if (!cfg.enabled) return false;
      document.body.classList.add('qo-storefront');
      document.querySelector('.catalog-kicker').textContent = 'Tu vitrina de domicilios';
      document.querySelector('.products-section .section-head p').textContent = 'Elige tus productos, revisa el carrito y envíanos tu solicitud. Sin crear una cuenta.';
      document.querySelector('.products-section .section-head h2').textContent = '¿Qué te llevamos hoy?';
      const hero = document.getElementById('catalogHero');
      hero.insertAdjacentHTML('beforeend', `<div class="qo-store-status"><span class="qo-badge ${cfg.receiving ? 'qo-open' : 'qo-closed'}">${cfg.receiving ? 'Recibimos solicitudes' : (cfg.config.paused ? 'Recepción pausada' : 'Fuera de horario')}</span><button id="qo-delivery-info" type="button">Horarios, zonas y domicilios</button></div>`);
      document.getElementById('qo-delivery-info').onclick = () => {
        const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        open(`<span class="qo-kicker">Antes de pedir</span><h2>Así llegan tus productos</h2><h3>Zonas de entrega</h3><ul class="qo-facts">${cfg.config.zones.map(z => `<li><span>${esc(z.name)}</span><strong>${money(z.fee)}</strong></li>`).join('')}</ul><h3>Horarios de recepción</h3><ul class="qo-facts">${cfg.config.hours.map(h => `<li><span>${days[h.day]}</span><strong>${esc(h.open)} – ${esc(h.close)}</strong></li>`).join('')}</ul><p class="qo-muted">Hora de ${esc(cfg.config.timezone)}</p><h3>Cómo pagas</h3><p>${esc(cfg.config.payment_instructions)}</p><p class="qo-note">${esc(cfg.config.terms)}</p>`);
      };
      document.getElementById('catalogContactButton').textContent = 'Consultar al negocio';
      document.getElementById('floatingWhatsappButton').hidden = true;
      products = (await api('/catalogs/' + encodeURIComponent(c.slug) + '/products')).products;
      products.push(...visibleProducts.filter(p => !products.some(a => a.id === p.id)).map(p => ({ id: p.id, name: p.name, description: p.description, short_description: p.short_description, image_url: p.image_url, price: p.price, currency: p.currency, variants: [], unavailable: true })));
      try { cart = JSON.parse(sessionStorage.getItem(key()) || '[]'); if (!Array.isArray(cart)) cart = []; cart = cart.filter(i => i && typeof i.product_id === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 99); pending = JSON.parse(sessionStorage.getItem(pendingKey()) || 'null'); if (!pending?.body?.request_id) pending = null; } catch { cart = []; pending = null; }
      const bar = document.createElement('aside'); bar.className = 'qo-bar'; bar.setAttribute('aria-label','Tu carrito'); bar.innerHTML = '<div><strong id="qo-count" aria-live="polite"></strong><small id="qo-bar-state"></small></div><button id="qo-open">Ver mi carrito →</button>'; document.querySelector('main').append(bar);
      bar.querySelector('button').onclick = showCart; updateBar();
      if (pending) { const b = document.createElement('button'); b.textContent = 'Recuperar solicitud pendiente'; b.className = 'qo-recover-banner'; b.onclick = pendingDialog; hero.append(b); }
      try { const receipt = sessionStorage.getItem(receiptKey()); if (/^\/smart-catalog\/pedido\.html#[a-f0-9]{64}$/.test(receipt || '')) { const a = document.createElement('a'); a.href = receipt; a.textContent = 'Consultar mi último pedido →'; a.className = 'qo-last-order'; hero.append(a); } } catch {}
      const decorate = () => (document?.querySelectorAll('[data-order-product]') || []).forEach(b => {
        const p = products.find(p => p.id === b.dataset.orderProduct);
        const available = p && !p.unavailable && p.price !== null && p.currency === 'COP' && (!p.variants.length || p.variants.some(v => v.available));
        b.textContent = !available ? 'No disponible' : cfg.receiving ? 'Añadir al carrito' : 'Fuera de horario'; b.disabled = !available || !cfg.receiving;
        const price = b.closest('.product-card')?.querySelector('.product-price');
        if (price && p?.variants.some(v => v.available)) price.textContent = 'Desde ' + money(Math.min(...p.variants.filter(v => v.available).map(v => v.price)));
      });
      decorate(); for (const id of ['productGrid','featuredGrid']) new MutationObserver(decorate).observe(document.getElementById(id), { childList: true });
      document.addEventListener('click', e => {
        const b = e.target.closest('[data-order-product], [data-info-product]');
        if (b) { e.preventDefault(); e.stopImmediatePropagation(); addProduct(b.dataset.orderProduct || b.dataset.infoProduct); }
        if (e.target.closest('#catalogContactButton, #floatingWhatsappButton')) {
          e.preventDefault(); e.stopImmediatePropagation(); const phone = String(c.whatsapp_number || '').replace(/\D/g, '');
          const body = open(`<span class="qo-kicker">Atención del establecimiento</span><h2>Habla con ${esc(c.brand_name || c.title)}</h2><p>Consulta cobertura, disponibilidad o novedades directamente con el negocio.</p>${phone ? `<a class="qo-link qo-primary" href="https://wa.me/${phone}" target="_blank" rel="noopener">Abrir WhatsApp del negocio</a>` : '<p>El negocio aún no tiene un número de contacto disponible.</p>'}`);
        }
      }, true);
      return true;
    } catch {
      if (cfg?.enabled) {
        document.querySelectorAll('[data-order-product]').forEach(b => { b.disabled = true; b.textContent = 'Intenta de nuevo'; });
        const msg = document.createElement('p'); msg.className = 'qo-note'; msg.setAttribute('role','alert'); msg.textContent = 'No pudimos cargar los pedidos. Actualiza la página para intentarlo de nuevo.'; document.getElementById('catalogHero').append(msg); return true;
      }
      return false;
    }
  }
  async function showStatus() {
    const target = document.getElementById('qo-status'); if (!target) return;
    const token = location.hash.slice(1);
    const load = async () => {
      try {
        const { order: o } = await api('/status', null, token);
        target.innerHTML = `<div class="qo-content"><div class="qo-status-heading"><img class="qo-status-logo" src="/img/qori-logo.png" alt="Qori"><span class="qo-badge">Pedido #${o.number}</span></div><h1>${esc(statuses[o.status])}</h1><ol class="qo-timeline" aria-label="Avance del pedido">${['NEW','ACCEPTED','PREPARING','ON_THE_WAY','DELIVERED'].map((s, i) => `<li class="${({NEW:0,PENDING:0,ACCEPTED:1,PREPARING:2,READY:2,ON_THE_WAY:3,DELIVERED:4})[o.status] >= i ? 'is-complete' : ''}"><span>${i + 1}</span>${['Enviado','Aceptado','Preparando','En camino','Entregado'][i]}</li>`).join('')}</ol><p>${esc(o.business_name)}</p><p class="qo-note">${o.status === 'NEW' ? 'Tu solicitud fue enviada. El establecimiento debe confirmar disponibilidad y entrega.' : 'El establecimiento actualiza el estado de tu pedido.'}</p><p><strong>Entrega: ${esc(statuses[o.status])}</strong><br>Pago: ${esc(statuses[o.payment_status])}</p><ul>${o.items.map(i => `<li>${i.quantity} × ${esc(i.name)} ${esc(i.variant_name || '')} · ${money(i.line_total)}</li>`).join('')}</ul><p>Productos: ${money(o.subtotal)}<br>Domicilio: ${money(o.delivery_fee)}</p><p class="qo-total">Total: ${money(o.total)}</p>${o.proposed_fee !== null ? `<div class="qo-note"><h3>El negocio propone el domicilio</h3><p>Domicilio: ${money(o.proposed_fee)} · Nuevo total: ${money(Number(o.subtotal) + Number(o.proposed_fee))}</p><button id="qo-accept-fee">Acepto este valor</button></div>` : ''}<p>Entrega acordada: ${o.agreed_at ? esc(new Date(o.agreed_at).toLocaleString('es-CO')) : 'Por confirmar con el establecimiento'}</p>${o.reason ? `<p>Motivo: ${esc(o.reason)}</p>` : ''}<p class="qo-note">${esc(o.terms)}<br>${esc(o.payment_instructions)}</p><p>Comunicaciones comerciales: ${o.marketing_consent ? 'autorizadas' : 'sin autorización vigente'}.</p>${o.marketing_consent ? '<button id="qo-withdraw">Retirar autorización comercial</button>' : ''}<button id="qo-refresh" class="qo-primary">Actualizar estado</button><p id="qo-status-error" class="qo-error" role="alert"></p><small>Última consulta: ${new Date().toLocaleTimeString('es-CO')}. Los pagos son declarados por el establecimiento; no son verificaciones bancarias.</small></div>`;
        const act = async body => { try { await api('/status', body, token); await load(); } catch (e) { document.getElementById('qo-status-error').textContent = e.message; } };
        document.getElementById('qo-accept-fee')?.addEventListener('click', () => act({ action: 'ACCEPT_FEE', proposal_version: o.proposal_version }));
        document.getElementById('qo-withdraw')?.addEventListener('click', () => act({ action: 'WITHDRAW_CONSENT' })); document.getElementById('qo-refresh').onclick = load;
      } catch (e) { target.innerHTML = `<div class="qo-content"><h1>No se pudo consultar el pedido</h1><p>${esc(e.message)}</p><p>Abre el enlace privado que recibiste al enviar la solicitud.</p></div>`; }
    }; await load();
  }
  window.QoriOrders = { init, openProduct: addProduct, sessionId: session }; showStatus();
})();

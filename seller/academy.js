(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const labels = { VIDEO: 'Video', PPTX: 'PowerPoint', PDF: 'PDF' };
  async function render(host, ctx) {
    const current = () => host.isConnected && ctx.isCurrent();
    host.classList.add('seller-resources');
    host.innerHTML = '<p role="status">Cargando Qori Academy…</p>';
    let data;
    try { data = await ctx.request('/api/seller/resources/academy'); }
    catch (error) { if (current()) host.innerHTML = `<p role="alert">${esc(error.message)}</p><button type="button" data-retry>Reintentar</button>`; host.querySelector('[data-retry]')?.addEventListener('click', () => render(host, ctx)); return; }
    if (!current()) return;
    let search = '', format = '';
    host.innerHTML = `<header class="qa-hero"><div><span class="qr-kicker">FORMACIÓN PARA EMBAJADORES</span><h2>Qori Academy</h2><p>Conoce Qori. Comprende el negocio.<br>Prepara tu próxima conversación.</p><a href="#academyLibrary" class="qa-jump">Explorar los materiales ↓</a></div><div class="qa-counts"><strong>04 <span>videos de capacitación</span></strong><strong>05 <span>materiales de consulta</span></strong></div></header><section class="qa-path"><span class="qr-kicker">TU RECORRIDO</span><h3>Aprende a tu ritmo y llévalo a la práctica.</h3><ol><li><strong>Conoce Qori</strong><span>Revisa las capacitaciones y la filosofía de marca.</span></li><li><strong>Escucha al negocio</strong><span>Consulta cliente ideal y diagnóstico comercial.</span></li><li><strong>Prepara tu propuesta</strong><span>Elige una solución y practica la apertura comercial.</span></li></ol></section><section class="qa-viewer" hidden aria-label="Reproductor de capacitación"><div class="qa-viewer-head"><h3 data-playing></h3><button type="button" data-close>Cerrar video</button></div><iframe title="Video de capacitación Qori" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe><p>Si el reproductor no carga, <a data-external target="_blank" rel="noopener noreferrer">abre el video en Google Drive ↗</a>.</p></section><section id="academyLibrary" aria-labelledby="academyLibraryTitle"><h3 id="academyLibraryTitle">Tu biblioteca</h3><div class="qa-filters"><label>Buscar material<input type="search" data-search placeholder="Marca, diagnóstico, sellos…"></label><label>Formato<select data-format><option value="">Todos los materiales</option><option value="VIDEO">Videos</option><option value="PPTX">PowerPoint</option><option value="PDF">PDF</option></select></label></div><p data-status role="status"></p><div class="qr-grid" data-cards></div></section>`;
    const viewer = host.querySelector('.qa-viewer'), video = viewer.querySelector('iframe'), status = host.querySelector('[data-status]');
    const stop = () => { video.removeAttribute('src'); viewer.hidden = true; };
    viewer.querySelector('[data-close]').onclick = stop;
    const observer = new MutationObserver(() => { if (!current() || !host.contains(viewer)) { stop(); observer.disconnect(); } });
    observer.observe(document.body, { childList: true, subtree: true });
    async function open(item, button) {
      button.disabled = true;
      status.textContent = 'Preparando el material…';
      try {
        if (!current()) return;
        if (item.format === 'VIDEO') {
          // Only the server catalog may supply a Drive preview URL.
          const preview = new URL(item.embed_url);
          if (preview.origin !== 'https://drive.google.com' || !/^\/file\/d\/[a-zA-Z0-9_-]+\/preview$/.test(preview.pathname)) throw Error('Enlace de video no válido.');
          video.src = preview.href; video.title = item.title; viewer.hidden = false;
          viewer.querySelector('[data-playing]').textContent = item.title;
          viewer.querySelector('[data-external]').href = preview.href.replace(/\/preview$/, '/view');
          viewer.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); video.focus();
        } else {
          await ctx.download('/api/seller/resources/academy/' + encodeURIComponent(item.id) + '/download', item.filename);
        }
        status.textContent = item.format === 'VIDEO' ? 'Pulsa reproducir para comenzar.' : 'Descarga solicitada.';
      } catch (error) { if (current()) status.textContent = error.message; }
      finally { button.disabled = false; }
    }
    function cards() {
      const rows = data.resources.filter(item => (!format || item.format === format) && (!search || [item.title, item.description].join(' ').toLocaleLowerCase('es').includes(search)));
      status.textContent = `${rows.length} de ${data.resources.length} materiales`;
      host.querySelector('[data-cards]').innerHTML = rows.map(item => `<article class="qr-card qa-card"><div class="qr-meta"><span>${esc(labels[item.format])}</span><span>${String(item.order).padStart(2, '0')}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><small>${item.byte_size ? (item.byte_size / 1024 / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' MB' : 'Archivo pendiente de disponibilidad'}</small><div class="qr-actions"><button type="button" data-open="${esc(item.id)}" ${item.available ? '' : 'disabled'}>${item.available ? item.format === 'VIDEO' ? 'Ver capacitación' : 'Descargar ' + labels[item.format] : 'Temporalmente no disponible'}</button></div></article>`).join('') || '<p>No encontramos materiales con esa búsqueda.</p>';
      host.querySelectorAll('[data-open]').forEach(button => { button.onclick = () => open(rows.find(item => item.id === button.dataset.open), button); });
    }
    host.querySelector('[data-search]').oninput = event => { search = event.target.value.trim().toLocaleLowerCase('es'); cards(); };
    host.querySelector('[data-format]').onchange = event => { format = event.target.value; cards(); };
    cards();
  }
  window.QoriAcademy = { render };
})();

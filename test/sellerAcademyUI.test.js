const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { catalog } = require('../backend/src/services/sellerAcademyService');
function setup() {
  const w = new JSDOM('<main></main>', { url: 'https://gosqori.com/seller/', runScripts: 'outside-only' }).window;
  w.eval(fs.readFileSync('seller/academy.js', 'utf8'));
  const resources = catalog.map(r => ({ ...r, available: true, byte_size: 100, embed_url: 'https://drive.google.com/file/d/test-video/preview' }));
  const host = w.document.querySelector('main'), downloads = [];
  const ctx = { isCurrent: () => true, request: async p => p.endsWith('/academy') ? ({ enabled:true, resources }) : ({resource:resources.find(r=>p.endsWith('/'+r.id))}), download: async (...args) => downloads.push(args) };
  return { w, host, ctx, downloads, resources };
}
test('Academy renders nine materials, filters, plays on demand and downloads authenticated documents', async () => {
  const s = setup();
  try {
    await s.w.QoriAcademy.render(s.host, s.ctx);
    assert.equal(s.host.querySelectorAll('[data-open]').length, 9);
    assert.equal(s.host.querySelector('iframe').hasAttribute('src'), false);
    const filter = s.host.querySelector('[data-format]'); filter.value = 'VIDEO'; filter.onchange({ target: filter });
    assert.equal(s.host.querySelectorAll('[data-open]').length, 4);
    s.host.querySelector('[data-open]').click();
    await new Promise(setImmediate);
    assert.equal(s.host.querySelector('iframe').src, 'https://drive.google.com/file/d/test-video/preview');
    assert.equal(s.host.querySelector('.qa-viewer').hidden, false);
    assert.equal(s.host.querySelector('[data-external]').href, 'https://drive.google.com/file/d/test-video/view');
    s.host.querySelector('[data-close]').click(); assert.equal(s.host.querySelector('iframe').hasAttribute('src'), false);
    filter.value = 'PPTX'; filter.onchange({ target: filter }); assert.equal(s.host.querySelectorAll('[data-open]').length, 4);
    s.host.querySelector('[data-open]').click(); await new Promise(setImmediate);
    assert.equal(s.downloads[0][0], '/api/seller/resources/academy/marca-filosofia/download');
    const search = s.host.querySelector('[data-search]'); search.value = 'diagnóstico'; search.oninput({ target: search });
    assert.equal(s.host.querySelectorAll('[data-open]').length, 1);
    search.value = 'no existe'; search.oninput({ target: search }); assert.match(s.host.textContent, /No encontramos materiales/);
  } finally { s.w.close(); }
});
test('Academy rejects foreign embed URLs, escapes titles, and ignores stale responses', async () => {
  const s = setup();
  try {
    s.resources[0].embed_url = 'https://example.com/preview'; s.resources[0].title = '<img src=x onerror=alert(1)>';
    await s.w.QoriAcademy.render(s.host, s.ctx); s.host.querySelector('[data-open]').click(); await new Promise(setImmediate);
    assert.match(s.host.textContent, /Enlace de video no válido/); assert.equal(s.host.querySelector('img'), null);
    let resolve; const pending = s.w.QoriAcademy.render(s.host, { ...s.ctx, request: () => new Promise(r => resolve = r), isCurrent: () => false });
    s.host.innerHTML = 'Sesión cerrada'; resolve({ resources: s.resources }); await pending; assert.equal(s.host.textContent, 'Sesión cerrada');
  } finally { s.w.close(); }
});
test('Academy reports request failures and supports retry', async () => {
  const s = setup();
  try { await s.w.QoriAcademy.render(s.host, { ...s.ctx, request: async () => { throw Error('Sesión vencida'); } }); assert.match(s.host.textContent, /Sesión vencida/); assert.ok(s.host.querySelector('[data-retry]')); }
  finally { s.w.close(); }
});
test('disabled Academy shows the closure message and no materials or player', async () => {
  const s=setup();try{await s.w.QoriAcademy.render(s.host,{...s.ctx,request:async()=>({enabled:false,resources:[]})});assert.match(s.host.textContent,/temporalmente deshabilitada/);assert.equal(s.host.querySelector('[data-open],iframe'),null);}finally{s.w.close();}
});
test('opening an old video card rechecks access and handles newly disabled Academy', async () => {
  const s=setup();try{await s.w.QoriAcademy.render(s.host,{...s.ctx,request:async p=>{if(p.endsWith('/academy'))return {enabled:true,resources:s.resources};throw Error('Qori Academy está temporalmente deshabilitada.');}});s.host.querySelector('[data-open]').click();await new Promise(setImmediate);assert.match(s.host.querySelector('[data-status]').textContent,/deshabilitada/);assert.equal(s.host.querySelector('iframe').hasAttribute('src'),false);}finally{s.w.close();}
});

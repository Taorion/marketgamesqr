(() => {
  'use strict';
  let root, api, marker, selected = '', detail = null, generation = 0, searching = 0, busy = false, kind = 'giftcard';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => '$' + Number(v || 0).toLocaleString('es-CO') + ' COP';
  const safeUrl = v => { try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  function clear() { ++generation; ++searching; marker=null; selected=''; detail=null; busy=false; if(root){root.replaceChildren();root.hidden=true;} }
  async function load(options) {
    if(marker===options.user.id && root?.children.length)return;
    clear(); api=options.api; marker=options.user.id; root=document.getElementById('recargas'); root.hidden=false;
    root.innerHTML='<div class="panel-head"><div><p class="eyebrow">Saldo operativo</p><h2>Recargas</h2><p>Compra emisiones de Gift Cards o tickets para el negocio que elijas.</p></div></div><form data-search-form class="recharge-search"><label>Buscar negocio<input data-search maxlength="160" placeholder="Nombre del negocio"></label><button class="secondary-button" type="submit">Buscar</button></form><label class="recharge-business">Negocio que recibirá la recarga<select data-business><option value="">Selecciona un negocio</option></select></label><p data-search-status role="status"></p><div data-detail></div>';
    root.querySelector('[data-search-form]').onsubmit=e=>{e.preventDefault();search();};
    root.querySelector('[data-business]').onchange=e=>select(e.target.value);
    const owner=marker;
    await search();
    if(owner!==marker)return;
    const id=new URLSearchParams(location.search).get('recharge_business');
    if(id && /^[0-9a-f-]{36}$/i.test(id))await select(id);
  }
  async function search() {
    const n=++searching, owner=marker;
    const status=root.querySelector('[data-search-status]');status.textContent='Buscando negocios…';
    try {
      const result=await api('/api/admin/recharges/businesses?search='+encodeURIComponent(root.querySelector('[data-search]').value.trim()));
      if(n!==searching||owner!==marker)return;
      const list=root.querySelector('[data-business]');
      list.innerHTML='<option value="">Selecciona un negocio</option>'+result.businesses.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.name)+' · '+esc(b.plan_code)+'</option>').join('');
      if(selected&&!result.businesses.some(b=>b.id===selected))list.add(new Option(detail?.business.name||'Negocio seleccionado',selected));
      list.value=selected;status.textContent=result.businesses.length?'Se muestran hasta 50 negocios. Usa el buscador para afinar la lista.':'No se encontraron negocios.';
    } catch(e){if(n===searching&&owner===marker)status.textContent=e.message;}
  }
  async function select(id) {
    const n=++generation, owner=marker; selected=id;detail=null;busy=false;
    const target=root.querySelector('[data-detail]');target.innerHTML=id?'<p>Cargando saldo y paquetes…</p>':'';
    if(!id)return;
    try{
      const data=await api('/api/admin/recharges/businesses/'+encodeURIComponent(id));
      if(n!==generation||owner!==marker)return;
      detail=data;
      const list=root.querySelector('[data-business]');
      if(!Array.from(list.options).some(o=>o.value===id))list.add(new Option(data.business.name,id));
      list.value=id;render();
    }catch(e){if(n===generation&&owner===marker)target.textContent=e.message;}
  }
  function render() {
    if(!detail)return;
    const target=root.querySelector('[data-detail]'),packs=detail[kind+'_packages'];
    target.innerHTML='<h3>'+esc(detail.business.name)+'</h3><p>'+esc(detail.business.plan_name)+'</p><div class="recharge-balances"><strong>'+Number(detail.giftcard_balance)+' emisiones de Gift Cards</strong><strong>'+Number(detail.ticket_balance)+' tickets</strong></div><p>El saldo de emisiones es independiente de los tickets y del valor que el negocio asigna a cada regalo.</p><div class="recharge-tabs" role="group" aria-label="Tipo de recarga"><button type="button" data-kind="giftcard" aria-pressed="'+(kind==='giftcard')+'">Gift Cards</button><button type="button" data-kind="ticket" aria-pressed="'+(kind==='ticket')+'">Tickets</button></div><p>'+esc(kind==='giftcard'?'Cada emisión cuesta $2.500 COP.': 'Elige el paquete de tickets que necesita el negocio.')+'</p><div class="recharge-packages">'+packs.map(p=>'<article><h4>'+Number(p.package_size)+' '+(kind==='giftcard'?'Gift Cards':'tickets')+'</h4><strong>'+money(p.price_cop)+'</strong><button class="primary-button" type="button" data-buy="'+esc(p.code)+'">Comprar y recargar</button></article>').join('')+'</div><p>'+esc(detail[kind+'_message']||'')+'</p><p data-payment-status role="status">El saldo se suma después de verificar el pago. Regresar de Mercado Pago no confirma el cobro.</p><div data-payment-link></div><button type="button" class="secondary-button" data-refresh>Actualizar saldo y pagos</button><h3>Historial de compras</h3><div class="recharge-history">'+detail.orders.map(o=>'<article><strong>'+esc(o.package_title)+' · '+money(o.price_cop)+'</strong><p>'+esc(o.status==='APPROVED'&&o.credited_at?'Pago verificado · saldo acreditado':o.status==='REJECTED'?'Pago rechazado':o.status==='CANCELLED'?'Cancelado':'Pendiente de confirmación')+'</p>'+((o.status==='PENDING'&&safeUrl(o.checkout_url))?'<a href="'+esc(safeUrl(o.checkout_url))+'">Continuar pago</a>':'')+'</article>').join('')+(detail.orders.length?'':'<p>Aún no hay compras.</p>')+'</div>';
    target.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{if(!busy){kind=b.dataset.kind;render();}});
    target.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
    target.querySelector('[data-refresh]').onclick=()=>select(selected);
  }
  async function buy(code) {
    if(busy||!detail)return;
    busy=true;const n=generation,owner=marker,id=selected,target=root.querySelector('[data-detail]');
    target.querySelectorAll('button').forEach(b=>b.disabled=true);
    const status=target.querySelector('[data-payment-status]');status.textContent='Preparando el pago para '+detail.business.name+'…';
    target.querySelector('[data-payment-link]').replaceChildren();
    const keyName='qori-admin-recharge:'+owner+':'+id+':'+code;let key;
    try{key=sessionStorage.getItem(keyName);}catch{}
    key||=crypto.randomUUID();try{sessionStorage.setItem(keyName,key);}catch{}
    try {
      const {order}=await api('/api/admin/recharges/businesses/'+id+'/checkout',{method:'POST',body:JSON.stringify({package_code:code,idempotency_key:key})});
      if(n!==generation||owner!==marker)return;
      if(order.credited_at||['REJECTED','CANCELLED','EXPIRED'].includes(order.status)){try{sessionStorage.removeItem(keyName);}catch{}status.textContent='La orden anterior ya terminó. Actualiza el saldo o inicia una nueva compra.';return;}
      const url=safeUrl(order.checkout_url);if(!url)throw Error('El enlace de pago todavía no está disponible. Reintenta en unos instantes.');
      status.textContent='Pago pendiente para '+detail.business.name+'. El saldo aún no ha sido recargado.';
      target.querySelector('[data-payment-link]').innerHTML='<a class="primary-button link-button" href="'+esc(url)+'">Ir al pago · '+money(order.price_cop)+'</a>';
    } catch(e){if(n===generation&&owner===marker)status.textContent=e.message;}
    finally{if(n===generation&&owner===marker){busy=false;target.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  }
  window.QoriRecharges={load,clear};
})();

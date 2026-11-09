(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(v));
 const state=s=>({PENDING_PAYMENT:'Pendiente de pago',READY:'Disponible',CANCELLED:'Cancelada'}[s]||s);
 function render(host,ctx){
  const scope=crypto.randomUUID();host.dataset.courtesyScope=scope;
  const current=()=>host.isConnected&&host.dataset.courtesyScope===scope&&(!ctx.current||ctx.current());
  host.innerHTML='<section class="qco"><header><p class="eyebrow">'+(ctx.business?'Ofrece · Cortesías':'Mis cortesías')+'</p><h1>Compra hoy. Regala cuando quieras.</h1><p>Reserva productos sin destinatario y entrega cada ticket cuando decidas. Quien lo recibe entra a su Customer gratis y acepta el beneficio.</p></header><nav aria-label="Cortesías"><button data-tab="mine">Mis cortesías</button><button data-tab="buy">Comprar a un negocio</button>'+(ctx.business?'<button data-tab="own">Productos de mi negocio</button><button data-tab="incoming">Pedidos recibidos</button>':'')+'</nav><p data-status role="status" aria-live="polite"></p><div data-body></div></section>';
  const body=host.querySelector('[data-body]'),status=host.querySelector('[data-status]');
  let version=0;
  const message=(s,error=false)=>{if(current()){status.textContent=s;status.className=error?'qco-error':'';}};
  const call=async(p,b)=>{if(!current())throw Error('La sesión cambió. Abre de nuevo Cortesías.');const r=await ctx.request(p,b);if(!current())throw Error('La sesión cambió. Abre de nuevo Cortesías.');return r;};
  const link=(url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+label+'</a>';
  function bindForm(form,submit){
   let busy=false;form.onsubmit=async e=>{e.preventDefault();e.stopPropagation();if(busy||!form.reportValidity())return;busy=true;const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);message('');
    try{await submit(new FormData(form));}catch(e){message(e.message,true);}finally{busy=false;buttons.forEach(b=>b.disabled=false);}
   };
  }
  async function load(tab='mine'){
   const v=++version;message('Cargando…');body.innerHTML='';host.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
   try{
    if(tab==='mine'){
     const {lots}=await call('');if(v!==version)return;
     body.innerHTML='<h2>Cortesías reservadas</h2><p>La reserva se activa cuando el negocio confirma el pago. La vigencia empieza al entregar cada ticket.</p><div class="qco-grid">'+lots.map(l=>'<article><span class="qco-badge">'+esc(state(l.state))+'</span><h3>'+esc(l.snapshot.product_name)+'</h3><p>'+esc(l.merchant_name)+'</p><strong>'+l.available+' por entregar · '+l.assigned+' entregadas</strong><p>'+l.quantity+' unidades · '+(l.source==='OWN'?'Financiadas por tu negocio':money(l.total))+'</p><button data-detail="'+l.id+'">Ver reserva'+(l.available?' y entregar':'')+'</button></article>').join('')+'</div>';
     if(!lots.length)body.insertAdjacentHTML('beforeend','<p>Aún no tienes cortesías. Compra productos a un negocio Qori'+(ctx.business?' o prepara los de tu empresa':'')+' para regalarlos después.</p>');
     body.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
    }else if(tab==='buy'||tab==='own'){
     const {offers,own_products}=await call('/catalog');if(v!==version)return;showCatalog(tab,offers,own_products);
    }else{
     const {orders,branches}=await call('/incoming');if(v!==version)return;
     body.innerHTML='<h2>Pedidos de cortesías de tus compradores</h2><p>Antes de confirmar, verifica el pago completo. La confirmación reserva productos y consume un ticket operativo por unidad.</p>'+orders.map(l=>'<article><h3>'+esc(l.snapshot.buyer_name)+' · '+esc(l.snapshot.product_name)+'</h3><p>'+l.quantity+' unidades · '+money(l.total)+' · '+esc(state(l.state))+'</p><small>Referencia de solicitud: '+esc(l.id)+'</small>'+(l.state==='PENDING_PAYMENT'?'<form data-confirm="'+l.id+'"><label>Sede<select name="branch_id" required>'+branches.map(b=>'<option value="'+b.id+'">'+esc(b.name)+'</option>').join('')+'</select></label><label>Medio de pago<input name="payment_method" required minlength="2" maxlength="80" placeholder="Efectivo, transferencia…"></label><label>Referencia del pago<input name="payment_reference" required minlength="3" maxlength="120"></label><label class="qco-check"><input type="checkbox" name="received" required> Verifiqué que recibimos '+money(l.total)+' completos.</label><button>Confirmar pago y reservar '+l.quantity+' cortesías</button></form>':'')+'</article>').join('');
     if(!orders.length)body.insertAdjacentHTML('beforeend','<p>No hay pedidos recibidos.</p>');
     body.querySelectorAll('[data-confirm]').forEach(f=>bindForm(f,async d=>{const l=orders.find(o=>o.id===f.dataset.confirm);await call('/'+l.id+'/confirm',{amount:l.total,payment_received:true,payment_reference:d.get('payment_reference'),payment_method:d.get('payment_method'),branch_id:d.get('branch_id')});await load('incoming');message('Pago confirmado. El comprador ya puede repartir sus cortesías.');}));
    }
    message('');
   }catch(e){message(e.message,true);body.innerHTML='<button data-retry>Reintentar</button>';body.querySelector('[data-retry]').onclick=()=>load(tab);}
  }
  function showCatalog(tab,offers,products){
   if(tab==='buy'){
    body.innerHTML='<h2>Compra productos para regalar después</h2><form data-search class="qco-search"><label>Buscar negocio o producto<input name="search" maxlength="100" placeholder="Café, postre, restaurante…"></label><button>Buscar</button></form><div data-offers class="qco-grid"></div>';
    const draw=rows=>{const target=body.querySelector('[data-offers]');if(!target)return;target.innerHTML=rows.map(p=>'<article><h3>'+esc(p.product_name)+'</h3><p>'+esc(p.merchant_name)+'</p><strong>'+money(p.price)+' por unidad</strong><p>'+esc(p.terms)+'</p><p>'+p.valid_days+' días para canjear después de entregar.</p><button data-offer="'+p.id+'">Elegir cantidad</button></article>').join('')||'<p>No hay ofertas publicadas para esta búsqueda.</p>';target.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>purchase(rows.find(p=>p.id===b.dataset.offer)));};
    draw(offers);bindForm(body.querySelector('[data-search]'),async d=>{const data=await call('/catalog?search='+encodeURIComponent(d.get('search')));draw(data.offers);});
   }else{
    const id=crypto.randomUUID();body.innerHTML='<h2>Cortesías con mis productos</h2><p>Reserva unidades de tu inventario para agradecer una compra o dar un detalle. No se cobra al beneficiario. Se descuenta un ticket operativo por unidad al reservar.</p><form data-own><label>Producto<select name="product_id" required><option value="">Elige un producto</option>'+products.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · '+Number(p.stock_quantity)+' disponibles</option>').join('')+'</select></label><label>Cantidad<input name="quantity" type="number" min="1" max="500" step="1" value="1" required></label><label>Días de vigencia desde la entrega<input name="valid_days" type="number" min="1" max="365" value="30" required></label><label>Condiciones<textarea name="terms" minlength="10" maxlength="4000" required>Un producto de cortesía, sin compra ni pago adicional. Canje único en el negocio.</textarea></label><label class="qco-check"><input type="checkbox" required> Confirmo la reserva de productos y el uso de mis tickets.</label><button>Preparar cortesías sin destinatario</button></form>';
    bindForm(body.querySelector('[data-own]'),async d=>{const r=await call('',{source:'OWN',request_id:id,product_id:d.get('product_id'),quantity:Number(d.get('quantity')),valid_days:Number(d.get('valid_days')),terms:d.get('terms'),confirmed:true});await detail(r.lot.id);message('Tus cortesías están listas. Elige a quién entregar cada una.');});
   }
  }
  function purchase(p){
   const id=crypto.randomUUID();body.innerHTML='<h2>'+esc(p.product_name)+'</h2><p>'+esc(p.merchant_name)+' · '+money(p.price)+' por unidad</p><form data-purchase><label>Cantidad de cortesías<input name="quantity" type="number" min="1" max="'+Math.min(500,Math.floor(Number(p.stock_quantity)))+'" step="1" value="1" required></label><strong data-total>'+money(p.price)+'</strong><p>'+esc(p.terms)+'</p><p>'+esc(p.payment_instructions)+'</p><label class="qco-check"><input type="checkbox" required> Acepto las condiciones. El negocio debe confirmar el pago para activar mi reserva.</label><button>Solicitar compra</button></form>';
   const f=body.querySelector('form');f.elements.quantity.oninput=()=>{body.querySelector('[data-total]').textContent=money(Number(p.price)*Number(f.elements.quantity.value||0));};
   bindForm(f,async d=>{const r=await call('',{source:'PURCHASE',request_id:id,publication_id:p.id,quantity:Number(d.get('quantity')),expected_unit_price:String(p.price),terms_accepted:true});await detail(r.lot.id);message('Solicitud registrada. Paga al negocio y espera su confirmación.');});
  }
  async function detail(id){
   const v=++version;message('Cargando reserva…');
   try{
    const {lot:l,deliveries}=await call('/'+id);if(v!==version)return;
    body.innerHTML='<button data-back>← Mis cortesías</button><h2>'+esc(l.snapshot.product_name)+'</h2><p>'+esc(l.merchant_name)+' · '+esc(state(l.state))+'</p><div class="qco-summary"><strong>'+l.quantity+' reservadas</strong><strong>'+l.available+' por entregar</strong><strong>'+l.assigned+' entregadas</strong></div><article><h3>Comprobante de la reserva</h3><p>'+esc(l.snapshot.buyer_name)+' · '+(l.source==='OWN'?'Cortesía financiada por tu negocio':money(l.total))+'</p><p>Referencia: '+esc(l.id)+'</p><p>'+esc(l.snapshot.terms)+'</p>'+(l.state==='PENDING_PAYMENT'?'<p>'+esc(l.snapshot.payment_instructions)+'</p><p>Esta solicitud todavía no acredita un pago.</p><button data-cancel>Cancelar solicitud pendiente</button>':l.paid_at?'<p>Confirmación: '+esc(new Date(l.paid_at).toLocaleString('es-CO'))+' · '+esc(l.payment_method)+' · '+esc(l.payment_reference)+'</p>':'')+'<small>Comprobante de operación; no sustituye la factura del comercio.</small></article>'+
     (l.available?'<form data-send><h3>Entregar una cortesía</h3><label>Nombre del beneficiario<input name="recipient_name" required minlength="2" maxlength="160" autocomplete="off"></label><label>Correo del beneficiario<input name="recipient_email" type="email" required maxlength="180" autocomplete="off"></label><label>Mensaje (opcional)<textarea name="message" maxlength="500" placeholder="Gracias por tu compra. Pensé en ti."></textarea></label><p>Recibirá una invitación para entrar o crear su Qori Customer gratis. La vigencia de '+l.snapshot.valid_days+' días empieza al entregarla. Una vez asignada, esta unidad no se puede entregar a otra persona.</p><label class="qco-check"><input type="checkbox" required> Revisé el destinatario y quiero entregarle una cortesía.</label><button>Entregar 1 cortesía</button></form>':'')+
     '<h3>Entregas realizadas</h3>'+deliveries.map(d=>'<article><strong>'+esc(d.recipient_name)+'</strong><p>'+esc(d.invitation_state==='ACCEPTED'?'Aceptada en Customer':d.invitation_state==='REJECTED'?'Rechazada':'Pendiente de aceptación')+' · '+esc(d.ticket_status||'')+'</p><p>'+esc(d.message)+'</p><div class="qco-links">'+link(d.share_url,'Enlace para compartir')+(d.receipt_url?link(d.receipt_url,'Comprobante de entrega'):'')+'</div></article>').join('');
    body.querySelector('[data-back]').onclick=()=>load('mine');const cancel=body.querySelector('[data-cancel]');if(cancel)cancel.onclick=async()=>{cancel.disabled=true;try{await call('/'+id+'/cancel',{});await detail(id);}catch(e){message(e.message,true);cancel.disabled=false;}};
    const f=body.querySelector('[data-send]');if(f){const requestId=crypto.randomUUID();bindForm(f,async d=>{await call('/'+id+'/send',{request_id:requestId,recipient_name:d.get('recipient_name'),recipient_email:d.get('recipient_email'),message:d.get('message'),confirmed:true});await detail(id);message('Cortesía entregada. Puedes compartir el enlace de la entrega con tu contacto.');});}
    message('');
   }catch(e){message(e.message,true);}
  }
  host.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>load(b.dataset.tab));load();
 }
 window.QoriCourtesies={render};
})();

(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(v,c='COP')=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:c==='COP'?0:2}).format(Number(v));
 function sections(cards,cardMarkup,pending=[]){
  return window.QoriWallet.sections(cards).map(s=>{
   const waiting=pending.filter(i=>(i.purchased_product?'USER_GIFT':i.kind==='AFFILIATION'?'POINTS':i.kind==='ACTIVITY'?'TICKET':i.kind)==s.kind);
   return '<details class="benefit-section" '+(s.cards.length||waiting.length?'open':'')+'><summary>'+esc(s.title)+' <span class="pill">'+(s.cards.length+waiting.length)+'</span></summary>'+
    (s.cards.length?'<div class="card-grid">'+s.cards.map(cardMarkup).join('')+'</div>':'')+
    waiting.map(i=>'<div class="benefit-pending"><strong>'+esc(i.title)+'</strong><span>Pendiente de aceptar</span><a class="secondary" href="#invitations">Revisar invitación</a></div>').join('')+
    (!s.cards.length&&!waiting.length?'<p class="small muted">Aún no tienes beneficios de este tipo en este negocio.</p>':'')+'</details>';
  }).join('');
 }
 function settings(ctx,c){
  if(!c?.verified_identity){
   const d=ctx.dialog('Recepción de compras · '+(c?.name||'Negocio'),'<p>Para registrar compras automáticamente desde caja, primero confirma la conexión de identidad con el negocio. Recibir una tarjeta o un regalo no autoriza tus compras.</p>'+(c?'<form class="stack"><label class="check"><input type="checkbox" name="auto_receive" '+(c.auto_receive?'checked':'')+'><span>Aceptar automáticamente las compras que este negocio envíe expresamente a mi cuenta.</span></label><button class="primary">Guardar preferencia</button></form>':''));
   if(c)d.querySelector('form').onsubmit=async e=>{e.preventDefault();e.stopPropagation();e.submitter.disabled=true;try{await ctx.request('/finance-connections/'+c.business_id,{auto_receive:new FormData(e.target).has('auto_receive')},'PUT');d.close();await ctx.refresh();}catch(error){ctx.showError(error.message,d.querySelector('#dialogError'));e.submitter.disabled=false;}};
   return;
  }
  const d=ctx.dialog('Compras automáticas · '+c.name,'<form class="stack"><p>Cuando este negocio registre una venta pagada a tu identidad verificada, Qori la incluirá en tus finanzas con sus productos. No tendrás que registrarla otra vez.</p><label class="check"><input name="enabled" type="checkbox" '+(c.auto_capture?'checked':'')+'><span>Autorizo registrar automáticamente mis compras en este negocio.</span></label><label class="field">Bolsillo para las próximas compras<select name="book_id">'+ctx.books.map(b=>'<option value="'+esc(b.id)+'" '+(b.id===(c.book_id||ctx.book?.id)?'selected':'')+'>'+esc(b.name)+' · '+esc(b.currency)+'</option>').join('')+'</select></label><p class="small muted">El cambio de bolsillo se aplica a las próximas compras. Desactivar conserva las ya registradas. El negocio no puede ver tus saldos ni tus gastos personales.</p><button type="submit" class="primary">Guardar autorización</button></form>');
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();e.stopPropagation();const b=e.submitter;b.disabled=true;try{const f=new FormData(e.target);await ctx.request('/finance-connections/'+c.business_id+'/capture',{enabled:f.has('enabled'),book_id:f.get('book_id'),confirmed:true},'PUT');d.close();await ctx.refresh();}catch(error){ctx.showError(error.message,d.querySelector('#dialogError'));b.disabled=false;}};
 }
 async function receipt(ctx,id){
  const d=ctx.dialog('Comprobante de compra','<p role="status">Consultando el pago registrado por el negocio…</p>');
  try{
   const {receipt:r}=await ctx.request('/purchase-receipts/'+encodeURIComponent(id));if(!d.isConnected)return;
   d.querySelector('.dialog-body').innerHTML='<p class="eyebrow">Pago registrado por Qori Empresa</p><h3>'+esc(r.business_name)+'</h3><p class="pill">'+esc({PAID:'Pagado',VOIDED:'Anulado',PENDING:'Pendiente de pago'}[r.status]||r.status)+'</p><p>'+esc(new Date(r.paid_at||r.created_at).toLocaleString('es-CO'))+'</p><div class="purchase-receipt-lines">'+r.products.map(p=>'<div><span>'+esc(p.name)+'<small>Cantidad: '+esc(p.quantity)+'</small></span><strong>'+(p.amount_minor==null?'Incluido en total':money(p.amount_minor/100,r.currency))+'</strong></div>').join('')+'</div><p class="receipt-total">Total registrado <strong>'+money(r.amount,r.currency)+'</strong></p>'+(r.payment_method?'<p>Medio de pago: '+esc(({CASH:'Efectivo',CARD:'Tarjeta',TRANSFER:'Transferencia',BANK_TRANSFER:'Transferencia bancaria',OTHER:'Otro'})[r.payment_method]||r.payment_method)+'</p>':'')+(r.payment_reference?'<p>Referencia del pago: '+esc(r.payment_reference)+'</p>':'')+'<p class="small muted receipt-reference">Compra Qori: '+esc(r.id)+'</p><p class="small">'+(r.automatic?'Registrada automáticamente con tu autorización.':'Esta compra ya está en tu historial de finanzas.')+'</p>';
  }catch(error){if(d.isConnected)d.querySelector('.dialog-body').textContent=error.message;}
 }
 async function render(page,ctx,cardMarkup){
  page.innerHTML='<h1>Mis negocios</h1><p role="status">Organizando tus beneficios y compras…</p>';
  try{
   const [wallet,links,finance,gifts]=await Promise.all([ctx.request('/wallet/overview'),ctx.request('/relationships'),ctx.request('/finance-connections'),ctx.request('/product-gifts')]);if(!page.isConnected)return;
   const businesses=new Map(),add=(id,name)=>{if(id&&!businesses.has(id))businesses.set(id,{id,name});};
   for(const x of wallet.cards)add(x.business_id,x.business_name);
   for(const x of wallet.pending_benefits||[])add(x.business_id,x.business_name);
   for(const x of links.relationships.filter(r=>['ACCEPTED','PENDING'].includes(r.state)))add(x.business_id,x.name);
   for(const x of finance.connections)add(x.business_id,x.name);
   for(const x of gifts.orders)add(x.business_id,x.business_name);
   page.innerHTML='<div class="page-heading"><div><p class="eyebrow">Tu relación con cada negocio</p><h1>Mis negocios</h1><p>Beneficios separados por tipo. Regalos recibidos y compras, cada uno en su lugar.</p></div><a class="secondary" href="#explore">Descubrir negocios</a></div><div class="toolbar"><input id="businessWalletSearch" type="search" class="search" placeholder="Buscar entre mis negocios…" aria-label="Buscar entre mis negocios"></div><div id="businessWalletList"></div>';
   const draw=()=>{
    const term=page.querySelector('#businessWalletSearch').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const rows=[...businesses.values()].filter(b=>b.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
    page.querySelector('#businessWalletList').innerHTML=rows.map(b=>{
     const cards=wallet.cards.filter(c=>c.business_id===b.id),pending=(wallet.pending_benefits||[]).filter(i=>i.business_id===b.id),c=finance.connections.find(c=>c.business_id===b.id),orders=gifts.orders.filter(o=>o.business_id===b.id);
     const connections=links.relationships.filter(r=>r.business_id===b.id);
     return '<details class="business-vault" '+(rows.length===1?'open':'')+'><summary><span class="business-mark">'+esc(b.name.slice(0,1))+'</span><span><strong>'+esc(b.name)+'</strong><small>'+cards.length+' beneficios · '+pending.length+' por aceptar</small></span></summary><div class="business-vault-body">'+sections(cards,cardMarkup,pending)+
      '<section class="business-purchases"><h3>Mis compras en '+esc(b.name)+'</h3><p>'+(c?.verified_identity?(c.auto_capture?'Compras automáticas autorizadas.':'Compras automáticas desactivadas.'):'Primero confirma la conexión de identidad para autorizar compras automáticas.')+'</p>'+(c?.verified_identity?'<button class="secondary" data-capture="'+b.id+'">Configurar compras automáticas</button>':'<a href="#me">Mostrar mi QR al negocio</a>')+
      '<a class="quiet" href="#history">Ver mis movimientos</a>'+pending.filter(i=>i.kind==='SALE').map(i=>'<div class="benefit-pending"><strong>'+esc(i.title)+'</strong><a href="#invitations">Revisar compra pendiente</a></div>').join('')+orders.map(o=>'<div class="gift-purchase-row"><span><strong>'+esc(o.product_name)+'</strong><small>Regalo que compraste para '+esc(o.recipient_name)+' · '+money(o.amount)+'</small></span>'+(o.sale_id?'<button class="secondary" data-purchase-receipt="'+esc(o.sale_id)+'">Ver comprobante</button>':'<a href="#product-gifts">Ver pedido pendiente</a>')+'</div>').join('')+'</section>'+
      connections.filter(r=>r.state==='PENDING'&&new Date(r.expires_at)>new Date()).map(r=>'<div class="benefit-pending"><p>Este negocio solicita verificar tu conexión.</p><button class="primary" data-action="review-relationship" data-id="'+esc(r.id)+'">Revisar conexión</button></div>').join('')+
      connections.filter(r=>r.state==='ACCEPTED').map(r=>'<button class="quiet" data-action="revoke-relationship" data-id="'+esc(r.id)+'">Desconectar negocio</button>').join('')+'</div></details>';
    }).join('')||'<section class="empty"><h2>No hay negocios en esta vista.</h2><p>Busca beneficios o conecta las tarjetas que ya tienes.</p><a href="#recover-benefits">Recuperar mis beneficios</a></section>';
    page.querySelectorAll('[data-capture]').forEach(b=>b.onclick=()=>settings(ctx,finance.connections.find(c=>c.business_id===b.dataset.capture)));
    page.querySelectorAll('[data-purchase-receipt]').forEach(b=>b.onclick=()=>receipt(ctx,b.dataset.purchaseReceipt));
   };page.querySelector('#businessWalletSearch').oninput=draw;draw();
  }catch(error){if(page.isConnected){page.innerHTML='<h1>Mis negocios</h1><p role="alert">'+esc(error.message)+'</p><button class="primary">Reintentar</button>';page.querySelector('button').onclick=()=>render(page,ctx,cardMarkup);}}
 }
 window.QoriBusinessWallet={sections,settings,receipt,render};
})();

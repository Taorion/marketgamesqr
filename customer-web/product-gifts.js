/* A purchase request never charges money or exposes the recipient's private QR. */
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v));
 function status(o){
  if(o.state==='CANCELLED')return 'Solicitud cancelada';
  if(o.state==='PENDING_PAYMENT')return 'Pendiente de pago al negocio';
  if(o.sale_status!=='PAID')return 'Pago anulado: consulta con el negocio';
  if(o.ticket_status==='REDEEMED')return 'Regalo disfrutado';
  if(o.invitation_state==='REJECTED')return 'El destinatario rechazó el regalo';
  if(o.ticket_status!=='ACTIVE'||new Date(o.expires_at)<=new Date())return 'Ticket no disponible';
  return o.invitation_state==='ACCEPTED'?'Listo para canjear':'Entregado · pendiente de aceptar';
 }
 function receipt(o){
  return '<article class="panel gift-receipt"><span class="eyebrow">'+esc(o.business_name)+'</span><h2>'+esc(o.product_name)+'</h2><p class="pill">'+status(o)+'</p><p>Para <strong>'+esc(o.recipient_name)+'</strong> · '+money(o.amount)+'</p>'+(o.message?'<blockquote>'+esc(o.message)+'</blockquote>':'')+'<p class="small">Referencia del pedido<br><strong class="gift-reference">'+esc(o.id)+'</strong></p>'+(o.state==='PENDING_PAYMENT'?'<h3>Cómo pagar</h3><p class="gift-lines">'+esc(o.payment_instructions)+'</p><p>Paga directamente a <strong>'+esc(o.business_name)+'</strong> e indica esta referencia. El regalo llegará cuando el negocio confirme el pago. Crear este pedido no realiza ningún cobro.</p>':'')+(o.sale_id?'<button class="primary" data-gift-receipt="'+esc(o.sale_id)+'">Ver comprobante de compra</button>':'')+'<details><summary>Condiciones del regalo</summary><p class="gift-lines">'+esc(o.terms)+'</p>'+(o.expires_at?'<p>Vence '+new Date(o.expires_at).toLocaleDateString('es-CO')+'.</p>':'')+'</details>'+(o.state==='PENDING_PAYMENT'?'<button class="quiet" data-cancel-gift="'+o.id+'">Cancelar solicitud pendiente</button>':'')+'</article>';
 }
 function buy(p,ctx){
  const requestId=crypto.randomUUID();
  const d=ctx.dialog('Regala '+p.benefit,'<form class="stack" id="productGiftForm"><span class="eyebrow">'+esc(p.business_name)+'</span><h3>'+esc(p.title)+' · '+money(p.product_price)+'</h3><label class="field">Correo o identificación Qori de quien recibe<input name="recipient" required minlength="3" maxlength="180" autocomplete="off" placeholder="persona@correo.com"></label><p class="small">Debe tener una cuenta Qori Customer. Recibirá una invitación que podrá aceptar o rechazar.</p><label class="field">Tu mensaje (opcional)<textarea name="message" maxlength="500" placeholder="Un café para alegrarte el día."></textarea></label><p class="gift-lines">'+esc(p.terms)+'</p><p>Válido durante '+Number(p.product_valid_days)+' días desde la confirmación del pago.</p><h3>Pago directo al negocio</h3><p class="gift-lines">'+esc(p.payment_instructions)+'</p><p>Qori no cobra al crear el pedido. El negocio confirma que recibió el pago antes de entregar el ticket.</p><label class="check"><input type="checkbox" required><span>Acepto el precio y las condiciones de este regalo.</span></label><button class="primary">Crear pedido de regalo · '+money(p.product_price)+'</button></form>');
  d.querySelector('form').onsubmit=async e=>{
   e.preventDefault();e.stopPropagation();const b=e.submitter||e.target.querySelector('button');b.disabled=true;
   try{const values=Object.fromEntries(new FormData(e.target));await ctx.request('/product-gifts',{...values,publication_id:p.id,request_id:requestId,terms_accepted:true});d.close();location.hash='product-gifts';}
   catch(error){ctx.showError(error.message,d.querySelector('#dialogError'));}
   finally{b.disabled=false;}
  };
 }
 function receivedCard(o){return '<article class="panel gift-receipt"><span class="eyebrow">'+esc(o.business_name)+'</span><h2>'+esc(o.product_name)+'</h2><p><strong>'+esc(o.buyer_name)+'</strong> te envió este detalle.</p>'+(o.message?'<blockquote>'+esc(o.message)+'</blockquote>':'')+'<p class="pill">'+status(o)+'</p><p class="gift-no-charge">'+(o.sale_status==='PAID'?'Este regalo ya fue pagado. No debes pagar de nuevo para recibirlo.':'El negocio debe revisar el estado del pago. El ticket no está disponible.')+'</p><details><summary>Condiciones de canje</summary><p class="gift-lines">'+esc(o.terms)+'</p><p>Vence '+new Date(o.expires_at).toLocaleDateString('es-CO')+'.</p></details><div class="gift-received-actions">'+(o.invitation_state==='PENDING'&&o.sale_status==='PAID'&&o.ticket_status==='ACTIVE'&&new Date(o.expires_at)>new Date()?'<button class="primary" data-review-gift="'+esc(o.id)+'">Aceptar o rechazar regalo</button>':o.invitation_state==='ACCEPTED'&&o.ticket_id?'<button class="primary" data-open-gift="'+esc(o.ticket_id)+'">Ver mi ticket</button>':'')+'</div></article>';}
 let renderVersion=0;
 async function render(page,ctx,selected){
  const turn=++renderVersion;page.innerHTML='<p role="status">Buscando tus regalos…</p>';
  try{
   const data=await ctx.request('/product-gifts');if(!page.isConnected||turn!==renderVersion)return;
   const received=data.received||[],pending=received.filter(o=>o.invitation_state==='PENDING'&&o.ticket_status==='ACTIVE'&&o.sale_status==='PAID'&&new Date(o.expires_at)>new Date()).length,tab=selected||(pending?'received':'sent');
   page.innerHTML='<div class="page-heading"><div><span class="eyebrow">Un detalle que llega a su Qori</span><h1>Mis regalos</h1><p>Los que envías y los que alguien eligió para ti.</p></div><button class="secondary" id="refreshGifts">Actualizar</button></div><div class="row"><a class="primary" href="#gift-shop">Elegir un regalo →</a><a class="secondary" href="#invitations">Todas mis invitaciones</a></div><div class="gift-tabs" aria-label="Regalos enviados o recibidos"><button class="secondary" data-gift-tab="sent" aria-pressed="'+(tab==='sent')+'">Enviados · '+data.orders.length+'</button><button class="secondary" data-gift-tab="received" aria-pressed="'+(tab==='received')+'">Recibidos · '+received.length+(pending?' · '+pending+' por aceptar':'')+'</button></div><p class="small muted">Hasta 100 regalos recientes por vista. Actualiza para comprobar pagos y entregas.</p><div class="gift-orders">'+(tab==='received'?(received.map(receivedCard).join('')||'<section class="empty"><h2>Aquí llegan los detalles para ti.</h2><p>Comparte tu correo o tu identificación Qori. Cuando el negocio confirme el pago, podrás aceptar tu regalo aquí.</p><a class="secondary" href="#me">Ver mi identificación Qori</a></section>'):(data.orders.map(receipt).join('')||'<section class="empty"><h2>Un café puede alegrar el día.</h2><p>Encuentra un producto para regalar y envíalo a otra cuenta Customer.</p></section>'))+'</div>';
   page.querySelector('#refreshGifts').onclick=()=>render(page,ctx,tab);
   page.querySelectorAll('[data-gift-tab]').forEach(b=>b.onclick=()=>render(page,ctx,b.dataset.giftTab));
   page.querySelectorAll('[data-gift-receipt]').forEach(b=>b.onclick=()=>window.QoriBusinessWallet.receipt(ctx,b.dataset.giftReceipt));
   page.querySelectorAll('[data-open-gift]').forEach(b=>b.onclick=()=>ctx.openCard('TICKET',b.dataset.openGift));
   page.querySelectorAll('[data-review-gift]').forEach(b=>b.onclick=()=>{
    const o=received.find(x=>x.id===b.dataset.reviewGift),d=ctx.dialog('Un regalo de '+o.buyer_name,'<h3>'+esc(o.product_name)+'</h3><p>'+esc(o.message)+'</p><p class="gift-lines">'+esc(o.terms)+'</p><p>Ya está pagado. Presenta el ticket en '+esc(o.business_name)+' después de aceptarlo.</p><form class="stack" id="giftAccept"><label class="check"><input name="terms" type="checkbox" required><span>Acepto este regalo y sus condiciones de canje.</span></label><button class="primary">Aceptar y recibir mi ticket</button><button class="secondary" type="button" id="giftReject">Rechazar regalo</button></form>');
    const decide=async(action)=>{const buttons=[...d.querySelectorAll('button')];buttons.forEach(x=>x.disabled=true);try{await ctx.request('/invitations/'+o.invitation_id+'/decision',{action,...(action==='ACCEPT'?{terms_accepted:d.querySelector('[name=terms]').checked}:{})});d.close();await ctx.refresh({render:false});await render(page,ctx,'received');}catch(e){ctx.showError(e.message,d.querySelector('#dialogError'));buttons.forEach(x=>x.disabled=false);}};
    d.querySelector('form').onsubmit=e=>{e.preventDefault();e.stopPropagation();decide('ACCEPT');};d.querySelector('#giftReject').onclick=()=>decide('REJECT');
   });
   page.querySelectorAll('[data-cancel-gift]').forEach(b=>b.onclick=()=>{
    const d=ctx.dialog('Cancelar solicitud','<p>Cancela solo si todavía no has pagado. Si ya entregaste el dinero, consulta primero al negocio.</p><button class="primary" id="confirmCancelGift">No he pagado: cancelar solicitud</button>');
    d.querySelector('#confirmCancelGift').onclick=async e=>{e.target.disabled=true;try{await ctx.request('/product-gifts/'+b.dataset.cancelGift+'/cancel',{});d.close();await render(page,ctx);}catch(error){ctx.showError(error.message,d.querySelector('#dialogError'));e.target.disabled=false;}};
   });
  }catch(e){if(page.isConnected&&turn===renderVersion){page.innerHTML='<section class="panel"><h1>Mis regalos</h1><p role="alert">'+esc(e.message)+'</p><button class="primary" id="retryGifts">Reintentar</button></section>';page.querySelector('button').onclick=()=>render(page,ctx,selected);}}
 }
 window.QoriProductGifts={buy,render};
})();

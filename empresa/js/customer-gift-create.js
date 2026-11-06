/* Direct, paid product gifts: exact Customer identities, then merchant payment confirmation. */
(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(v));
 function open(initial=''){
  if(document.getElementById('businessGiftCreate'))return;
  const owner=JSON.stringify(authHeaders()),previous=document.activeElement,d=document.createElement('dialog');
  d.id='businessGiftCreate';d.className='customer-network-dialog business-gift-create';d.setAttribute('aria-labelledby','businessGiftCreateTitle');
  d.innerHTML='<header><div><span class="kicker">Activaciones · Empresa + Customer</span><h2 id="businessGiftCreateTitle">Crear ticket de regalo</h2></div><button type="button" data-close aria-label="Cerrar">×</button></header><div class="customer-network-body"><p>Un producto ya pagado para otra persona. Lo recibe en Customer, acepta la invitación y presenta su ticket para reclamarlo.</p><p id="businessGiftStatus" role="status" aria-live="polite">Cargando productos…</p><div id="businessGiftBody"></div></div>';
  document.body.append(d);d.showModal();d.onclose=()=>{d.remove();previous?.focus?.();};d.querySelector('[data-close]').onclick=()=>d.close();
  const current=()=>d.isConnected&&owner===JSON.stringify(authHeaders());
  const call=(path,body)=>{if(!current())throw Error('Cambiaste de negocio o sesión. Abre de nuevo el módulo.');return api('/api/business/customer'+path,{method:body?'POST':'GET',headers:authHeaders(),noClientCache:true,...(body?{body:JSON.stringify(body)}:{})});};
  const status=text=>{if(current())d.querySelector('#businessGiftStatus').textContent=text;};
  let recipient=null,buyer=null,requestId=crypto.randomUUID(),orderId=null,locked=false,busy=false;
  const versions={recipient:0,buyer:0};
  const findMarkup=role=>'<div class="business-gift-lookup"><label for="gift-'+role+'">Cédula o correo completo</label><div><input id="gift-'+role+'" autocomplete="off" maxlength="180"><button type="button" data-find="'+role+'">Buscar</button></div><p data-found="'+role+'" role="status"></p></div>';
  async function load(){try{
   const catalog=await call('/product-gifts/catalog');if(!current())return;
   const host=d.querySelector('#businessGiftBody');
   if(!catalog.products.length||!catalog.branches.length){host.innerHTML='<section class="business-gift-review"><h3>'+(!catalog.products.length?'Agrega un producto disponible':'Configura una sede activa')+'</h3><p>Necesitas un producto activo en COP con existencias y una sede activa para emitir un regalo pagado.</p></section>';status('Todavía no puedes emitir este regalo.');return;}
   host.innerHTML='<form id="businessGiftForm"><fieldset id="giftEditable"><section><h3>1. Quién recibe el regalo</h3>'+findMarkup('recipient')+'</section><section><h3>2. Qué producto recibe</h3><label>Producto del inventario<select name="product_id" required><option value="">Selecciona un producto</option>'+catalog.products.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · '+money(p.unit_price)+'</option>').join('')+'</select></label><div class="business-gift-columns"><label>Precio pagado (COP)<input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required></label><label>Vigencia desde el pago (días)<input name="valid_days" type="number" min="1" max="365" step="1" value="30" required></label></div><label>Condiciones para reclamar<textarea name="terms" minlength="10" maxlength="4000" required>Un producto. Canje único en el negocio, sin compra ni pago adicional.</textarea></label><label>Mensaje para el beneficiario (opcional)<textarea name="message" maxlength="500" placeholder="Te invito un café…"></textarea></label></section><section><h3>3. Quién compra el regalo</h3><label class="cb-check"><input type="checkbox" name="link_buyer"> El comprador tiene Qori Customer</label><div id="giftGuestBuyer"><label>Nombre del comprador<input name="buyer_name" minlength="2" maxlength="160" required></label><p>La venta queda en Empresa. Para enviar el comprobante a su Customer, busca su cuenta.</p></div><div id="giftBuyerLookup" hidden>'+findMarkup('buyer')+'<label class="cb-check"><input type="checkbox" name="buyer_authorized"> El comprador autoriza recibir esta compra y su comprobante en Customer.</label></div></section><section><h3>4. Pago recibido por el negocio</h3><div class="business-gift-columns"><label>Sede<select name="branch_id" required>'+catalog.branches.map(b=>'<option value="'+b.id+'">'+esc(b.name)+'</option>').join('')+'</select></label><label>Medio de pago<select name="payment_method"><option value="CASH">Efectivo</option><option value="BANK_TRANSFER">Transferencia</option><option value="CARD">Tarjeta</option><option value="OTHER">Otro</option></select></label></div><label>Referencia del pago o comprobante<input name="payment_reference" minlength="3" maxlength="120" required placeholder="Ej. Caja-054 o referencia de transferencia"></label></section></fieldset><div id="giftReview" class="business-gift-review" hidden></div><div class="business-gift-create-actions"><button type="button" id="giftEdit" hidden>Volver a editar</button><button type="submit" id="giftSubmit">Revisar regalo</button></div><p id="giftCreateError" role="alert" tabindex="-1"></p></form>';
   const f=host.querySelector('form'),review=f.querySelector('#giftReview'),edit=f.querySelector('#giftEdit'),submit=f.querySelector('#giftSubmit'),fields=f.querySelector('fieldset');let payload,payment;
   function invalidateReview(){if(locked)return;review.hidden=true;review.textContent='';edit.hidden=true;submit.textContent='Revisar regalo';payload=null;}
   for(const event of ['input','change'])fields.addEventListener(event,invalidateReview);
   f.elements.product_id.onchange=()=>{const p=catalog.products.find(p=>p.id===f.elements.product_id.value);f.elements.amount.value=p?.unit_price||'';};
   f.elements.link_buyer.onchange=()=>{const linked=f.elements.link_buyer.checked;f.querySelector('#giftGuestBuyer').hidden=linked;f.querySelector('#giftBuyerLookup').hidden=!linked;f.elements.buyer_name.required=!linked;f.elements.buyer_authorized.required=linked;};
   for(const role of ['recipient','buyer']){
    const input=f.querySelector('#gift-'+role),button=f.querySelector('[data-find='+role+']'),found=f.querySelector('[data-found='+role+']');
    input.oninput=()=>{versions[role]++;if(role==='recipient')recipient=null;else buyer=null;found.textContent='';button.disabled=false;};
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();button.click();}};
    button.onclick=async()=>{const turn=++versions[role];button.disabled=true;found.textContent='Buscando…';if(role==='recipient')recipient=null;else buyer=null;invalidateReview();
     try{const r=await call('/lookup',{query:input.value.trim()});if(!current()||turn!==versions[role])return;if(role==='recipient')recipient=r.buyer;else buyer=r.buyer;found.textContent='Cuenta encontrada: '+(r.buyer.full_name||'Usuario Qori');}
     catch(e){if(current()&&turn===versions[role])found.textContent=e.message;}finally{if(current()&&turn===versions[role])button.disabled=false;}
    };
   }
   edit.onclick=()=>{fields.disabled=false;invalidateReview();fields.scrollIntoView({block:'start'});};
   f.onsubmit=async e=>{e.preventDefault();e.stopPropagation();if(busy||!current())return;const error=f.querySelector('#giftCreateError');error.textContent='';
    try{
     if(!payload){
      if(!f.reportValidity())return;
      if(!recipient)throw Error('Busca y selecciona la cuenta del beneficiario.');
      const linked=f.elements.link_buyer.checked;if(linked&&!buyer)throw Error('Busca la cuenta del comprador.');
      if(linked&&!f.elements.buyer_authorized.checked)throw Error('Confirma la autorización del comprador.');
      if(linked&&buyer.public_id===recipient.public_id)throw Error('El comprador y el beneficiario deben ser personas distintas.');
      const p=catalog.products.find(p=>p.id===f.elements.product_id.value);
      payload={request_id:requestId,product_id:p.id,recipient_public_id:recipient.public_id,amount:f.elements.amount.value,valid_days:Number(f.elements.valid_days.value),terms:f.elements.terms.value,message:f.elements.message.value,...(linked?{buyer_public_id:buyer.public_id,buyer_authorized:true}:{buyer_name:f.elements.buyer_name.value})};
      payment={amount:payload.amount,payment_method:f.elements.payment_method.value,payment_reference:f.elements.payment_reference.value,branch_id:f.elements.branch_id.value,payment_received:true};
      review.innerHTML='<h3>Revisa antes de enviar</h3><p><strong>'+esc(p.name)+'</strong> · '+money(payload.amount)+'</p><p>Para: <strong>'+esc(recipient.full_name)+'</strong><br>De: '+esc(linked?buyer.full_name:payload.buyer_name)+'</p><p>Vigencia: '+payload.valid_days+' días. El beneficiario recibe una invitación en Customer y no tendrá que pagar al reclamar.</p><label class="cb-check"><input id="giftPaymentReceived" type="checkbox" required> Verifiqué el destinatario y ya recibí el pago completo de '+money(payload.amount)+'.</label>';
      fields.disabled=true;review.hidden=false;edit.hidden=false;submit.textContent='Confirmar pago y enviar ticket';review.scrollIntoView({block:'nearest'});status('Revisa la cuenta destinataria y confirma el pago. Aún no se ha enviado el regalo.');return;
     }
     if(!f.querySelector('#giftPaymentReceived').checked)throw Error('Confirma que recibiste el pago completo antes de enviar el regalo.');
     busy=true;locked=true;submit.disabled=true;edit.hidden=true;submit.textContent='Enviando regalo…';status('Registrando el pago y entregando la invitación…');
     if(!orderId){const r=await call('/product-gifts',payload);orderId=r.order.id;}
     if(!current())return;
     await call('/product-gifts/'+orderId+'/confirm-payment',payment);if(!current())return;
     host.innerHTML='<section class="business-gift-success" role="status"><span aria-hidden="true">✓</span><h3>¡Ticket enviado a Customer!</h3><p>'+esc(recipient.full_name)+' recibirá la invitación y podrá aceptar su regalo. Después mostrará el ticket en tu negocio para reclamar el producto.</p><p>La venta quedó registrada.'+(payload.buyer_public_id?' El comprobante está en las compras del comprador.':'')+'</p><div class="business-gift-create-actions"><button type="button" id="giftAnother">Crear otro regalo</button><button type="button" id="giftOrders">Ver pedidos y entregas</button></div></section>';
     status('Pago confirmado y regalo enviado.');host.querySelector('#giftAnother').onclick=()=>{d.close();open();};host.querySelector('#giftOrders').onclick=()=>{d.close();window.QoriBusinessGifts.open();};host.querySelector('.business-gift-success').scrollIntoView({block:'nearest'});
    }catch(e){if(current()){error.textContent=e.message+(locked?' Puedes reintentar con los mismos datos; no se duplicará el regalo.':'');error.focus();status(orderId?'Solicitud registrada. Reintenta para comprobar si el ticket ya fue enviado.':'No se pudo completar la operación.');}}
    finally{busy=false;if(current()&&submit.isConnected){submit.disabled=false;if(locked)submit.textContent='Reintentar envío';}}
   };
   status('Busca al beneficiario para comenzar.');if(initial){f.querySelector('#gift-recipient').value=initial;f.querySelector('[data-find=recipient]').click();}
  }catch(e){status(e.message);}}
  load();
 }
 window.QoriBusinessGiftCreate={open};
 document.querySelectorAll('[data-create-customer-gift]').forEach(b=>b.addEventListener('click',()=>open()));
})();

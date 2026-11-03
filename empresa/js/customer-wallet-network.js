/* Operate the Qori consumer standard using the existing business services. */
(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const call=(path,method='GET',body)=>api(`/api/business/customer${path}`,{method,headers:authHeaders(),noClientCache:true,...(body?{body:JSON.stringify(body)}:{})});
  function open(){
    if(typeof session==='undefined'||!session||document.getElementById('customerNetworkDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='customerNetworkDialog';dialog.className='customer-network-dialog';
    dialog.innerHTML=`<header><h2>Somos Qori</h2><button type="button" data-close aria-label="Cerrar">×</button></header>
      <p>Un establecimiento Qori ofrece sellos, puntos y giftcards. Configura las condiciones y verifica los tres programas antes de publicar en Customer.</p>
      <p id="qnMessage" role="status"></p><div id="qnChecks" aria-live="polite">Revisando programas…</div>
      <p><a href="?view=stamp-cards">Gestionar sellos</a> · <a href="?view=affiliates">Gestionar afiliaciones y premios</a> · <a href="?view=reward-passes">Gestionar giftcards y canjes</a></p>
      <details open><summary>Condiciones para compradores</summary><form id="qnForm">
        <label>Condiciones de acumulación de puntos<textarea name="points_terms" required minlength="10" maxlength="4000"></textarea></label>
        <label>¿Qué compras acumulan sellos y puntos? ¿Pueden acumular ambos?<textarea name="accumulation_terms" required minlength="10" maxlength="2000"></textarea></label>
        <label class="cb-check"><input name="gift_enabled" type="checkbox"> Recibir solicitudes de giftcards en Customer</label>
        <label>Valor mínimo COP<input name="gift_min" type="number" min="1" step="0.01" required></label>
        <label>Valor máximo COP<input name="gift_max" type="number" min="1" step="0.01" required></label>
        <label>Condiciones de giftcards (sedes autorizadas, usos parciales, vigencia y atención)<textarea name="gift_terms" required minlength="10" maxlength="8000"></textarea></label>
        <p>Esta modalidad emite giftcards para todas las sedes activas, permite usos parciales y tiene vigencia de 12 meses desde la emisión. Las condiciones deben describir esa operación.</p>
        <label>Instrucciones para pagar directamente al negocio<textarea name="gift_payment_instructions" required minlength="10" maxlength="2000"></textarea></label>
        <button type="submit">Guardar y verificar estándar</button></form></details>
      <details open><summary>Solicitudes de giftcards</summary><p>Confirma solo pagos que efectivamente recibiste. La emisión consume el ticket correspondiente según tu plan.</p><button id="qnReload" type="button">Actualizar solicitudes</button><div id="qnOrders"></div></details>`;
    document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
    const message=value=>dialog.querySelector('#qnMessage').textContent=value;
    function showStatus(result){dialog.querySelector('#qnChecks').innerHTML=`<strong>${result.ready?'Listo para publicar como establecimiento Qori':'Completa los requisitos para publicar'}</strong><ul>${result.checks.map(c=>`<li>${c.ok?'✓':'Pendiente:'} ${esc(c.label)}</li>`).join('')}</ul>`;}
    const form=dialog.querySelector('#qnForm');
    call('/standard').then(result=>{showStatus(result);for(const [key,value] of Object.entries(result.programs)){if(!form.elements[key])continue;if(key==='gift_enabled')form.elements[key].checked=value;else form.elements[key].value=value;}}).catch(e=>message(e.message));
    form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const data=Object.fromEntries(new FormData(form));showStatus(await call('/standard','PUT',{...data,gift_enabled:data.gift_enabled==='on'}));message('Condiciones guardadas. La publicación se administra desde Conectar Qori Customer.');}catch(e){message(e.message);}finally{button.disabled=false;}};
    async function loadOrders(){try{const {orders}=await call('/gift-orders');dialog.querySelector('#qnOrders').innerHTML=orders.map(o=>`<article class="qn-order"><h3>${esc(o.buyer_name)} → ${esc(o.recipient_name)}</h3><p>${Number(o.amount).toLocaleString('es-CO')} COP · ${o.state==='PENDING_PAYMENT'?'Pendiente de confirmar pago':o.state==='ISSUED'?'Giftcard emitida':'Cancelada'}</p><small>Solicitud ${esc(o.id)}</small><details><summary>Condiciones aceptadas</summary><p>${esc(o.terms)}</p></details>${o.state==='PENDING_PAYMENT'?`<form data-order="${esc(o.id)}"><input type="hidden" name="amount" value="${esc(o.amount)}"><label>Referencia o comprobante del pago<input name="payment_reference" required minlength="3" maxlength="120"></label><label>Medio por el que recibiste el pago<input name="payment_method" required minlength="2" maxlength="120" placeholder="Efectivo, transferencia…"></label><label class="cb-check"><input type="checkbox" name="received" required> Verifiqué que recibimos el importe completo.</label><button type="submit">Confirmar pago y emitir giftcard</button></form>`:''}</article>`).join('')||'<p>No hay solicitudes.</p>';
      for(const orderForm of dialog.querySelectorAll('[data-order]'))orderForm.onsubmit=async event=>{event.preventDefault();const button=orderForm.querySelector('button');button.disabled=true;try{const data=Object.fromEntries(new FormData(orderForm));await call(`/gift-orders/${orderForm.dataset.order}/confirm-payment`,'POST',{amount:data.amount,payment_reference:data.payment_reference,payment_method:data.payment_method,payment_received:data.received==='on'});message('Giftcard emitida. El destinatario la verá al entrar con su correo verificado.');await loadOrders();showStatus(await call('/standard'));}catch(e){message(e.message);button.disabled=false;}};
    }catch(e){message(e.message);}}
    dialog.querySelector('#qnReload').onclick=loadOrders;loadOrders();
  }
  window.QoriCustomerNetwork={open};
  const timer=setInterval(()=>{for(const host of document.querySelectorAll('.view-head')){if(host.querySelector('[data-qori-network]'))continue;const button=document.createElement('button');button.type='button';button.className='ghost-button';button.dataset.qoriNetwork='true';button.textContent='Somos Qori · Tarjetero';button.onclick=open;host.append(button);}},1500);
  window.addEventListener('pagehide',()=>clearInterval(timer));
})();

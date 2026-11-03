/* Discover an exact Qori identity and send canonical benefits to its inbox. */
(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const call=(path,method='GET',body)=>api('/api/business/customer'+path,{method,headers:authHeaders(),noClientCache:true,...(body?{body:JSON.stringify(body)}:{})});
  const kinds={STAMP:'Tarjeta de sellos',AFFILIATION:'Afiliación Qori',GIFT:'Giftcard de regalo',ACTIVITY:'Invitación a actividad',TICKET:'Ticket de beneficio'};
  const states={PENDING:'Pendiente de aceptar',ACCEPTED:'Aceptada',REJECTED:'Rechazada',CANCELLED:'Cancelada'};
  function open(initial=''){
    if(document.getElementById('customerNetworkDialog'))return;
    const d=document.createElement('dialog');d.id='customerNetworkDialog';d.className='customer-network-dialog';
    d.setAttribute('aria-labelledby','customerNetworkTitle');d.innerHTML=`<header><h2 id="customerNetworkTitle">Qori Customer</h2><button type="button" data-close aria-label="Cerrar">×</button></header><div class="customer-network-body">
      <p>Encuentra al comprador aunque todavía no te haya comprado. Asocia tarjetas, afiliaciones, regalos, tickets y actividades a su portal gratuito. El comprador acepta o rechaza cada invitación.</p>
      <form id="customerNetworkSearch"><label>Correo completo o identificación Qori<input name="query" value="${esc(initial)}" required maxlength="180" autocomplete="off"></label><button>Buscar comprador</button></form>
      <p id="customerNetworkMessage" role="status"></p><div id="customerNetworkResult"></div>
      <button type="button" class="ghost-button" id="customerLegacyConnection">Conectar historial existente y otras opciones</button></div>`;
    document.body.append(d);d.showModal();d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();
    const message=text=>d.querySelector('#customerNetworkMessage').textContent=text;
    d.querySelector('#customerLegacyConnection').onclick=()=>{d.close();window.QoriCustomerBridge.legacy(initial);};
    let buyer,catalog,requestId=crypto.randomUUID();
    async function history(){
      const data=await call('/invitations/'+buyer.public_id);const host=d.querySelector('#customerNetworkHistory');if(!host)return;
      host.innerHTML=data.invitations.map(i=>`<div class="customer-network-row"><div><strong>${esc(i.title)}</strong><p>${states[i.state]} · ${new Date(i.created_at).toLocaleDateString('es-CO')}</p></div>${i.state==='PENDING'?`<button type="button" data-cancel="${i.id}">Cancelar envío</button>`:''}</div>`).join('')||'<p>Aún no le has enviado invitaciones.</p>';
      host.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await call('/invitations/'+b.dataset.cancel+'/cancel','POST',{});await history();message('Invitación cancelada.');}catch(e){message(e.message);b.disabled=false;}});
    }
    function fields(){
      const kind=d.querySelector('[name="kind"]').value,host=d.querySelector('#customerNetworkFields');
      const options=kind==='STAMP'?catalog.programs:kind==='ACTIVITY'?catalog.activities:kind==='TICKET'?catalog.tickets:null;
      host.innerHTML=`${options?`<label>${kind==='STAMP'?'Programa':kind==='ACTIVITY'?'Actividad':'Ticket asignado a este comprador'}<select name="resource_id" required><option value="">Selecciona una opción</option>${options.map(x=>`<option value="${x.id}">${esc(x.name||x.title)}</option>`).join('')}</select></label>${!options.length?'<p>No hay opciones disponibles. Configúralas primero en el módulo correspondiente de Qori Empresa.</p>':''}`:''}
        ${['STAMP','AFFILIATION'].includes(kind)?'<label>Documento del comprador<input name="document_id" required minlength="3" maxlength="80"></label><label class="cb-check"><input type="checkbox" name="identity_checked" required> Verifiqué su identidad y documento. No necesita compras previas.</label>':''}
        ${kind==='GIFT'?'<label>Valor del regalo (COP)<input name="amount" type="number" min="1" max="999999999" step="1" required></label><label>Condiciones de la giftcard<textarea name="terms" minlength="10" maxlength="4000" required></textarea></label><p>Es un obsequio financiado por el negocio, sin cobrar al comprador. Al aceptarlo se emite la giftcard y se descuentan los créditos de emisión habituales. Debes disponer de cupo y una sede activa.</p>':''}
        ${kind==='AFFILIATION'?'<label>Condiciones de afiliación<textarea name="terms" maxlength="4000" placeholder="Condiciones que verá el comprador"></textarea></label>':''}
        ${kind==='TICKET'?'<p>Se muestran tickets personales de activación o posventa ya emitidos para esta persona. Enviar no genera ni duplica el beneficio.</p>':''}`;
    }
    d.querySelector('#customerNetworkSearch').onsubmit=async e=>{
      e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;d.querySelector('#customerNetworkResult').innerHTML='';
      try{
        buyer=(await call('/lookup','POST',{query:new FormData(e.target).get('query').trim()})).buyer;
        catalog=await call('/catalog/'+buyer.public_id);requestId=crypto.randomUUID();
        d.querySelector('#customerNetworkResult').innerHTML=`<section><h3>${esc(buyer.full_name||'Comprador Qori')}</h3><p class="customer-network-id">${esc(buyer.public_id)}</p><p>${buyer.relationship_state==='ACCEPTED'?'Ya tienes una conexión confirmada.':'Puedes enviarle una invitación antes de su primera compra.'}</p>
          <form id="customerNetworkSend"><label>Qué quieres enviar<select name="kind">${Object.entries(kinds).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><div id="customerNetworkFields"></div><label>Mensaje para el comprador<textarea name="message" maxlength="1000"></textarea></label><button>Enviar a Qori Customer</button></form></section><h3>Envíos de este negocio</h3><div id="customerNetworkHistory"></div>`;
        fields();d.querySelector('[name="kind"]').onchange=()=>{requestId=crypto.randomUUID();fields();};
        d.querySelector('#customerNetworkSend').onsubmit=async event=>{
          event.preventDefault();const form=event.target,b=form.querySelector('button');b.disabled=true;
          try{const f=Object.fromEntries(new FormData(form)),body={...f,public_id:buyer.public_id,request_id:requestId};
            if(f.identity_checked)body.identity_checked=true;
            await call('/invitations','POST',body);requestId=crypto.randomUUID();message('Invitación enviada. El comprador la recibe en Mis invitaciones y decide si la acepta.');await history();
          }catch(error){message(error.message);}finally{b.disabled=false;}
        };
        message('Cuenta encontrada. Solo puedes consultar los envíos de tu negocio.');await history();
      }catch(error){message(error.message);}finally{button.disabled=false;}
    };
  }
  window.QoriCustomerInvitations={open};
})();

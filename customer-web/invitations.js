(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={STAMP:'Tarjeta de sellos',AFFILIATION:'Afiliación Qori',GIFT:'Giftcard de regalo',ACTIVITY:'Actividad',TICKET:'Ticket de beneficio',SALE:'Compra para mi historial'};
  const states={PENDING:'Por aceptar',ACCEPTED:'Aceptada',REJECTED:'Rechazada',CANCELLED:'Cancelada'};
  const kinds={STAMP:'STAMP',AFFILIATION:'POINTS',GIFT:'GIFT',TICKET:'TICKET'};
  async function render(page,ctx){
    page.innerHTML='<div class="page-heading"><div><h1>Mis invitaciones</h1><p>Descubre lo que los negocios tienen para ti, incluso antes de tu primera compra.</p></div></div><div id="inboxList" role="status">Cargando invitaciones…</div>';
    try{
      const data=await ctx.request('/invitations');if(!page.isConnected)return;
      const pending=data.invitations.filter(i=>i.state==='PENDING'&&!i.expired),saved=data.invitations.filter(i=>i.state==='ACCEPTED'),history=data.invitations.filter(i=>!pending.includes(i)&&!saved.includes(i));
      const card=i=>`<article class="panel invitation-card"><div class="row"><span class="pill">${i.purchased_product?"Regalo comprado para ti":names[i.kind]}</span><span class="small muted">${i.expired&&i.state==='PENDING'?'Vencida':states[i.state]}</span></div><p class="eyebrow">${esc(i.business_name)}</p><h3>${esc(i.title)}</h3>${i.amount?`<p class="amount">${new Intl.NumberFormat('es-CO',{style:'currency',currency:i.currency||'COP',maximumFractionDigits:0}).format(Number(i.amount))}</p>`:''}<p>${esc(i.message||'Este negocio quiere compartir sus beneficios contigo.')}</p>
        ${i.state==='PENDING'&&!i.expired?`<button class="primary" data-review="${i.id}">Revisar invitación</button>`:i.state==='ACCEPTED'?i.kind==='ACTIVITY'?(i.activity_url?`<a class="primary" href="${esc(i.activity_url)}" target="_blank" rel="noopener">Participar en la actividad ↗</a>`:'<p class="small">Esta actividad ya no está disponible.</p>'):`<button class="secondary" data-resource="${i.id}">Ver ${i.kind==='SALE'?'compra':i.kind==='TICKET'?'ticket':'tarjeta'}</button>`:''}
        <button class="quiet" data-block="${i.business_id}">No recibir más invitaciones de este negocio</button></article>`;
      page.querySelector('#inboxList').innerHTML=`<h2>Pendientes · ${pending.length}</h2><div class="invitation-grid">${pending.map(card).join('')||'<p>No tienes invitaciones pendientes. Un negocio puede encontrarte por tu correo completo o por Mi Qori.</p>'}</div>
        ${saved.length?`<h2>Mis actividades y beneficios aceptados</h2><div class="invitation-grid">${saved.map(card).join('')}</div>`:''}
        ${history.length?`<details class="panel"><summary>Invitaciones anteriores · ${history.length}</summary><div class="invitation-grid">${history.map(card).join('')}</div></details>`:''}
        ${data.blocked.length?`<section class="panel"><h2>Negocios silenciados</h2>${data.blocked.map(b=>`<div class="connected-row"><span>${esc(b.name)}</span><button class="secondary" data-unblock="${b.business_id}">Permitir invitaciones</button></div>`).join('')}</section>`:''}`;
      page.querySelectorAll('[data-review]').forEach(button=>button.onclick=()=>{
        const i=data.invitations.find(row=>row.id===button.dataset.review);
        const d=ctx.dialog('Invitación de '+i.business_name,`<span class="pill">${i.purchased_product?"Regalo comprado para ti":names[i.kind]}</span><h3>${esc(i.title)}</h3><p>${esc(i.message)}</p><h3>Condiciones</h3><p class="small">${esc(i.terms||'Consulta las condiciones con el negocio antes de participar.')}</p>
          <form id="networkAcceptForm" class="stack">${i.document_suffix?`<p>Documento verificado por el negocio, terminado en <strong>${esc(i.document_suffix)}</strong>.</p><p class="small">Al aceptar confirmas la conexión con este negocio y la tarjeta indicada. No se comparten tus otros negocios.</p>${i.relationship_state==='PENDING'?'<label class="check"><input type="checkbox" name="include_history"><span>Incluir también mis compras y tarjetas anteriores de este negocio.</span></label>':''}`:''}
          ${i.kind==='SALE'?'<label class="check"><input type="checkbox" name="auto_receive"><span>Recibir automáticamente las próximas compras que este negocio me atribuya. Puedo desactivarlo en Finanzas.</span></label>':''}
          ${i.purchased_product?'<p>Este producto ya está pagado. Aceptarlo no genera ningún cobro. Su QR quedará en Mis tarjetas.</p>':''}
          ${['STAMP','AFFILIATION','GIFT'].includes(i.kind)?window.QoriBenefitRecovery.documentFields(ctx.account):''}
          <label class="check"><input type="checkbox" name="terms" required><span>Acepto esta invitación y sus condiciones.</span></label><footer><button type="button" class="secondary" id="rejectInvitation">Rechazar</button><button class="primary">Aceptar invitación</button></footer></form>`);
        const decide=async(action,body={})=>{await ctx.request('/invitations/'+i.id+'/decision',{action,...body});d.close();await ctx.refresh();};
        d.querySelector('#networkAcceptForm').onsubmit=async event=>{event.preventDefault();event.stopPropagation();const b=event.submitter;b.disabled=true;try{const f=new FormData(event.target);await decide('ACCEPT',{terms_accepted:f.has('terms'),include_history:f.has('include_history'),auto_receive:f.has('auto_receive'),...(f.get('document_id')?{document_id:f.get('document_id'),document_confirmation:f.get('document_confirmation')||undefined}: {})});}catch(e){ctx.showError(e.message,d.querySelector('#dialogError'));}finally{b.disabled=false;}};
        d.querySelector('#rejectInvitation').onclick=async event=>{event.target.disabled=true;try{await decide('REJECT');}catch(e){ctx.showError(e.message,d.querySelector('#dialogError'));event.target.disabled=false;}};
      });
      page.querySelectorAll('[data-resource]').forEach(b=>b.onclick=()=>{const i=data.invitations.find(r=>r.id===b.dataset.resource);if(i.kind==='SALE')ctx.openSale(i.result_id);else ctx.openCard(kinds[i.kind],i.result_id);});
      for(const button of page.querySelectorAll('[data-block],[data-unblock]'))button.onclick=async()=>{button.disabled=true;try{await ctx.request('/business-blocks/'+(button.dataset.block||button.dataset.unblock),{blocked:!!button.dataset.block},'PUT');await ctx.refresh();}catch(e){ctx.showError(e.message);button.disabled=false;}};
    }catch(e){ctx.showError(e.message);}
  }
  window.QoriInvitations={render};
})();

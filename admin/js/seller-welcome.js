(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function open({id,dialog,request,isCurrent}){
  const d=dialog('Bienvenida del embajador','<p class="full" role="status" id="welcomeState">Preparando la bienvenida…</p>');
  try{
   const preview=await request('/api/admin/accounts/sellers/'+id+'/welcome');if(!isCurrent()||!d.isConnected)return;
   const retry=preview.history.find(r=>['FAILED','PENDING'].includes(r.status)&&Date.now()-new Date(r.created_at)<23*3600000);
   const requestId=retry?.request_id||crypto.randomUUID(),form=d.querySelector('form');
   form.innerHTML=`<section class="full seller-welcome-info"><p class="eyebrow">UNA NUEVA ETAPA CON QORI</p><h3>¡Bienvenido, Embajador Qori!</h3><p><strong>Para:</strong> ${esc(preview.recipient)}<br><strong>Asunto:</strong> ${esc(preview.subject)}</p>${preview.can_send?`<p>${preview.requires_activation?'El correo incluirá un enlace personal para crear y confirmar su contraseña. Un nuevo envío reemplaza los enlaces de activación anteriores.':'El correo lo llevará a Seller. Su contraseña actual se conserva.'}</p>`:`<p class="seller-welcome-warning" role="alert">${esc(preview.reason)}</p>`}</section><iframe class="seller-welcome-preview full" title="Vista previa del correo de bienvenida" sandbox="" referrerpolicy="no-referrer"></iframe><div class="full toolbar"><button class="primary-button" type="submit" ${preview.can_send?'':'disabled'}>${retry?'Reintentar envío':'Enviar bienvenida por correo'}</button></div><p class="full message" role="status" id="welcomeSendState"></p>${preview.history.length?`<details class="full"><summary>Últimos envíos</summary>${preview.history.map(r=>`<p>${esc({SENT:'Enviado',FAILED:'Falló el envío',PENDING:'Por enviar',CANCELLED:'Cancelado'}[r.status])} · ${esc(new Date(r.sent_at||r.created_at).toLocaleString('es-CO'))}</p>`).join('')}</details>`:''}`;
   form.querySelector('iframe').srcdoc=preview.html;
   form.onsubmit=async e=>{
    e.preventDefault();const b=form.querySelector('[type=submit]'),status=form.querySelector('#welcomeSendState');if(b.disabled||d.dataset.saving||!isCurrent())return;
    d.dataset.saving='true';b.disabled=true;status.textContent='Enviando bienvenida…';
    try{const r=await request('/api/admin/accounts/sellers/'+id+'/welcome',{request_id:requestId,expected_email:preview.recipient},'POST');if(!isCurrent()||!d.isConnected)return;if(r.status==='SENT'){status.textContent='Correo de bienvenida enviado a '+preview.recipient+'.';b.textContent='Bienvenida enviada';b.dataset.sent='true';}else{status.textContent=r.message;b.textContent=r.status==='FAILED'?'Reintentar envío':'Abre nuevamente la bienvenida';if(r.status==='CANCELLED')b.dataset.sent='true';}}
    catch(error){if(isCurrent()&&d.isConnected){status.textContent=error.message;b.textContent='Reintentar envío';}}
    finally{delete d.dataset.saving;b.disabled=b.dataset.sent==='true';}
   };
  }catch(error){if(isCurrent()&&d.isConnected)d.querySelector('[role=status]').textContent=error.message;}
 }
 window.QoriSellerWelcome={open};
})();

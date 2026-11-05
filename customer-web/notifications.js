(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const kinds={STAMP:'STAMP',AFFILIATION:'POINTS',GIFT:'GIFT',TICKET:'TICKET'};
 let timer,context,lastCount=null,accountId;
 function badge(count){document.querySelectorAll('[data-benefit-badge]').forEach(n=>{n.textContent='Avisos'+(count?' ('+count+')':'');n.parentElement.setAttribute('aria-label',count+' notificaciones sin leer');});}
 function watch(ctx){
  context=ctx;if(accountId!==ctx.account?.id){accountId=ctx.account?.id;lastCount=null;}
  const poll=async()=>{if(!document.querySelector('[data-benefit-badge]')){clearInterval(timer);timer=null;return;}if(document.hidden)return;
   const active=context;try{const data=await active.request('/notifications');if(context.account?.id!==active.account?.id||data.public_id!==active.account?.public_id)return;badge(data.count);
    const changed=lastCount!==null&&lastCount!==data.count;lastCount=data.count;
    if(changed&&['#wallet','#benefits'].includes(location.hash)&&!document.querySelector('dialog[open]'))await active.refresh();
   }catch{}
  };
  if(!timer){poll();timer=setInterval(poll,20000);}else if(lastCount!==null)badge(lastCount);
 }
 async function pushControls(host,ctx){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){host.textContent='Tus avisos quedan guardados aquí. Para avisos fuera de Qori, usa un navegador compatible; en iPhone abre Qori desde la pantalla de inicio.';return;}
  try{const settings=await ctx.request('/payment-agenda/push');if(!host.isConnected)return;if(!settings.configured){host.textContent='Tus notificaciones están disponibles en este centro.';return;}
   const reg=await navigator.serviceWorker.ready,subscription=await reg.pushManager.getSubscription();const enabled=subscription&&settings.subscriptions.some(s=>s.endpoint===subscription.endpoint);
   host.innerHTML='<button class="secondary">'+(enabled?'Desactivar avisos en este dispositivo':'Activar avisos en este dispositivo')+'</button><p class="small muted">Incluye beneficios y los recordatorios de pagos que tengas configurados. Requiere permiso del navegador y una sesión vigente. Los avisos también quedan guardados en Qori.</p>';
   host.querySelector('button').onclick=async event=>{const b=event.target;b.disabled=true;try{
    if(enabled){await ctx.request('/payment-agenda/push',{endpoint:subscription.endpoint},'DELETE');await subscription.unsubscribe();}
    else{if(await Notification.requestPermission()!=='granted')throw Error('El navegador no concedió permiso. Puedes consultar tus avisos aquí.');
     const key=Uint8Array.from(atob(settings.public_key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
     const sub=subscription||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await ctx.request('/payment-agenda/push',{subscription:sub.toJSON()});
    }await pushControls(host,ctx);
   }catch(e){ctx.showError(e.message);b.disabled=false;}};
  }catch(e){if(host.isConnected)host.textContent='No pudimos consultar los permisos del dispositivo. Inténtalo nuevamente.';}
 }
 async function render(page,ctx){
  page.innerHTML='<div class="page-heading"><div><p class="eyebrow">Empresa + Customer</p><h1>Tus notificaciones</h1><p>Tarjetas, sellos, puntos, regalos y actividades. Todo lo que recibes, en un solo lugar.</p></div><button class="secondary" data-reload>Actualizar</button></div><section class="panel" data-device></section><div data-notices role="status">Cargando tus avisos…</div>';
  page.querySelector('[data-reload]').onclick=()=>render(page,ctx);pushControls(page.querySelector('[data-device]'),ctx);
  try{const data=await ctx.request('/notifications');if(!page.isConnected)return;badge(data.count);lastCount=data.count;
   page.querySelector('[data-notices]').innerHTML=data.items.length?data.items.map(n=>`<article class="panel"><div class="row"><span class="pill">${n.read_at?'Leída':'Nueva'}</span><span class="small muted">${esc(new Date(n.created_at).toLocaleString('es-CO'))}</span></div><p class="eyebrow">${esc(n.business_name)}</p><h2>${esc(n.title)}</h2><p>${esc(n.body)}</p><div class="row"><button class="primary" data-open="${n.id}">${n.invitation_id&&n.invitation_state==='PENDING'?'Revisar invitación':'Ver beneficio'}</button>${!n.read_at?`<button class="quiet" data-read="${n.id}">Marcar como leída</button>`:''}</div></article>`).join(''):'<section class="panel"><h2>Todo al día</h2><p>Cuando recibas un beneficio o una invitación de un negocio Qori, aparecerá aquí.</p><a class="secondary" href="#explore">Explorar beneficios</a></section>';
   page.querySelectorAll('[data-read],[data-open]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{
    const n=data.items.find(n=>n.id===(b.dataset.read||b.dataset.open));await ctx.request('/notifications/'+n.id+'/read',{});
    if(b.dataset.read){await render(page,ctx);return;}
    if(n.invitation_id&&n.invitation_state!=='ACCEPTED'||['ACTIVITY','SALE'].includes(n.kind)){location.hash='invitations';return;}
    if(n.resource_id&&kinds[n.kind])await ctx.openCard(kinds[n.kind],n.resource_id);else location.hash='invitations';
    await render(page,ctx);
   }catch(e){ctx.showError(e.message);b.disabled=false;}});
  }catch(e){if(page.isConnected){page.querySelector('[data-notices]').textContent='No pudimos cargar tus avisos. Pulsa Actualizar para reintentar.';ctx.showError(e.message);}}
 }
 window.QoriNotifications={render,watch};
})();

/* Find a registered Customer identity independently from this business's CRM. */
(() => {
 const root=document.getElementById('customerWorkspace');if(!root)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const scope=()=>JSON.stringify(authHeaders());
 const call=(path,body)=>api('/api/business/customer'+path,{method:'POST',headers:authHeaders(),noClientCache:true,body:JSON.stringify(body)});
 let generation=0;
 function normalize(value){
  const raw=String(value||'').trim();
  if(!/^https?:\/\//i.test(raw))return raw;
  let url;try{url=new URL(raw);}catch{throw Error('Revisa el enlace de identificación Qori.');}
  const origins=[location.origin];if(typeof QORI_PUBLIC_ORIGIN!=='undefined')origins.push(QORI_PUBLIC_ORIGIN);
  const id=url.searchParams.get('customer');
  if(!origins.includes(url.origin)||url.pathname!=='/empresa/'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id||''))throw Error('Pega el QR de identificación personal de Qori Customer, o escribe su correo completo.');
  return id;
 }
 function open(initial=''){
  const turn=++generation,owner=scope();
  root.innerHTML=`<div class="customer-workspace-head"><div><span class="customer-workspace-kicker">Empresa + Customer</span><h2>Encuentra al comprador. Comparte tus beneficios.</h2><p>Busca entre las cuentas registradas en Qori Customer, aunque todavía no te hayan comprado ni estén en tus contactos.</p></div><a class="ghost-button" href="/customer/" target="_blank" rel="noopener">Abrir Qori Customer ↗</a></div>
   <section class="customer-search-panel"><form id="customerWorkspaceSearch"><label for="customerWorkspaceQuery">Correo completo, identificación Qori o enlace de su QR personal</label><div class="customer-search-controls"><input id="customerWorkspaceQuery" name="query" value="${esc(initial)}" required maxlength="2000" autocomplete="off" placeholder="comprador@correo.com"><button class="primary-button" type="submit">Buscar usuario Customer</button></div><p>El comprador encuentra su identificación en Inicio → Mi identificación Qori. También puedes escanear su QR desde el Validador.</p></form><p id="customerWorkspaceStatus" role="status" aria-live="polite"></p></section>
   <div id="customerWorkspaceResult"></div>
   <section class="customer-workspace-guide"><h3>Una cuenta para recibir lo que tu negocio ofrece</h3><ol><li><strong>Encuentra la cuenta</strong><span>Usa su correo completo o identificación. No necesita una compra previa.</span></li><li><strong>Elige qué compartir</strong><span>Tarjetas, afiliaciones, regalos, tickets, actividades o compras registradas.</span></li><li><strong>El comprador decide</strong><span>Recibe la invitación en Customer y puede aceptarla o rechazarla.</span></li></ol><p>Los envíos y conexiones de tu negocio se conservan por separado de los demás establecimientos.</p></section>`;
  const form=root.querySelector('form'),input=form.elements.query,button=form.querySelector('button'),status=root.querySelector('#customerWorkspaceStatus'),result=root.querySelector('#customerWorkspaceResult');
  let searchVersion=0;
  const current=v=>turn===generation&&v===searchVersion&&owner===scope()&&root.isConnected;
  input.oninput=()=>{searchVersion++;button.disabled=false;result.innerHTML='';status.textContent='';};
  form.onsubmit=async e=>{
   e.preventDefault();e.stopPropagation();if(button.disabled)return;
   const requestVersion=++searchVersion;button.disabled=true;result.innerHTML='';status.textContent='Buscando una cuenta Customer registrada…';
   try{
    const {buyer}=await call('/lookup',{query:normalize(input.value)});
    if(!current(requestVersion))return;
    const manager=typeof session!=='undefined'&&['BUSINESS_OWNER','BUSINESS_MANAGER'].includes(session?.user?.role);
    const benefits=[['STAMP','Tarjeta de sellos','Asocia un programa de fidelización de tu negocio.'],['AFFILIATION','Afiliación y puntos','Invítalo a tu programa de afiliados.'],['GIFT','Giftcard de regalo','Entrega un obsequio financiado por tu negocio.'],['TICKET','Ticket de beneficio','Envía un ticket personal ya asignado a este comprador.'],['ACTIVITY','Actividad o activación','Invítalo a participar y recibir sus premios en Customer.']];
    result.innerHTML=`<section class="customer-identity-panel"><div class="customer-identity-heading"><span class="customer-found-badge">Cuenta Customer encontrada</span><h3>${esc(buyer.full_name||'Comprador Qori')}</h3><p class="customer-network-id">${esc(buyer.public_id)}</p><p>${buyer.relationship_state==='ACCEPTED'?'Tu negocio ya tiene una conexión confirmada con esta cuenta.':'Puedes enviarle beneficios antes de su primera compra.'}</p></div><div class="customer-benefit-actions">${manager?benefits.map(([kind,title,copy])=>`<button type="button" data-customer-benefit="${kind}"><strong>${title}</strong><span>${copy}</span><small>Preparar invitación →</small></button>`).join('')+`<button type="button" id="customerWorkspaceSale"><strong>Enviar una compra</strong><span>Asocia una venta ya registrada a su historial financiero.</span><small>Elegir venta →</small></button>`:'<p>Tu rol permite encontrar la cuenta y proponer una conexión verificada. El propietario o administrador del negocio gestiona los envíos de beneficios.</p>'}</div><div class="customer-workspace-footer"><button type="button" class="ghost-button" id="customerWorkspaceConnect">Conectar compras y tarjetas existentes</button>${manager?'<button type="button" class="ghost-button" id="customerWorkspaceHistory">Ver envíos a esta cuenta</button>':''}</div></section>`;
    result.querySelectorAll('[data-customer-benefit]').forEach(b=>b.onclick=()=>window.QoriCustomerInvitations.open(buyer.public_id,{kind:b.dataset.customerBenefit}));
    result.querySelector('#customerWorkspaceConnect').onclick=()=>window.QoriCustomerBridge.legacy(buyer.public_id);
    result.querySelector('#customerWorkspaceSale')?.addEventListener('click',()=>window.QoriCustomerFinance.openForCustomer(buyer.public_id));
    result.querySelector('#customerWorkspaceHistory')?.addEventListener('click',()=>window.QoriCustomerInvitations.open(buyer.public_id,{history:true}));
    status.textContent='Selecciona lo que quieres compartir con esta cuenta.';
   }catch(error){if(current(requestVersion)){status.textContent=error.message;result.innerHTML='<section class="customer-search-empty"><h3>Revisa la identificación</h3><p>Escribe el correo completo usado al registrarse, o pide al comprador su identificación desde el portal Customer.</p><p>Si todavía no tiene cuenta, puede registrarse gratis en <a href="/customer/" target="_blank" rel="noopener">Qori Customer</a>.</p></section>';}}
   finally{if(current(requestVersion))button.disabled=false;}
  };
  if(initial)form.requestSubmit(button);
 }
 function show(query=''){if(typeof setView==='function')setView('customer-network');open(query);}
 window.QoriCustomerWorkspace={open,show,normalize};
 if(document.body.dataset.currentView==='customer-network')open();
})();

/* Web is the primary Customer experience; all data uses the shared Customer APIs. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const link=(hash,title,description)=>`<a class="portal-tile" href="#${hash}"><strong>${title}</strong><span>${description}</span><span aria-hidden="true">↗</span></a>`;
 const money=(v,c)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:c==='COP'?0:2}).format(Number(v||0)/100);
 async function home(page,ctx) {
  const cards=ctx.cards||[],ready=cards.filter(c=>c.status==='READY').length,pending=ctx.invitationCount||0;
  page.innerHTML=`<section class="portal-welcome"><div><span class="eyebrow">Tu portal gratuito</span><h1>Hola, ${esc(ctx.account.full_name.split(' ')[0])}.</h1><p>Todo lo que recibes, compras y disfrutas con Qori, en un solo lugar.</p><div class="row"><a class="primary" href="#me">Mi identificación Qori</a><a class="secondary" href="#scan">Escanear un negocio</a></div></div><div class="portal-welcome-note"><strong>¿Aquí son Qori?</strong><p>Comparte tu identificación con el negocio. Recibe sus invitaciones y decide cuáles aceptar.</p></div></section>
   <div class="portal-stats"><a class="panel" href="#wallet"><span>Mis tarjetas y tickets</span><strong>${cards.length}</strong><small>Sellos, puntos, giftcards y premios</small></a><a class="panel" href="#benefits"><span>Beneficios disponibles</span><strong>${ready}</strong><small>Consulta las condiciones de cada uno</small></a><a class="panel" href="#invitations"><span>Invitaciones por revisar</span><strong>${pending}</strong><small>Acepta o rechaza lo que recibes</small></a></div>
   <section class="panel portal-finance"><div><span class="eyebrow">Mis finanzas</span><h2>Tu mes, con claridad</h2><div id="portalFinancialSummary" role="status">Consultando tus movimientos…</div></div><div class="row"><button class="primary" id="portalAddExpense">Registrar gasto</button><a class="secondary" href="#finances">Ver mis finanzas</a></div></section>
   <h2>Tu espacio Qori</h2><div class="portal-grid">
    ${link('explore','Descubrir beneficios','Activaciones, programas, descuentos y regalos publicados')}
    ${link('directory','Negocios Qori','Busca por ciudad o por cercanía')}
    ${link('wallet','Mis tarjetas y tickets','Todos tus negocios y programas organizados')}
    ${link('invitations','Mis invitaciones','Tarjetas, afiliaciones, tickets, actividades y compras')}
    ${link('product-gifts','Regalos enviados','Consulta el pago y la entrega de tus regalos')}
    ${link('businesses','Mis negocios y giftcards','Conexiones, compras de giftcards y programas')}
    ${link('earned','Mis actividades','Participaciones y beneficios obtenidos')}
    ${link('history','Historial de gastos','Compras de Empresa y movimientos registrados por ti')}
    ${link('planning','Presupuestos y metas','Organiza gastos, objetivos y pagos recurrentes')}
    ${link('saved','Guardados','Publicaciones que quieres aprovechar')}
    ${link('following','Negocios que sigo','Vuelve a tus negocios favoritos')}
    ${link('requests','Solicitudes de programas','Consulta las respuestas de los negocios')}
    ${link('place-requests','Quiero Qori aquí','Propón un negocio para el ecosistema')}
    ${link('profile','Mi cuenta','Datos, preferencias, privacidad y sesiones')}
   </div><p class="muted small">Abre este portal desde el computador o el celular. También puedes añadirlo a la pantalla de inicio desde el navegador.</p>`;
  page.querySelector('#portalAddExpense').onclick=()=>window.QoriFinance.editEntry({...ctx,refreshFinance:()=>page.isConnected?home(page,ctx):Promise.resolve()});
  const target=page.querySelector('#portalFinancialSummary');
  try {
   const d=await ctx.request('/dashboard?period=month&currency='+encodeURIComponent(ctx.account.currency));
   if(!target.isConnected)return;
   target.innerHTML=`<strong class="portal-total">${esc(money(d.total_minor,d.currency))}</strong><p>Gastos registrados este mes · ${esc(d.currency)}</p><p class="small muted">Incluye únicamente movimientos registrados en esta moneda. Agrega tus gastos de otros lugares para completar tu historial.</p>`;
  }catch(e){if(target.isConnected){target.textContent=e.message+' Puedes reintentar desde Mis finanzas.';target.setAttribute('role','alert');}}
 }
 const distance=(a,b)=>{
  if(b.latitude==null||b.longitude==null)return Infinity;
  const rad=v=>Number(v)*Math.PI/180,lat=rad(b.latitude-a.latitude),lon=rad(b.longitude-a.longitude);
  const n=Math.sin(lat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(lon/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(n)));
 };
 async function directory(page,ctx) {
  let position=null,rows=[],next=null,busy=false,search='',city='';
  page.innerHTML=`<div class="page-heading"><div><h1>Negocios Qori</h1><p>Encuentra sus beneficios, actividades y programas publicados.</p></div><a class="secondary" href="#place-requests">Quiero Qori aquí</a></div><form id="portalDirectorySearch" class="portal-search"><label class="field">Negocio o categoría<input name="search" maxlength="100" type="search"></label><label class="field">Ciudad<input name="city" maxlength="100"></label><button class="primary">Buscar</button></form><div class="row"><button class="secondary" id="portalNearMe">Ordenar por cercanía</button><span class="small muted">La ubicación se usa solo en este navegador.</span></div><p id="portalDirectoryStatus" role="status"></p><div id="portalPlaces" class="portal-grid"></div><button class="secondary" id="portalMorePlaces" hidden>Cargar más negocios</button>`;
  const list=page.querySelector('#portalPlaces'),status=page.querySelector('#portalDirectoryStatus'),more=page.querySelector('#portalMorePlaces'),near=page.querySelector('#portalNearMe');
  function draw(){
   const sorted=position?[...rows].sort((a,b)=>distance(position,a)-distance(position,b)):rows;
   list.innerHTML=sorted.map(r=>`<a class="portal-tile" href="#business/${encodeURIComponent(r.slug)}"><strong>${esc(r.name)}</strong><span>${esc([r.category,r.city].filter(Boolean).join(' · '))}</span><span>${esc(r.address)}</span>${position?`<small>${Number.isFinite(distance(position,r))?'Aprox. '+distance(position,r).toFixed(1)+' km':'Ubicación no publicada'}</small>`:''}<span>Ver negocio y beneficios →</span></a>`).join('')||'<div class="panel"><h2>No encontramos negocios con estos filtros</h2><p>Prueba otra ciudad o propón un negocio con “Quiero Qori aquí”.</p></div>';
   more.hidden=next===null;
  }
  async function fetchPage(offset=0){
   if(busy)return;busy=true;more.disabled=true;status.textContent='Buscando negocios…';
   try{
    const d=await ctx.request('/explore/directory?'+new URLSearchParams({search,city,offset}));
    if(!list.isConnected)return;
    rows=offset?[...rows,...d.businesses]:d.businesses;next=d.next_offset;draw();
    status.textContent=position?'Ordenados por distancia entre los negocios cargados. Carga más para ampliar los resultados.':rows.length+' negocios cargados.';
   }catch(e){if(status.isConnected)status.textContent=e.message;}finally{busy=false;more.disabled=false;}
  }
  page.querySelector('form').onsubmit=async e=>{e.preventDefault();e.stopPropagation();if(busy)return;const f=new FormData(e.target);search=String(f.get('search')).trim();city=String(f.get('city')).trim();await fetchPage();};
  more.onclick=()=>fetchPage(next);
  near.onclick=()=>{
   if(!navigator.geolocation){status.textContent='Este navegador no ofrece ubicación. Busca por ciudad.';return;}
   near.disabled=true;status.textContent='Esperando tu permiso de ubicación…';
   navigator.geolocation.getCurrentPosition(p=>{if(!list.isConnected)return;position=p.coords;near.disabled=false;draw();status.textContent='Cercanía aproximada entre los negocios cargados. Carga más para ampliar los resultados.';},()=>{if(!status.isConnected)return;near.disabled=false;status.textContent='No pudimos obtener tu ubicación. Puedes seguir buscando por ciudad.';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
  };
  await fetchPage();
 }
 async function placeRequests(page,ctx) {
  page.innerHTML=`<div class="page-heading"><div><h1>Quiero Qori aquí</h1><p>Propón ese negocio en el que te gustaría recibir beneficios Qori.</p></div></div><div class="profile-grid"><section class="panel"><form id="portalPlaceRequest" class="stack"><label class="field">Nombre del negocio<input name="name" required minlength="2" maxlength="160"></label><label class="field">Ciudad<input name="city" required minlength="2" maxlength="100"></label><label class="field">Dirección (opcional)<input name="address" maxlength="200"></label><p class="small muted">Registraremos tu sugerencia. Esto no afilia al negocio ni garantiza su incorporación.</p><button class="primary">Registrar sugerencia</button><p id="portalRequestStatus" role="status"></p></form></section><section class="panel"><h2>Mis sugerencias</h2><div id="portalRequestHistory" role="status">Cargando…</div><a class="secondary" href="#directory">Explorar negocios Qori</a></section></div>`;
  const history=page.querySelector('#portalRequestHistory'),status=page.querySelector('#portalRequestStatus');
  async function reload(){try{const d=await ctx.request('/place-requests');if(history.isConnected)history.innerHTML=d.requests.map(r=>`<article class="portal-request"><strong>${esc(r.name)}</strong><p>${esc(r.city)}${r.address?' · '+esc(r.address):''}</p><span class="pill">${r.business_id?'Negocio vinculado':'Sugerencia registrada'}</span></article>`).join('')||'<p>Tus sugerencias aparecerán aquí.</p>';}catch(e){if(history.isConnected)history.textContent=e.message;}}
  page.querySelector('form').onsubmit=async e=>{e.preventDefault();e.stopPropagation();const button=e.target.querySelector('button');if(button.disabled)return;button.disabled=true;try{const f=new FormData(e.target);await ctx.request('/place-requests',{name:String(f.get('name')).trim(),city:String(f.get('city')).trim(),address:String(f.get('address')).trim()});if(!status.isConnected)return;e.target.reset();status.textContent='Tu sugerencia quedó registrada.';await reload();}catch(err){status.textContent=err.message;}finally{button.disabled=false;}};
  await reload();
 }
 function preferences(account){
  const notifications=account.preferences?.notifications||{};
  return `<label class="field">Moneda principal<select name="currency">${['COP','USD','EUR'].map(c=>`<option ${c===account.currency?'selected':''}>${c}</option>`).join('')}</select></label><label class="field">Zona horaria<input name="timezone" value="${esc(account.timezone||'America/Bogota')}" required maxlength="60" list="portalTimezones"></label><datalist id="portalTimezones"><option value="America/Bogota"><option value="America/Mexico_City"><option value="America/Lima"><option value="Europe/Madrid"></datalist><p class="small muted">La moneda principal se usa en el resumen. Tus movimientos conservan su moneda original; no se convierten automáticamente.</p><fieldset class="portal-preferences"><legend>Preferencias de avisos</legend>${Object.entries({purchases:'Compras',benefits:'Beneficios',budget:'Presupuestos',summary:'Resúmenes'}).map(([key,label])=>`<label class="check"><input type="checkbox" name="notice_${key}" ${notifications[key]?'checked':''}>${label}</label>`).join('')}<p class="small muted">Guardamos tus preferencias de cuenta. Los avisos push del navegador aún no están disponibles.</p></fieldset>`;
 }
 window.QoriPortal={home,directory,placeRequests,preferences,distance};
})();

/* Public discovery; account actions use the HttpOnly Customer session. */
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={ACTIVITY:'Activaciones',STAMP:'Sellos',AFFILIATION:'Afiliados',GIFT:'Giftcards',PRODUCT:'Regalos'},marks={ACTIVITY:'✦',STAMP:'◌',AFFILIATION:'∞',GIFT:'◇',PRODUCT:'☕'};
 let cleanup=()=>{},installEvent;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});
 const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v));
 const field=(name,label,extra='')=>'<label class="field">'+label+'<input name="'+name+'" '+extra+'></label>';
 function card(p){
  return '<article class="discovery-card"><a href="#publication/'+p.id+'" class="offer-art kind-'+p.kind+'">'+(p.cover_url?'<img src="'+esc(p.cover_url)+'" alt="" loading="lazy">':'')+'<span class="pill">'+names[p.kind]+'</span><span class="offer-symbol" aria-hidden="true">'+marks[p.kind]+'</span><strong>'+esc(p.benefit||p.title)+'</strong></a><div class="offer-copy"><a class="offer-business" href="#business/'+encodeURIComponent(p.business_slug)+'">'+esc(p.business_name)+' ↗</a><h3><a href="#publication/'+p.id+'">'+esc(p.title)+'</a></h3><p>'+esc(p.description||'Descubre lo que este negocio tiene para ti.')+'</p><footer><span>'+esc(p.city||'En Qori')+'</span><a href="#publication/'+p.id+'">Ver beneficio →</a></footer></div></article>';
 }
 async function render(page,ctx,route){
  cleanup();cleanup=()=>{};
  page.innerHTML='<p role="status">Buscando lo bueno de ser Qori…</p>';
  const auth=()=>{if(ctx.account)return true;ctx.login();return false;};
  const fail=e=>{if(page.isConnected)ctx.showError(e.message);};
  try{
   if(route==='scan')return scanner(page,ctx);
   if(route==='following'){
    if(!auth())return;const data=await ctx.request('/discovery/following');if(!page.isConnected)return;
    page.innerHTML='<div class="page-heading"><div><h1>Negocios que sigo</h1><p>Vuelve a descubrir lo que tienen para ti.</p></div><a class="secondary" href="#explore">Explorar</a></div><div class="discovery-grid">'+(data.businesses.map(b=>'<article class="panel"><span class="eyebrow">'+esc(b.city)+'</span><h2>'+esc(b.name)+'</h2><p>'+esc(b.description)+'</p><a class="primary" href="#business/'+encodeURIComponent(b.slug)+'">Ver sus beneficios →</a></article>').join('')||'<p>Sigue un negocio desde su perfil para encontrarlo aquí.</p>')+'</div>';return;
   }
   if(route==='earned'){
    if(!auth())return;const data=await ctx.request('/discovery/earned');if(!page.isConnected)return;
    page.innerHTML='<div class="page-heading"><div><h1>Mis actividades</h1><p>Tus participaciones y beneficios obtenidos.</p></div><a class="secondary" href="#wallet">Mis tarjetas</a></div>'+data.participations.map(p=>'<article class="panel"><p class="eyebrow">'+esc(p.business_name)+'</p><h2>'+esc(p.title)+'</h2><p>'+esc(p.reward_label||'Participación registrada')+'</p><div class="row">'+(p.qr_code_id?'<button class="primary" data-ticket="'+p.qr_code_id+'">Ver mi ticket</button>':'')+(p.download_url?'<a class="primary" href="'+esc(p.download_url)+'">Descargar '+esc(p.asset_title)+'</a>':'')+(p.publication_id?'<a class="secondary" href="#publication/'+p.publication_id+'">Ver actividad</a>':'')+'</div></article>').join('');
    if(!data.participations.length)page.insertAdjacentHTML('beforeend','<section class="empty"><h2>Tu próxima experiencia te espera.</h2><a class="primary" href="#explore">Descubrir activaciones</a></section>');
    page.querySelectorAll('[data-ticket]').forEach(b=>b.onclick=()=>ctx.openCard('TICKET',b.dataset.ticket));return;
   }
   if(route.startsWith('publication/')){
    const id=route.split('/')[1],data=await ctx.request('/explore/publications/'+id);if(!page.isConnected)return;
    const p=data.publication,personal=ctx.account?await ctx.request('/discovery/me'):{saved:[],requests:[]};if(!page.isConnected)return;
    let saved=personal.saved.includes(id);const pending=personal.requests.find(r=>r.publication_id===id&&['PENDING','INVITED'].includes(r.state));
    const action=p.kind==='PRODUCT'?'Regalar este producto':p.kind==='ACTIVITY'?'Participar en la activación':p.kind==='GIFT'?'Regalar una giftcard':pending?'Ver mi solicitud':'Quiero este programa';
    page.innerHTML='<a class="back-link" href="#explore">← Explorar Qori</a><section class="offer-detail"><div>'+card(p)+'<button class="secondary wide" id="shareOffer">Compartir este beneficio ↗</button></div><div class="panel"><span class="pill">'+names[p.kind]+'</span><h1>'+esc(p.title)+'</h1><p>'+esc(p.description)+'</p><a class="offer-business" href="#business/'+encodeURIComponent(p.business_slug)+'">Conoce '+esc(p.business_name)+' →</a><hr><h3>Así lo disfrutas</h3><p>'+esc(p.benefit||'Consulta las condiciones del negocio.')+'</p>'+(p.stamps_required?'<p>Completa '+p.stamps_required+' sellos para obtener tu premio.</p>':'')+(p.kind==='PRODUCT'?'<p class="gift-price">'+money(p.product_price)+'</p><p>Una unidad para regalar. Válido '+p.product_valid_days+' días desde el pago confirmado.</p>':'')+(p.kind==='GIFT'?'<p>Desde '+money(p.gift_min)+' hasta '+money(p.gift_max)+'.</p>':'')+'<p class="terms">'+esc(p.terms||'Consulta las condiciones con el establecimiento.')+'</p>'+(p.ends_at?'<p class="small">Disponible hasta '+new Date(p.ends_at).toLocaleDateString('es-CO')+'.</p>':'')+'<div class="stack"><button class="primary" id="offerAction">'+action+' →</button><button class="secondary" id="saveOffer">'+(saved?'♥ Guardado':'♡ Guardar para después')+'</button></div><p class="small muted">Tu cuenta Customer es gratuita. Cada negocio define las condiciones de sus beneficios.</p></div></section>';
    if(ctx.account)ctx.request('/explore/publications/'+id+'/events',{type:'OPEN'}).catch(()=>{});
    page.querySelector('#saveOffer').onclick=async e=>{if(!auth())return;e.target.disabled=true;try{await ctx.request('/explore/publications/'+id+'/save',{saved:!saved},'PUT');saved=!saved;e.target.textContent=saved?'♥ Guardado':'♡ Guardar para después';}catch(e){fail(e);}finally{e.target.disabled=false;}};
    page.querySelector('#shareOffer').onclick=async()=>{
     try{
      if(navigator.share)await navigator.share({title:p.title,text:p.business_name+' te espera en Qori',url:p.url});
      else{
       const qr=await ctx.request('/explore/publications/'+id+'/qr'),d=ctx.dialog('Comparte lo bueno','<img class="detail-qr" src="'+esc(qr.qr_image)+'" alt="QR público del beneficio">'+field('url','Enlace para compartir','id="shareUrl" readonly value="'+esc(p.url)+'"')+'<button class="primary" id="copyOffer">Copiar enlace</button>');
       d.querySelector('#copyOffer').onclick=async e=>{try{await navigator.clipboard.writeText(p.url);e.target.textContent='Enlace copiado';}catch{d.querySelector('#shareUrl').select();e.target.textContent='Selecciona y copia el enlace';}};
      }
      if(ctx.account)await ctx.request('/explore/publications/'+id+'/events',{type:'SHARE'});
     }catch(e){if(e.name!=='AbortError')fail(e);}
    };
    page.querySelector('#offerAction').onclick=async e=>{
     if(!auth())return;e.target.disabled=true;
     try{
      if(p.kind==='PRODUCT'){window.QoriProductGifts.buy(p,ctx);return;}
      if(p.kind==='ACTIVITY'){const r=await ctx.request('/explore/publications/'+id+'/launch',{});location.assign(r.url);return;}
      if(pending){location.hash='requests';return;}
      const gift=p.kind==='GIFT',requestId=crypto.randomUUID();
      const fields=gift?field('recipient_name','Nombre de quien recibe','minlength="2" maxlength="160" required')+field('recipient_email','Correo de quien recibe','type="email" required')+field('amount','Valor en COP','type="number" min="'+esc(p.gift_min)+'" max="'+esc(p.gift_max)+'" step="1" required')+'<p>'+esc(p.payment_instructions)+'</p><p class="small">La giftcard queda pendiente hasta que el negocio confirme el pago. Crear la solicitud no cobra dinero.</p>':field('document_id','Tu documento','minlength="3" maxlength="80" required')+'<p class="small">Compartiremos tu nombre, correo y documento con este negocio para verificar tu inscripción. Recibirás una invitación que podrás aceptar o rechazar.</p>';
      const d=ctx.dialog(gift?'Un regalo que se disfruta':'Solicitar '+p.title,'<form id="offerRequest" class="stack">'+fields+'<label class="field">Mensaje opcional<textarea name="message" maxlength="500"></textarea></label><label class="check"><input name="consent" type="checkbox" required><span>'+(gift?'Acepto las condiciones publicadas de esta giftcard.':'Autorizo enviar esta solicitud y mis datos al negocio.')+'</span></label><button class="primary">'+(gift?'Solicitar giftcard':'Enviar solicitud')+'</button></form>');
      d.querySelector('form').onsubmit=async ev=>{ev.preventDefault();ev.stopPropagation();const b=ev.submitter;b.disabled=true;try{const f=Object.fromEntries(new FormData(ev.target));if(gift){await ctx.request('/explore/publications/'+id+'/gift-order',{...f,request_id:requestId,buyer_name:ctx.account.full_name,terms_accepted:true});d.close();location.hash='businesses';await ctx.refresh();}else{await ctx.request('/explore/publications/'+id+'/request',{...f,consent:true});d.close();location.hash='requests';}}catch(e){ctx.showError(e.message,d.querySelector('#dialogError'));}finally{b.disabled=false;}};
     }catch(e){fail(e);}finally{e.target.disabled=false;}
    };return;
   }
   if(route==='requests'){
    if(!auth())return;const data=await ctx.request('/discovery/me');if(!page.isConnected)return;
    const states={PENDING:'El negocio está revisando tu solicitud',INVITED:'Revisa la invitación del negocio',REJECTED:'El negocio no aprobó esta solicitud',CANCELLED:'Solicitud cancelada'};
    page.innerHTML='<div class="page-heading"><div><h1>Mis solicitudes</h1><p>Tú eliges los programas de los que quieres ser parte.</p></div></div>'+(data.requests.map(r=>'<article class="panel"><p class="eyebrow">'+esc(r.business_name)+'</p><h2>'+esc(r.title)+'</h2><p>'+states[r.state]+'</p><a class="secondary" href="'+(r.state==='INVITED'?'#invitations':'#publication/'+r.publication_id)+'">'+(r.state==='INVITED'?'Ver invitaciones':'Ver programa')+'</a></article>').join('')||'<p>Aún no has solicitado un programa. Encuentra el próximo en Explorar.</p>');return;
   }
   if(route.startsWith('business/')){
    const data=await ctx.request('/explore/businesses/'+encodeURIComponent(decodeURIComponent(route.split('/')[1])));if(!page.isConnected)return;
    const b=data.business,favorites=ctx.account?await ctx.request('/favorites'):{places:[]};let followed=favorites.places.some(p=>p.id===b.id);if(!page.isConnected)return;
    page.innerHTML='<a class="back-link" href="#explore">← Todos los beneficios</a><section class="discover-hero merchant-hero"><div><span class="eyebrow">Este negocio es Qori</span><h1>'+esc(b.name)+'</h1><p>'+esc(b.description)+'</p><p>'+esc(b.city)+' · '+esc(b.address)+'</p><button class="secondary" id="followBusiness">'+(followed?'Siguiendo este negocio':'Seguir este negocio')+'</button></div><span class="discover-orbit" aria-hidden="true">Q</span></section><h2>Todo lo que tiene para ti</h2><div class="discovery-grid">'+(data.publications.map(card).join('')||'<p>No hay publicaciones disponibles en este momento.</p>')+'</div>';
    page.querySelector('#followBusiness').onclick=async e=>{if(!auth())return;e.target.disabled=true;try{await ctx.request('/favorites/'+b.id,followed?null:{},followed?'DELETE':'POST');followed=!followed;e.target.textContent=followed?'Siguiendo este negocio':'Seguir este negocio';}catch(e){fail(e);}finally{e.target.disabled=false;}};return;
   }
   const savedOnly=route==='saved';if(savedOnly&&!auth())return;
   page.innerHTML='<section class="discover-hero"><div><span class="eyebrow">Descubre · participa · disfruta</span><h1>¿Aquí son Qori?<br><em>Aquí empieza lo bueno.</em></h1><p>Los beneficios de los negocios que te gustan.<br>Y de los que todavía no conoces.</p><div class="row"><a class="hero-button" href="#scan">Escanear un QR ↗</a>'+(ctx.account?'<a class="hero-link" href="#wallet">Mis beneficios →</a>':'<button class="hero-link" id="joinQori">Obtener mi Qori gratis →</button>')+'</div></div><div class="discover-orbit" aria-hidden="true"><span>✦</span><small>TODO LO BUENO<br>EN UN SOLO LUGAR</small></div></section><div class="discover-heading"><div><span class="eyebrow">Tu próximo descubrimiento</span><h2>'+(savedOnly?'Guardados para ti':'Encuentra algo que te encante')+'</h2></div><a class="quiet" href="#following">Mis favoritos</a><a class="quiet" href="'+(savedOnly?'#explore':'#saved')+'">'+(savedOnly?'Ver todos':'♡ Mis guardados')+'</a></div><form id="exploreSearch" class="discover-search"><input name="search" type="search" placeholder="Un café, un regalo, tu próximo plan…" aria-label="Buscar beneficios o negocios" maxlength="100"><input name="city" placeholder="Ciudad" aria-label="Ciudad" maxlength="100"><button class="primary">Buscar</button></form><div class="discover-chips" aria-label="Tipo de beneficio"><button class="chip active" data-kind="">Todo Qori</button>'+Object.entries(names).map(([k,n])=>'<button class="chip" data-kind="'+k+'">'+marks[k]+' '+n+'</button>').join('')+'</div><p id="feedStatus" role="status"></p><div id="discoveryFeed" class="discovery-grid"></div><button id="moreOffers" class="secondary wide" hidden>Ver más beneficios</button><section class="ecosystem-note"><div><span class="eyebrow">De comprador a parte de algo más</span><h2>Un solo Qori.<br>Todos tus negocios.</h2><p>Guarda tus favoritos, participa en activaciones y reúne tus tarjetas, regalos y premios.</p><button class="secondary" id="installQori">Llevar Qori a mi celular</button></div><div><span class="eyebrow">¿Tienes un negocio?</span><h2>Haz que quieran volver.</h2><p>Publica tus activaciones y conecta tus beneficios con compradores desde Qori Empresa.</p><a class="primary" href="/empresa/">Conocer Qori Empresa →</a></div></section>';
   page.querySelector('.discover-chips').insertAdjacentHTML('beforeend','<a class="chip" href="#directory">Buscar negocios Qori →</a>');
   page.querySelector('#feedStatus').insertAdjacentHTML('beforebegin','<section id="businessResults" hidden><div class="discover-heading"><h2>Negocios Qori</h2><a class="quiet" href="#directory">Ver todos los negocios →</a></div><p id="businessMatchNotice" class="small muted" hidden></p><div id="businessMatches" class="discovery-grid"></div></section>');
   page.querySelector('#joinQori')?.addEventListener('click',ctx.login);
   page.querySelector('#installQori').onclick=async()=>{if(installEvent){await installEvent.prompt();installEvent=null;}else ctx.dialog('Qori siempre a mano','<p>Abre Qori en el navegador de tu celular. En Android, busca <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong> en el menú. En iPhone, abre Compartir y selecciona <strong>Añadir a pantalla de inicio</strong>.</p><p>La disponibilidad depende del navegador. También puedes usar Qori desde esta web.</p>');};
   let kind='',offset=0,loading=false,generation=0;
   async function fill(append=false){
    const version=++generation;loading=true;const f=new FormData(page.querySelector('#exploreSearch')),params=new URLSearchParams({search:f.get('search'),city:f.get('city'),kind,offset:String(append?offset:0)});
    page.querySelector('#feedStatus').textContent='Buscando beneficios…';
    try{
     const findBusinesses=async()=>{
      if(savedOnly||append)return null;
      const terms={search:String(f.get('search')||'').trim(),city:String(f.get('city')||'').trim()};
      const places=await ctx.request('/explore/directory?'+new URLSearchParams(terms));
      if(places.businesses.length||!terms.search||!terms.city)return places;
      const byName=await ctx.request('/explore/directory?'+new URLSearchParams({search:terms.search}));
      return {...byName,outside_city_filter:true};
     };
     const [r,places]=await Promise.all([
      ctx.request(savedOnly?'/discovery/saved?offset='+(append?offset:0):'/explore?'+params),
      findBusinesses()
     ]);
     if(!page.isConnected||version!==generation)return;
     if(!append){
      const section=page.querySelector('#businessResults'),matches=page.querySelector('#businessMatches');
      const businesses=places?.businesses||[];
      section.hidden=!businesses.length;
      const notice=page.querySelector('#businessMatchNotice');notice.hidden=!places?.outside_city_filter;
      notice.textContent=places?.outside_city_filter?'Encontramos estos negocios por nombre. No coinciden con la ciudad seleccionada o todavía no publicaron su ubicación.':'';
      matches.innerHTML=businesses.slice(0,6).map(b=>'<article class="panel"><span class="eyebrow">Este negocio es Qori</span><h3>'+esc(b.name)+'</h3><p>'+esc([b.category,b.city].filter(Boolean).join(' · '))+'</p><a class="primary" href="#business/'+encodeURIComponent(b.slug)+'">Ver negocio →</a></article>').join('');
     }
     const feed=page.querySelector('#discoveryFeed');if(!append)feed.innerHTML='';feed.insertAdjacentHTML('beforeend',r.publications.map(card).join(''));offset=r.next_offset;page.querySelector('#moreOffers').hidden=offset==null;
     page.querySelector('#feedStatus').textContent=feed.children.length?'':!page.querySelector('#businessResults').hidden?'No hay beneficios publicados para esta búsqueda. Puedes visitar el perfil del negocio y seguirlo.':'No encontramos publicaciones disponibles. Prueba otra búsqueda o vuelve pronto.';
    }catch(e){fail(e);}finally{loading=false;}
   }
   page.querySelector('#exploreSearch').onsubmit=e=>{e.preventDefault();e.stopPropagation();fill();};
   page.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;page.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('active',x===b));fill();});
   if(savedOnly){page.querySelector('#exploreSearch').hidden=true;page.querySelector('.discover-chips').hidden=true;}
   page.querySelector('#moreOffers').onclick=()=>{if(!loading)fill(true);};await fill();
  }catch(e){fail(e);if(page.isConnected)page.insertAdjacentHTML('beforeend','<a class="secondary" href="#explore">Volver a Explorar</a>');}
 }
 function scanner(page,ctx){
  page.innerHTML='<div class="page-heading"><div><h1>Escanea. Descubre. Disfruta.</h1><p>Apunta al QR público de una activación o programa Qori.</p></div></div><section class="scanner-panel panel"><div class="scanner-view"><video id="qoriCamera" playsinline muted></video><div class="scanner-frame" aria-hidden="true"></div></div><p id="scanStatus" role="status">Activa tu cámara para escanear.</p><button class="primary" id="startCamera">Abrir cámara</button><button class="secondary" id="stopCamera" hidden>Detener cámara</button><hr><form id="scanLink" class="stack">'+field('url','También puedes pegar el enlace del QR','required maxlength="2000" placeholder="https://gosqori.com/…"')+'<button class="secondary">Abrir beneficio</button></form><label class="field">O selecciona una imagen del QR<input id="qrFile" type="file" accept="image/*"></label><p class="small muted">Los tickets personales para canjear están en Mis tarjetas.</p></section>';
  let stream,raf,running=false,decoding=false,last=0;const video=page.querySelector('video'),status=page.querySelector('#scanStatus'),canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
  function stop(){running=false;cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;page.querySelector('#startCamera').hidden=false;page.querySelector('#stopCamera').hidden=true;}
  cleanup=()=>{stop();window.removeEventListener('pagehide',stop);};window.addEventListener('pagehide',stop);
  async function resolve(value){try{const r=await ctx.request('/explore/resolve',{url:value});stop();location.hash=r.hash;}catch(e){status.textContent=e.message;}}
  async function decoder(){if(window.jsQR)return;let script=document.querySelector('script[data-qr-decoder]');if(!script){script=document.createElement('script');script.src='/vendor/jsqr/jsQR.js';script.dataset.qrDecoder='1';document.head.append(script);await new Promise((r,j)=>{script.onload=r;script.onerror=()=>{script.remove();j(Error('No pudimos cargar el lector.'));};});}if(!window.jsQR)throw Error('El lector está cargando.');}
  function read(source,w,h){const ratio=Math.min(1,900/Math.max(w,h));canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);context.drawImage(source,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height);return window.jsQR(pixels.data,pixels.width,pixels.height)?.data;}
  function tick(now){if(!running)return;if(now-last>450&&video.readyState>=2&&!decoding){last=now;const value=read(video,video.videoWidth,video.videoHeight);if(value){decoding=true;resolve(value).finally(()=>setTimeout(()=>{decoding=false;},2500));}}raf=requestAnimationFrame(tick);}
  page.querySelector('#startCamera').onclick=async e=>{e.target.disabled=true;try{await decoder();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(!page.isConnected){stop();return;}video.srcObject=stream;await video.play();running=true;e.target.hidden=true;page.querySelector('#stopCamera').hidden=false;status.textContent='Centra el QR dentro del recuadro.';raf=requestAnimationFrame(tick);}catch{status.textContent='No pudimos abrir la cámara. Revisa sus permisos o pega el enlace del QR.';stop();}finally{e.target.disabled=false;}};
  page.querySelector('#stopCamera').onclick=()=>{stop();status.textContent='Cámara detenida.';};
  page.querySelector('#scanLink').onsubmit=e=>{e.preventDefault();e.stopPropagation();resolve(new FormData(e.target).get('url'));};
  page.querySelector('#qrFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>15000000){status.textContent='Selecciona una imagen de hasta 15 MB.';return;}try{await decoder();const bitmap=await createImageBitmap(file),value=read(bitmap,bitmap.width,bitmap.height);bitmap.close();if(value)await resolve(value);else status.textContent='No encontramos un QR en esta imagen.';}catch{status.textContent='No pudimos leer esta imagen. Prueba otra o pega el enlace.';}};
 }
 window.QoriExplore={render,stop(){cleanup();cleanup=()=>{};}};
 if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/customer/sw.js',{scope:'/customer/'}).catch(()=>{}));
})();

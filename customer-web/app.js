/* Same-origin web client. Authentication stays in an HttpOnly cookie. */
(() => {
  'use strict';
  const app=document.getElementById('app'),model=window.QoriWallet;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value||0));
  const date=value=>value?new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'';
  const statusNames={ACTIVE:'En progreso',READY:'Beneficio disponible',ARCHIVED:'Finalizada',EXPIRED:'Vencida',PAUSED:'En pausa',PENDING:'Por aceptar',REVIEW:'En revisión'};
  const giftNames={PENDING_PAYMENT:'Pendiente de pago al negocio',ISSUED:'Emitida',CANCELLED:'Cancelada'};
  const state={account:null,cards:[],relationships:[],orders:[],updated:null,search:'',kind:'ALL',status:'ACTIVE',challenge:null,email:'',consent:false,loading:false};
  const registrationComplete=()=>!!(state.account?.full_name?.trim()&&state.account?.declared_document_key);
  let renderVersion=0,dialogVersion=0,returnFocus=null,booting=true;
  const sessionGuard=window.QoriSessionGuard.create(()=>clearPrivateState('La sesión cambió en este navegador. Entra de nuevo para continuar.'));
  function broadcastSession(){try{localStorage.setItem('qori-session-change',crypto.randomUUID());}catch{}navigator.serviceWorker?.controller?.postMessage({type:'QORI_SESSION_CHANGED'});}
  function clearPrivateState(message=''){
    sessionGuard.reset();renderVersion++;closeDialog();returnFocus=null;
    window.QoriExplore?.stop();window.QoriNotifications?.stop();
    navigator.serviceWorker?.controller?.postMessage({type:'QORI_SESSION_CHANGED'});
    for(const key of Object.keys(state))delete state[key];
    Object.assign(state,{account:null,cards:[],relationships:[],orders:[],books:[],bookId:null,updated:null,search:'',kind:'ALL',status:'ACTIVE',challenge:null,email:'',consent:false,loading:false});
    announce('');renderAuth(message);
    navigator.serviceWorker?.getRegistration('/customer/').then(r=>r?.getNotifications()).then(items=>items?.forEach(n=>n.close())).catch(()=>{});
  }
  const brand=()=>'<div class="brand-block"><a class="brand" href="/customer/" aria-label="Qori Customer"><img class="brand-logo" src="/img/qori-logo-fabrica-ingresos.png?v=brand-20261104" alt="Qori · Tu fábrica de ingresos" width="156" height="88"></a><span class="brand-sub">Customer</span></div>';
  const route=()=>{const value=location.hash.slice(1);return ['home','directory','place-requests','explore','scan','wallet','benefits','businesses','invitations','me','profile','saved','requests','earned','following','product-gifts','finances','history','planning','payments','purchases','debts','debt-simulator','groceries','wealth','pockets','income','dreams','recover-benefits','gift-shop','notifications','calculator'].includes(value)||/^(publication|business|groceries|dreams)\//.test(value)?value:'home';};
  const catalogRoute=()=>['explore','scan','gift-shop'].includes(route())||/^(publication|business)\//.test(route());
  const exploreRoute=()=>catalogRoute()||['saved','requests','earned','following'].includes(route());
  function exploreContext(){const book=state.books?.find(b=>b.id===state.bookId),session=sessionGuard.snapshot();return {request:(path,body,method)=>request(path,body,method,book?.id,session),refresh,selectBook,book,books:state.books||[],openCard,dialog,showError,account:state.account?{...state.account,currency:book?.currency||state.account.currency}:null,cards:state.cards,invitationCount:state.invitationCount,openSale:id=>window.QoriFinance.openSale(id,exploreContext()),login:()=>renderAuth()};}
  async function selectBook(id,nextRoute){closeDialog();state.bookId=id;const url=new URL(location.href);url.searchParams.set("book",id);if(nextRoute)url.hash=nextRoute;else if(route().startsWith('groceries/'))url.hash='groceries';else if(route().startsWith('dreams/'))url.hash='dreams';history.replaceState(null,"",url.href);try{if(window.QoriCookies?.preferencesAllowed())localStorage.setItem('qori-book:'+state.account.id,id);}catch{}await refresh();}
  const announce=text=>{document.getElementById('announcement').textContent=text;};
  async function request(path,body,method=body?'POST':'GET',bookId=state.bookId,session=sessionGuard.snapshot()){
    const ticket=sessionGuard.start(session),controller=ticket.controller,timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch('/api/customer'+path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json','X-Qori-Web':'1',...(session.accountId?{'X-Qori-Account':session.accountId}:{}),...(bookId?{'X-Qori-Book':bookId}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const data=await response.json().catch(()=>({error:{message:'No pudimos leer la respuesta. Inténtalo de nuevo.'}}));
      sessionGuard.check(ticket,response);
      if(!response.ok){
        if(response.status===401&&state.account&&!path.startsWith('/auth/'))clearPrivateState('Tu sesión venció. Entra de nuevo para ver tus datos.');
        const error=Error(data.error?.message||'No pudimos completar la operación.');error.status=response.status;throw error;
      }
      return data;
    }catch(error){if(error.name==='AbortError')throw Error('La conexión está tardando. Inténtalo de nuevo.');if(error instanceof TypeError)throw Error('No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.');throw error;}
    finally{clearTimeout(timer);sessionGuard.finish(ticket);}
  }
  function showError(message,target=document.getElementById('pageError')){if(target){target.textContent=message;target.focus?.();}announce(message);}
  const field=(name,label,value='',extra='')=>`<label class="field">${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
  function renderAuth(error=''){
    if(window.QoriAuthAccess){
      window.QoriExplore?.stop();window.QoriNotifications?.stop();
      const params=new URLSearchParams(location.search);
      if(params.has('auth_error')){error=error||'No se completó el acceso con el proveedor. Inténtalo de nuevo o usa tu correo.';params.delete('auth_error');history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);}
      return window.QoriAuthAccess.render(app,authContext(),error);
    }
    const verifying=!!state.challenge;
    app.innerHTML=`<div class="auth-layout"><section class="auth-story">${brand()}<div><div class="eyebrow">Tu cuenta gratuita de comprador</div><h1>Tu dinero.<br>Tus planes.<br><em>En orden.</em></h1><p>Organiza ingresos, gastos y compromisos. Separa el dinero personal, el de tu casa y el de tus proyectos.</p>
      <div class="auth-art" aria-hidden="true"><div class="sample-card"><div class="eyebrow">Qori cuida tu bolsillo</div><h3>Cada peso,<br>en su lugar.</h3><div class="sample-dots"><span>✓</span><span>✓</span><span>✓</span><span>✓</span><span>5</span><span>6</span></div><p>Una contabilidad para cada parte de tu vida.</p></div><div class="art-note">Tus finanzas primero. Tus beneficios contigo.</div></div></div><div class="auth-foot">Qori Customer + Qori Empresa<br>Conectados para que volver tenga más valor.</div></section>
      <main id="main" class="auth-side"><div class="auth-form-wrap"><span class="pill">${verifying?'Paso 2 · Verifica tu correo':'Paso 1 · Tu correo'}</span><h2>${verifying?'Revisa tu correo':'Tu vida Qori empieza aquí'}</h2>
      <p class="muted small">${verifying?`Enviamos un código de 6 dígitos a <strong>${esc(state.email)}</strong>. Vence en 10 minutos. Aún no has iniciado sesión; introduce el código para continuar.`:'Crea tu cuenta o entra con tu correo. Con verificación de correo, sin tarjeta bancaria y sin mensualidad.'}</p>
      <form id="${verifying?'verifyForm':'emailForm'}" class="stack">${verifying?field('code','Código de verificación','','class="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6" required autofocus'):
        `${field('email','Tu correo electrónico',state.email,'type="email" autocomplete="email" placeholder="tu@correo.com" maxlength="180" required')}<label class="check"><input type="checkbox" name="consent" required ${state.consent?'checked':''}><span>Quiero crear o usar mi cuenta gratuita y he leído <a href="privacidad.html" target="_blank" rel="noopener">cómo se usan mis datos</a>.</span></label>`}
      <p class="error" id="authError" role="alert">${esc(error)}</p><button class="primary wide" type="submit">${verifying?'Validar código e iniciar sesión':'Enviar código de verificación'} <span aria-hidden="true">→</span></button></form>
      ${verifying?'<div class="row"><button class="quiet" data-action="change-email">Cambiar correo</button><button class="quiet" data-action="resend">Reenviar código</button></div>':'<div class="divider"></div><p class="small muted">¿Ya tienes cuenta Qori Customer? Usa el mismo correo y encontrarás tus tarjetas.</p>'}
      <div class="auth-links"><a href="/empresa/">Soy un negocio</a><a href="privacidad.html">Privacidad y tu cuenta</a><button type="button" class="qcp-settings-link" data-cookie-settings>Configurar cookies</button></div></div></main></div>`;
    if(verifying)app.querySelector('[name="code"]')?.focus();
  }
  function authContext(){return {state,request,brand,open:()=>renderAuth(),adopt:account=>{sessionGuard.adopt(account.id);state.account=account;},enter:async account=>{
    sessionGuard.adopt(account.id);broadcastSession();state.account=account;state.bookId=null;state.challenge=null;state.authMode='login';
    const destination=['recover-benefits','gift-shop','product-gifts','invitations'].includes(route())||route().startsWith('publication/')?'#'+route():'#home';history.replaceState(null,'',destination);await refresh();announce('Bienvenido a tu cuenta Qori.');
  }};}
  async function loadAccount(){const data=await request('/me');sessionGuard.adopt(data.account.id);state.account=data.account;state.bookId=null;try{state.bookId=new URLSearchParams(location.search).get('book')||(window.QoriCookies?.preferencesAllowed()?localStorage.getItem('qori-book:'+state.account.id):null);}catch{}}
  async function refresh({render=true}={}){
    const version=++renderVersion;
    const identity=await request('/me');
    if(version!==renderVersion||!state.account)return;
    state.account=identity.account;
    if(!registrationComplete()){if(render)renderApp();return;}
    const [wallet,links,financial]=await Promise.all([request('/wallet/overview'),request('/relationships'),request('/finance-books')]);
    if(version!==renderVersion||!state.account)return;
    state.account=identity.account;state.books=financial.books;if(!state.books.some(b=>b.id===state.bookId))state.bookId=state.books.find(b=>b.is_default)?.id;state.cards=wallet.cards;state.orders=wallet.purchased_gifts;state.updated=wallet.updated_at;state.relationships=links.relationships;
    state.pendingBenefits=wallet.pending_benefits||[];state.invitationCount=wallet.pending_invitations||0;
    if(render)renderApp();
  }
  const navPaths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
    finances:'<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
    purchases:'<path d="M3 3h2l3 12h10l3-8H6M9 20h.01M18 20h.01"/>',
    wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 5h5M6 2h12"/>',
    invitations:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    scan:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0v3h3v-3"/>',
    profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
  };
  navPaths.dreams='<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>';
  navPaths.groceries='<path d="m3 5 2 2 3-3M11 6h10M3 12l2 2 3-3M11 13h10M3 19l2 2 3-3M11 20h10"/>';
  const navIcon=id=>'<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+(navPaths[id]||navPaths.profile)+'</svg></span>';
  function navLink(id,icon,title){const active=route()===id||(id==='wallet'&&['recover-benefits','product-gifts'].includes(route()))||(id==='explore'&&route()==='gift-shop')||(id==='home'&&route()==='pockets')||(id==='dreams'&&route().startsWith('dreams/'))||(id==='groceries'&&route().startsWith('groceries/'))||(id==='finances'&&['income','wealth','debts','debt-simulator','history','payments','planning'].includes(route()));return `<a class="nav-link ${active?'active':''}" href="#${id}" ${active?'aria-current="page"':''}>${navIcon(id)}${title}</a>`;}
  function renderApp(){
    window.QoriExplore?.stop();
    if(booting)return;
    if(location.hash==='#oauth-connect')return renderAuth();
    if(!state.account)return renderAuth();
    if(!registrationComplete())return onboarding();
    if(!state.books?.length){app.innerHTML='<main id="main" class="boot"><h1>Mis finanzas</h1><p id="pageError" role="alert">No pudimos cargar tus contabilidades.</p><button class="primary" id="retryBookLoad">Reintentar</button></main>';app.querySelector('#retryBookLoad').onclick=()=>refresh().catch(e=>showError(e.message));return;}
    const name=state.account.full_name.split(' ')[0];
    app.innerHTML=`<div class="layout"><aside class="sidebar">${brand()}<nav aria-label="Mi cuenta">${navLink('wallet','▤','Mis tarjetas')}${navLink('benefits','✦','Beneficios')}${navLink('businesses','⌂','Mis negocios')}${navLink('me','▦','Mi Qori')}</nav><div class="sidebar-foot"><strong>Volver tiene sus beneficios.</strong>Tu cuenta es gratuita.<br>Los puntos y premios pertenecen a cada negocio.<div class="divider"></div><a href="privacidad.html">Privacidad</a><br><button type="button" class="qcp-settings-link" data-cookie-settings>Configurar cookies</button></div></aside>
      <div class="workspace"><header class="topbar"><span class="breadcrumb">Qori Customer <span aria-hidden="true">/</span> Tu espacio personal</span><div class="row"><a class="gift-inbox" href="#notifications" aria-label="Notificaciones">${navIcon('invitations')}<span data-benefit-badge>Avisos</span></a><a class="gift-inbox" href="#invitations" aria-label="Mis invitaciones">${navIcon('invitations')}Invitaciones${state.invitationCount?' ('+state.invitationCount+')':''}</a><a class="profile-button" href="#profile"><span class="avatar">${esc(name.slice(0,1).toUpperCase())}</span><span>${esc(name)}</span></a></div></header>
      <main id="main" class="content"><p id="pageError" class="error" role="alert" tabindex="-1"></p><div id="page"></div></main></div></div>`;
    const page=document.getElementById('page');
    const nav=app.querySelector('.sidebar nav');
    nav.innerHTML=navLink('home','⌂','Mi dinero')+navLink('finances','◷','Mis finanzas')+navLink('groceries','▤','Mercado y hogar')+navLink('purchases','▤','Antojos')+navLink('dreams','✧','Sueños')+navLink('explore','✦','Beneficios')+navLink('wallet','▤','Mis tarjetas');
    window.QoriAccounting.selector(app,exploreContext());
    window.QoriNotifications?.watch(exploreContext());
    if(route()==='calculator')window.QoriCalculator.render(page,exploreContext());
    else if(route()==='history')window.QoriMovementHistory.render(page,exploreContext());
    else if(route()==='notifications')window.QoriNotifications.render(page,exploreContext());
    else if(route()==='gift-shop')window.QoriGiftShop.render(page,exploreContext());
    else if(route()==='recover-benefits')window.QoriBenefitRecovery.render(page,exploreContext());
    else if(route()==='home')window.QoriAccounting.render(page,exploreContext());
    else if(route()==='directory')window.QoriPortal.directory(page,exploreContext());
    else if(route()==='place-requests')window.QoriPortal.placeRequests(page,exploreContext());
    else if(exploreRoute())window.QoriExplore.render(page,exploreContext(),route());
    else if(['wallet','benefits'].includes(route())){renderWallet(page);}
    else if(route().startsWith('groceries'))window.QoriGroceries.render(page,exploreContext(),route());
    else if(route()==='dreams'||route().startsWith('dreams/'))window.QoriDreams.render(page,exploreContext(),route());
    else if(route()==='income')window.QoriIncome.render(page,exploreContext());
    else if(route()==='pockets')window.QoriPockets.render(page,exploreContext());
    else if(route()==='wealth')window.QoriWealth.render(page,exploreContext());
    else if(route()==='purchases')window.QoriPurchases.render(page,exploreContext());
    else if(route()==='payments')window.QoriPayments.render(page,exploreContext());
    else if(['debts','debt-simulator'].includes(route()))window.QoriDebts.render(page,exploreContext(),route());
    else if(['finances','history','planning'].includes(route()))window.QoriFinance.render(page,exploreContext(),route());
    else if(route()==='invitations')window.QoriInvitations.render(page,exploreContext());
    else if(route()==='product-gifts')window.QoriProductGifts.render(page,exploreContext());
    else if(route()==='businesses')renderBusinesses(page);
    else if(route()==='me')renderIdentity(page);
    else {renderProfile(page);page.insertAdjacentHTML('afterbegin','<div class="account-shortcuts"><a class="secondary" href="#me">Mi QR Qori</a><a class="secondary" href="#businesses">Mis negocios y giftcards</a><a class="secondary" href="#finances">Mis finanzas</a><a class="secondary" href="#history">Mis movimientos</a><a class="secondary" href="#product-gifts">Mis regalos</a><a class="secondary" href="#requests">Mis solicitudes</a><a class="secondary" href="#saved">Guardados</a><a class="secondary" href="#following">Negocios que sigo</a></div>');}
  }
  function onboarding(){
    app.innerHTML=`<main id="main" class="auth-side boot"><div class="auth-form-wrap">${brand()}<span class="pill">Último paso · Tus datos</span><h2>Completa tu registro.</h2><p class="muted">Tu nombre y tu cédula son obligatorios para abrir tu cuenta Qori Customer. Confirma tu cédula antes de continuar: después no podrás cambiarla.</p><form id="profileForm" class="stack">${field('full_name','Tu nombre completo',state.account.full_name,'autocomplete="name" minlength="2" maxlength="100" required')}${window.QoriBenefitRecovery.documentFields(state.account)}<details class="recovery-onboarding"><summary>Conectar mis beneficios anteriores (opcional)</summary><p>Buscaremos los registros que coincidan con tu cédula y tu correo verificado. También puedes hacerlo después.</p><label class="check"><input type="checkbox" name="recover_consent"><span>Autorizo conectar mis beneficios anteriores cuando se verifiquen mis datos.</span></label></details><p id="pageError" class="error" role="alert" tabindex="-1"></p><button class="primary" type="submit">Completar registro y entrar →</button></form><p class="small muted">${esc(state.account.email)}</p><button type="button" class="quiet" data-action="logout">Cerrar sesión y continuar después</button></div></main>`;
  }
  function renderWallet(page){
    const benefits=route()==='benefits',count=model.counts(state.cards),pending=state.relationships.filter(r=>r.state==='PENDING'&&new Date(r.expires_at)>new Date());
    page.innerHTML=`<div class="page-heading"><div><h1>${benefits?'Lo bueno de volver':'Mis tarjetas'}</h1><p>${benefits?'Tus beneficios disponibles, reunidos aquí.':'Cada negocio, sus programas. Todos en tu cuenta.'}</p></div><button class="secondary" data-action="refresh" aria-label="Actualizar tarjetas">↻ Actualizar</button></div>
      ${pending.length?`<div class="notice"><p><strong>${pending.length} ${pending.length===1?'negocio quiere':'negocios quieren'} conectar contigo.</strong><br>Revisa las solicitudes para reunir tus tarjetas.</p><a class="secondary" href="#businesses">Ver solicitudes →</a></div>`:''}
      ${!benefits?`<section class="hero"><div><div class="eyebrow">Hola, ${esc(state.account.full_name.split(' ')[0])}</div><h2>Todo lo que ganas al volver.</h2><p>Menos enlaces guardados. Más espacio para disfrutar tus sellos, puntos y beneficios.</p></div><div class="hero-emblem" aria-hidden="true">✦</div></section><div class="stats"><div class="stat"><span>Tarjetas activas</span><strong>${count.active}</strong></div><div class="stat"><span>Beneficios disponibles</span><strong>${count.ready}</strong></div><div class="stat"><span>Negocios en tu tarjetero</span><strong>${count.businesses}</strong></div></div>`:''}
      ${!benefits?`<div class="tabs" aria-label="Estado de las tarjetas">${[['ACTIVE','Mis tarjetas'],['READY','Disponibles'],['HISTORY','Historial'],['ALL','Todas']].map(([value,label])=>`<button class="tab" data-action="filter-status" data-status="${value}" aria-pressed="${state.status===value}">${label}</button>`).join('')}</div>`:''}
      <div class="toolbar"><input class="search" id="walletSearch" type="search" placeholder="Buscar un negocio o programa…" aria-label="Buscar negocio o programa" value="${esc(state.search)}"><select class="filter" id="walletKind" aria-label="Tipo de tarjeta">${[['ALL','Todas las tarjetas'],['STAMP','Sellos'],['POINTS','Afiliaciones y puntos'],['GIFT','Giftcards'],['TICKET','Tickets de activación'],['USER_GIFT','Regalos de personas']].map(([value,label])=>`<option value="${value}" ${state.kind===value?'selected':''}>${label}</option>`).join('')}</select></div><div id="cardGroups"></div><p class="last-update">Actualizado ${state.updated?new Date(state.updated).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}):''}. Los cambios se reflejan al actualizar o volver a esta página.</p>`;
    page.insertAdjacentHTML('afterbegin','<div class="account-shortcuts"><a class="secondary" href="#earned">Mis actividades</a><a class="secondary" href="#benefits">Disponibles</a><a class="secondary" href="#finances">Mis finanzas</a><a class="secondary" href="#history">Mis movimientos</a><a class="secondary" href="#product-gifts">Mis regalos</a><a class="secondary" href="#requests">Mis solicitudes</a><a class="secondary" href="#me">Mi QR Qori</a></div>');
    page.insertAdjacentHTML('afterbegin','<a class="secondary wide" href="#businesses">Mis negocios · beneficios, regalos y compras →</a>'+(window.QoriBenefitRecovery?.banner()||''));
    if(state.invitationCount)page.insertAdjacentHTML('afterbegin','<section class="panel"><h2>Tienes beneficios por aceptar</h2><p>Revisa tus '+state.invitationCount+' invitaciones para agregar las nuevas tarjetas y regalos.</p>'+state.pendingBenefits.map(i=>'<p><strong>'+esc(i.business_name)+'</strong> · '+esc(i.title)+'</p>').join('')+'<a class="primary" href="#invitations">Ver beneficios recibidos</a></section>');
    if(state.recoveryMessage){const note=document.createElement('p');note.className='success';note.setAttribute('role','status');note.textContent=state.recoveryMessage;page.prepend(note);state.recoveryMessage=null;}
    renderGroups();
  }
  function renderGroups(){
    const host=document.getElementById('cardGroups');if(!host)return;
    const groups=model.groups(state.cards,{search:state.search,kind:state.kind,status:route()==='benefits'?'READY':state.status});
    if(!groups.length){host.innerHTML=`<section class="empty"><div class="empty-mark" aria-hidden="true">▤</div><h2>${!state.cards.length?'Tus beneficios tienen un nuevo hogar.':'No hay tarjetas en esta vista.'}</h2><p>${!state.cards.length?'Si ya tienes tarjetas, recupéralas con tu cédula y el correo registrado en el negocio. También puedes mostrar tu QR para conectar.':'Prueba con otro negocio, tipo de tarjeta o estado. Tus tarjetas finalizadas están en Historial.'}</p>${!state.cards.length?'<a class="primary" href="#recover-benefits">Recuperar mis tarjetas anteriores →</a>':'<button class="secondary" data-action="clear-filters">Ver todas mis tarjetas</button>'}</section>`;return;}
    host.innerHTML=groups.map(group=>'<details class="business-vault" '+(groups.length===1?'open':'')+'><summary><span class="business-mark">'+esc(group.name.slice(0,1))+'</span><span><strong>'+esc(group.name)+'</strong><small>'+group.cards.length+' beneficios en esta vista</small></span></summary><div class="business-vault-body">'+window.QoriBusinessWallet.sections(group.cards,cardMarkup)+'<a class="secondary" href="#businesses">Compras y conexión con mis negocios</a></div></details>').join('');
  }
  function cardMarkup(card){
    if(card.kind==='TICKET')return `<article class="loyalty-card"><div class="card-art ticket"><div class="card-kicker">${card.sender_name?esc("Regalo de "+card.sender_name):"Ticket de activación"}</div><h3>${esc(card.title)}</h3><div class="amount" aria-hidden="true">✦</div></div><div class="card-body"><span class="pill ${card.status==='READY'?'gold':'gray'}">${statusNames[card.status]}</span><p>${card.sender_name?esc(card.gift_message||"Un detalle para ti, ya pagado."): "Tu beneficio obtenido en una actividad de este negocio."}</p>${card.expires_at?`<p>Vence ${date(card.expires_at)}</p>`:''}<button class="open-card" data-action="open-card" data-kind="TICKET" data-id="${esc(card.id)}">Ver mi ticket ↗</button></div></article>`;
    const percent=card.kind==='STAMP'?Math.min(100,Math.max(0,card.stamps/card.goal*100)):0;
    const dots=card.kind==='STAMP'?`<div class="dots" aria-label="${card.stamps} de ${card.goal} sellos">${Array.from({length:Math.min(10,card.goal)},(_,i)=>`<span class="dot ${i<card.stamps?'filled':''}" aria-hidden="true">${i<card.stamps?'✓':i+1}</span>`).join('')}${card.goal>10?`<span class="small">+${card.goal-10}</span>`:''}</div><div class="progress" aria-hidden="true"><span style="width:${percent}%"></span></div>`:
      `<div class="amount">${card.kind==='POINTS'?`${Number(card.points).toLocaleString('es-CO')} <span class="small">puntos</span>`:money(card.balance)}</div>`;
    return `<article class="loyalty-card"><div class="card-art ${card.kind==='POINTS'?'points':card.kind==='GIFT'?'gift':''}"><div class="card-kicker">${card.kind==='STAMP'?'Tarjeta de sellos':card.kind==='POINTS'?'Afiliación Qori':'Giftcard'}</div><h3>${esc(card.title)}</h3>${dots}</div><div class="card-body"><div class="card-meta"><span class="pill ${card.status==='READY'?'gold':model.historical(card)?'gray':''}">${statusNames[card.status]||esc(card.status)}</span>${card.kind==='STAMP'?`<span>${card.stamps} / ${card.goal} sellos</span>`:''}</div><p>${esc(card.reward||(card.kind==='POINTS'?'Tus puntos y premios en este establecimiento.':'Saldo para disfrutar en este negocio.'))}</p>${card.expires_at?`<p>Vence ${date(card.expires_at)}</p>`:''}<button class="open-card" data-action="open-card" data-kind="${card.kind}" data-id="${esc(card.id)}">${card.status==='READY'?'Ver mi beneficio':'Ver tarjeta y detalle'}<span aria-hidden="true">↗</span></button></div></article>`;
  }
  function renderBusinesses(page){return window.QoriBusinessWallet.render(page,exploreContext(),cardMarkup);}
  async function renderIdentity(page){
    page.innerHTML=`<div class="page-heading"><div><h1>Un solo Qori para ti</h1><p>Tu identificación para conectar todos tus negocios.</p></div></div><div class="qr-layout"><section class="panel qr-panel"><span class="pill">Mi Qori</span><h2>${esc(state.account.full_name)}</h2><div id="identityQr" role="status">Preparando tu QR…</div><p class="public-id">${esc(state.account.public_id)}</p><button class="secondary" data-action="copy-id">Copiar identificación</button><p class="small">Este QR identifica tu cuenta. Cada conexión necesita tu confirmación.</p></section><section class="panel"><h2>De muchas tarjetas a un solo lugar.</h2><ol class="steps"><li><div><strong>Muestra tu QR en el negocio.</strong><span>El equipo abre «Conectar Qori Customer» en Qori Empresa y verifica tu documento.</span></div></li><li><div><strong>Confirma la conexión.</strong><span>En Mis negocios revisas la solicitud y eliges incorporar también tus tarjetas anteriores.</span></div></li><li><div><strong>Disfruta tus programas organizados.</strong><span>Sus sellos, puntos y beneficios se reúnen aquí. No necesitas conectar cada tarjeta por separado.</span></div></li></ol><a class="primary wide" href="#businesses">Revisar mis conexiones →</a></section></div>`;
    try{const data=await request('/identification');const host=document.getElementById('identityQr');if(host)host.innerHTML=`<img src="${esc(data.qr_image)}" alt="Tu QR personal para conectar Qori Customer">`;}catch(e){showError(e.message);}
  }
  async function renderProfile(page){
    page.innerHTML=`<div class="page-heading"><div><h1>Mi cuenta</h1><p>Tu espacio personal, gratuito y bajo tu control.</p></div></div><div class="profile-grid"><section class="panel"><h2>Tus datos</h2><p><a class="secondary" href="#recover-benefits">Mi cédula y beneficios anteriores →</a></p><form id="profileForm" class="stack">${field('full_name','Nombre completo',state.account.full_name,'minlength="2" maxlength="100" autocomplete="name" required')}<label class="field">Correo verificado<input value="${esc(state.account.email)}" type="email" readonly></label>${window.QoriPortal.preferences(state.account)}<button class="primary">Guardar cambios</button></form><p id="profileSuccess" class="success" role="status"></p></section><section class="panel"><h2>Tu sesión</h2><p>Los negocios solo ven la información de su relación contigo. No pueden consultar tus tarjetas de otros establecimientos.</p><div id="sessions">Cargando sesiones…</div><button class="secondary wide" data-action="logout">Cerrar mi sesión</button><div class="divider"></div><button class="quiet" data-action="export">Descargar mis datos</button><p class="small"><a href="privacidad.html">Cómo funciona tu cuenta y tus datos</a></p><button type="button" class="qcp-settings-link" data-cookie-settings>Configurar cookies</button><button class="quiet" data-action="delete-account">Eliminar mi cuenta personal</button></section></div>`;
    window.QoriAuthAccess?.security(page,authContext());
    try{const data=await request('/sessions');const host=document.getElementById('sessions');if(host)host.innerHTML=data.sessions.filter(s=>new Date(s.expires_at)>new Date()).map(s=>`<div class="session-row"><div>${esc(s.device_name)}<br><span class="muted">${s.id===data.current?'Esta sesión':'Desde '+date(s.created_at)}</span></div>${s.id===data.current?'':'<button class="quiet" data-action="revoke-session" data-id="'+esc(s.id)+'">Cerrar</button>'}</div>`).join('');}catch(e){showError(e.message);}
  }
  function closeDialog(){dialogVersion++;document.getElementById('customerDialog')?.close();document.getElementById('customerDialog')?.remove();returnFocus?.focus?.();}
  function dialog(title,html){
    const prior=document.getElementById('customerDialog');if(!prior)returnFocus=document.activeElement;else prior.remove();
    const d=document.createElement('dialog');d.id='customerDialog';d.className='detail-dialog';d.setAttribute('aria-labelledby','detailTitle');
    d.innerHTML=`<header class="dialog-head"><h2 id="detailTitle">${esc(title)}</h2><button class="dialog-close" data-action="close-dialog" aria-label="Cerrar">×</button></header><div class="dialog-body">${html}<p id="dialogError" class="error" role="alert"></p></div>`;
    document.body.append(d);d.addEventListener('close',()=>{d.remove();if(state.account&&['wallet','benefits'].includes(route())){const page=document.getElementById('page');if(page)renderWallet(page);}returnFocus?.focus?.();});d.showModal();return d;
  }
  async function openCard(kind,id){
    const version=++dialogVersion,d=dialog('Tu tarjeta','<p role="status">Cargando tu tarjeta…</p>');
    try{
      const path=kind==='STAMP'?'/wallet/cards/':kind==='POINTS'?'/wallet/affiliations/':kind==='TICKET'?'/wallet/tickets/':'/wallet/gifts/';
      const data=await request(path+encodeURIComponent(id));if(version!==dialogVersion||!d.open)return;
      d.querySelector('#detailTitle').textContent=kind==='STAMP'?data.program.name:data.card.business_name||'Tu tarjeta';
      const body=d.querySelector('.dialog-body');body.innerHTML=(kind==='STAMP'?stampDetail(id,data):kind==='POINTS'?pointsDetail(id,data):kind==='TICKET'?`<p class="eyebrow">${esc(data.card.business_name)}</p><h3>${esc(data.card.title)}</h3>${data.card.sender_name?`<p>Regalo de <strong>${esc(data.card.sender_name)}</strong></p><blockquote>${esc(data.card.gift_message||"Un detalle para ti.")}</blockquote><p>Este producto ya está pagado. Canjéalo sin pagar de nuevo.</p>`:""}<p>${data.card.qr_image?'Presenta este QR en el negocio para usar el beneficio.':'Este ticket ya no está disponible para canjear.'}</p>${data.card.qr_image?`<img class="detail-qr" src="${esc(data.card.qr_image)}" alt="QR de tu ticket"><a class="primary wide" href="${esc(data.card.benefit_url)}">Abrir beneficio y condiciones →</a>`:''}<p>${data.card.expires_at?'Vence '+date(data.card.expires_at):''}</p>`:giftDetail(id,data))+'<p id="dialogError" class="error" role="alert"></p>';
    }catch(e){if(d.open)showError(e.message,d.querySelector('#dialogError'));}
  }
  function stampDetail(id,data){
    const cycle=data.cycles[0],expired=new Date(cycle.expires_at)<=new Date(),ready=cycle.stamps>=cycle.rules.stamps_required;
    return `<p class="eyebrow">${esc(data.business.name)}</p><div class="card-art"><h2>${esc(cycle.rules.name||data.program.name)}</h2><div class="amount">${cycle.stamps} <span class="small">/ ${cycle.rules.stamps_required} sellos</span></div><p>${esc(cycle.rules.benefit_value.label)}</p><span class="small">Tarjeta ${cycle.cycle_number} · Vence ${date(cycle.expires_at)}</span></div>
      ${cycle.review_required?'<p class="notice">El negocio está revisando un ajuste de sellos de esta tarjeta.</p>':''}
      ${cycle.claimed_at?`<h3>Tu beneficio</h3><p class="small">${esc(({ACTIVE:'Listo para presentar en el negocio',REDEEMED:'Beneficio utilizado',CANCELLED:'Beneficio anulado',EXPIRED:'Beneficio vencido'})[cycle.ticket_status]||cycle.ticket_status)}</p>${cycle.qr_image&&cycle.ticket_status==='ACTIVE'&&new Date(cycle.ticket_expires_at)>new Date()?`<img class="detail-qr" src="${esc(cycle.qr_image)}" alt="QR de tu beneficio"><p class="small muted">Válido hasta ${date(cycle.ticket_expires_at)}. Preséntalo en el negocio.</p>`:''}`:
      ready&&!expired?`<h3>¡Completaste tu tarjeta!</h3><p class="small muted">Genera tu beneficio para presentarlo en el negocio. Esta acción no tiene costo para ti.</p><button class="primary wide" data-action="claim-stamp" data-id="${id}" data-cycle="${cycle.id}">Generar mi beneficio</button>`:''}
      <h3>Mi tarjeta en el negocio</h3><img class="detail-qr" src="${esc(data.identification.qr_image)}" alt="QR de identificación de esta tarjeta"><p class="small muted">Este QR identifica la tarjeta. Los sellos se registran según las condiciones del programa.</p>
      ${(cycle.claimed_at||expired)&&data.program.status==='ACTIVE'&&!data.program.deleted?`<button class="secondary wide" data-action="renew-stamp" data-id="${id}">Comenzar una nueva tarjeta</button>`:''}
      <h3>Condiciones</h3><p class="small muted">${esc(cycle.rules.terms||'Consulta las condiciones con el negocio.')}</p>
      <h3>Movimientos recientes</h3><ul class="history-list">${data.events.length?data.events.map(event=>`<li><strong>${event.voided_at?'Sello anulado':event.source==='SALE'?'Compra registrada':'Visita registrada'}</strong> · ${date(event.created_at)}<br>Tarjeta ${event.cycle_number}</li>`).join(''):'<li>Todavía no hay movimientos en esta tarjeta.</li>'}</ul>`;
  }
  function pointsDetail(id,data){
    const rewardAction=r=>{
      const status=r.expires_at&&new Date(r.expires_at)<=new Date()?'EXPIRED':r.ticket_status;
      if(status&&status!=='ACTIVE'&&status!=='ISSUED')return `<span class="pill gray">${esc(({REDEEMED:'Beneficio utilizado',CANCELLED:'Beneficio anulado',EXPIRED:'Beneficio vencido'})[status]||'Beneficio no disponible')}</span>`;
      return r.unlocked&&data.card.status==='ACTIVE'?`<button class="primary" data-action="claim-points" data-id="${id}" data-rule="${r.id}">${status?'Ver mi beneficio':'Generar beneficio'}</button>`:'<span class="small muted">Sigue acumulando puntos.</span>';
    };
    return `<p class="eyebrow">${esc(data.card.business_name)}</p><div class="card-art points"><h2>Mi tarjeta Qori</h2><div class="amount">${Number(data.card.points_total).toLocaleString('es-CO')} <span class="small">puntos</span></div><p class="small">Saldo exclusivo de este negocio.</p></div>${data.card.qr_image?`<img class="detail-qr" src="${esc(data.card.qr_image)}" alt="QR de afiliación">`:''}<div id="pointsTicket"></div>
      <h3>Beneficios del negocio</h3>${data.rewards.length?data.rewards.map(r=>`<section class="panel"><h3>${esc(r.title)}</h3><p>${esc(r.benefit_label)} · ${Number(r.required_points)} puntos</p>${rewardAction(r)}</section>`).join(''):'<p class="small muted">El negocio aún no ha publicado beneficios para esta afiliación.</p>'}
      <h3>Condiciones</h3><p class="small muted">${esc(data.terms.points_terms||'Consulta las condiciones con el negocio.')}</p><h3>Últimos movimientos</h3><ul class="history-list">${data.ledger.map(entry=>`<li><strong>${Number(entry.points_awarded)>0?'+':''}${Number(entry.points_awarded)} puntos</strong> · ${date(entry.created_at)}</li>`).join('')||'<li>Sin movimientos recientes.</li>'}</ul>`;
  }
  function giftDetail(id,data){
    const c=data.card;
    return `<p class="eyebrow">${esc(c.business_name)}</p><div class="card-art gift"><h2>Mi giftcard</h2><div class="amount">${money(c.balance)}</div><p class="small">Vence ${date(c.expires_at)}</p></div>${c.message?`<p>${esc(c.message)}</p>`:''}
      ${c.claim_required?`<h3>Acepta tu regalo</h3><form id="giftAcceptForm" data-id="${id}" class="stack">${field('full_name','Tu nombre completo',state.account.full_name,'minlength="2" maxlength="160" required')}${window.QoriBenefitRecovery.documentFields(state.account)}<label class="check"><input type="checkbox" name="terms_accepted" required><span>Acepto las condiciones de esta giftcard.</span></label><button class="primary">Aceptar mi giftcard</button></form>`:c.qr_image?`<img class="detail-qr" src="${esc(c.qr_image)}" alt="QR para presentar tu giftcard">`:'<p class="muted small">Esta giftcard no tiene un QR disponible para usar en este momento.</p>'}
      <h3>Condiciones</h3><p class="small muted">${esc(c.terms)}</p><p class="small muted">${esc(c.branch)} · ${c.partial_redemption_allowed?'Puedes usar el saldo en varios canjes.':'Uso según las condiciones del negocio.'}</p><h3>Canjes registrados</h3><ul class="history-list">${data.redemptions.map(r=>`<li>${money(r.redeemed_value_cop)} · ${date(r.redeemed_at)}<br>Saldo: ${money(r.balance_after_cop)}</li>`).join('')||'<li>Sin canjes registrados.</li>'}</ul>`;
  }
  function relationshipDialog(id,revoke=false){
    const r=state.relationships.find(row=>row.id===id);if(!r)return;
    dialog(revoke?'Desconectar negocio':'Conectar con '+r.name,`<p>${revoke?'Sus tarjetas y compras dejarán de aparecer en tu cuenta. Los registros del negocio se conservan.':'Revisa que el negocio y el documento correspondan a ti. Esta conexión reúne los distintos programas de este negocio.'}</p><section class="panel"><h3>${esc(r.name)}</h3><p>Documento terminado en ${esc(r.document_suffix)}</p></section>
      <form id="relationshipForm" data-id="${id}" data-decision="${revoke?'REVOKE':'ACCEPT'}">${!revoke?window.QoriBenefitRecovery.documentFields(state.account)+'<label class="check"><input type="checkbox" name="include_history" checked><span>Incluir también mis beneficios anteriores de este negocio.</span></label><label class="check"><input type="checkbox" name="capture_purchases"><span>Autorizo registrar mis compras pagadas en mis finanzas. Si incluyo el historial, se incorporarán también las compras anteriores.</span></label><label class="field">Bolsillo para las compras<select name="book_id">'+state.books.map(b=>'<option value="'+esc(b.id)+'" '+(b.id===state.bookId?'selected':'')+'>'+esc(b.name)+'</option>').join('')+'</select></label>':''}<footer>${!revoke?`<button type="button" class="secondary" data-action="reject-relationship" data-id="${id}">No soy yo</button>`:''}<button class="primary">${revoke?'Desconectar este negocio':'Confirmar conexión'}</button></footer></form>`);
  }
  async function submit(form){
    const f=new FormData(form);
    if(form.id==='emailForm'){
      state.email=String(f.get('email')).trim();state.consent=f.has('consent');
      state.challenge=(await request('/auth/web/code',{email:state.email})).challenge_id;renderAuth();
    }else if(form.id==='verifyForm'){
      const result=await request('/auth/web/verify',{challenge_id:state.challenge,code:String(f.get('code')).trim(),consent:state.consent});
      sessionGuard.adopt(result.account.id);broadcastSession();
      const destination=['recover-benefits','gift-shop','product-gifts','invitations'].includes(route())||route().startsWith('publication/')?'#'+route():'#home';state.account=result.account;state.bookId=null;state.challenge=null;history.replaceState(null,'',destination);await refresh();announce('Bienvenido a tu cuenta Qori.');
    }else if(form.id==='profileForm'){
      const completing=!registrationComplete(),recoveryDoc=String(f.get('document_id')||'').trim();
      if(!state.account.declared_document_key&&!recoveryDoc)throw Error('La cédula es obligatoria para completar tu registro.');
      if(recoveryDoc&&!state.account.declared_document_key&&(!f.get('document_confirmation')||String(f.get('document_confirmation')).toLowerCase().replace(/[^a-z0-9]/g,'')!==recoveryDoc.toLowerCase().replace(/[^a-z0-9]/g,'')))throw Error('Escribe la misma cédula dos veces. Después no podrás cambiarla.');
      const result=await request('/me',{full_name:String(f.get('full_name')).trim(),currency:f.get('currency')||state.account.currency,timezone:f.has('timezone')?String(f.get('timezone')).trim():state.account.timezone,
        ...(recoveryDoc?{document_id:recoveryDoc,document_confirmation:f.get('document_confirmation')||undefined}:{}),
        preferences:{notifications:f.has('currency')?Object.fromEntries(['purchases','benefits','budget','summary'].map(k=>[k,f.has('notice_'+k)])):state.account.preferences.notifications}},'PATCH');state.account=result.account;
      if(recoveryDoc&&f.has('recover_consent')){try{const recovered=await request('/benefit-recovery',{request_id:crypto.randomUUID(),document_id:recoveryDoc,consent:true});state.recoveryMessage=recovered.message;}catch(error){state.recoveryMessage=error.message;}history.replaceState(null,'','#wallet');await refresh();}else if(completing)await refresh();else renderApp();
      const message=document.getElementById('profileSuccess');if(message)message.textContent='Tus datos se guardaron.';announce('Datos guardados.');
    }else if(form.id==='relationshipForm'){
      await request(`/relationships/${form.dataset.id}/decision`,{action:form.dataset.decision,include_history:f.has('include_history'),capture_purchases:f.has('capture_purchases'),book_id:f.get('book_id')||undefined,document_id:f.get('document_id')||undefined,document_confirmation:f.get('document_confirmation')||undefined});closeDialog();await refresh();announce('Conexión actualizada.');
    }else if(form.id==='giftAcceptForm'){
      await request(`/wallet/gifts/${form.dataset.id}/accept`,{full_name:f.get('full_name'),document_id:f.get('document_id'),document_confirmation:f.get('document_confirmation')||undefined,terms_accepted:f.has('terms_accepted')});await refresh({render:false});await openCard('GIFT',form.dataset.id);
    }else if(form.id==='deleteAccountForm'){
      await request('/me',{confirmation:f.get('confirmation')},'DELETE');clearPrivateState('Tu cuenta personal fue eliminada.');broadcastSession();
    }
  }
  document.addEventListener('submit',async event=>{
    if(!event.target.closest('#app,#customerDialog'))return;
    event.preventDefault();const form=event.target,button=event.submitter||form.querySelector('button[type="submit"],button.primary');if(button?.disabled)return;
    if(button)button.disabled=true;
    try{await submit(form);}catch(e){showError(e.message,document.getElementById('dialogError')||document.getElementById('authError')||document.getElementById('pageError'));}finally{if(button)button.disabled=false;}
  });
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
    const action=b.dataset.action,id=b.dataset.id;b.disabled=true;
    try{
      if(action==='change-email'){state.challenge=null;renderAuth();}
      else if(action==='resend'){state.challenge=(await request('/auth/web/code',{email:state.email})).challenge_id;renderAuth();announce('Enviamos un nuevo código.');}
      else if(action==='refresh')await refresh();
      else if(action==='filter-status'){state.status=b.dataset.status;renderWallet(document.getElementById('page'));}
      else if(action==='clear-filters'){state.search='';state.kind='ALL';state.status='ALL';if(route()==='benefits')location.hash='wallet';else renderWallet(document.getElementById('page'));}
      else if(action==='open-card')await openCard(b.dataset.kind,id);
      else if(action==='close-dialog')closeDialog();
      else if(action==='review-relationship'||action==='revoke-relationship')relationshipDialog(id,action==='revoke-relationship');
      else if(action==='reject-relationship'){await request(`/relationships/${id}/decision`,{action:'REJECT'});closeDialog();await refresh();}
      else if(action==='view-business'){state.search=b.dataset.name;state.status='ALL';state.kind='ALL';location.hash='wallet';}
      else if(action==='copy-id'){try{await navigator.clipboard.writeText(state.account.public_id);b.textContent='Identificación copiada';}catch{announce('Selecciona y copia la identificación que aparece bajo tu QR.');}}
      else if(action==='claim-stamp'||action==='renew-stamp'){
        await request(`/wallet/cards/${id}/${action==='claim-stamp'?'claim':'renew'}`,action==='claim-stamp'?{cycle_id:b.dataset.cycle}:{});await refresh({render:false});await openCard('STAMP',id);
      }else if(action==='claim-points'){
        const result=await request(`/wallet/affiliations/${id}/claim`,{reward_rule_id:b.dataset.rule});await refresh({render:false});
        const host=document.getElementById('pointsTicket');if(host)host.innerHTML=`<h3>Tu beneficio</h3><img class="detail-qr" src="${esc(result.ticket.qr_image)}" alt="QR del beneficio de puntos"><p class="small">Vence ${date(result.ticket.expires_at)}</p>`;
      }else if(action==='gift-order'){
        const result=await request('/gift-orders/'+id),o=result.order;
        dialog('Tu solicitud de giftcard',`<h3>${esc(o.business_name)}</h3><p>${money(o.amount)} · ${giftNames[o.state]||esc(o.state)}</p><p>Para ${esc(o.recipient_name)}</p><p class="small muted">${esc(o.payment_instructions||'Consulta el pago directamente con el negocio. La giftcard se emite cuando confirma que lo recibió.')}</p>`);
      }else if(action==='logout'){await request('/logout',{});clearPrivateState();broadcastSession();}
      else if(action==='revoke-session'){await request('/sessions/'+id,null,'DELETE');renderProfile(document.getElementById('page'));}
      else if(action==='export'){
        const data=await request('/export'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='mis-datos-qori.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }else if(action==='delete-account')dialog('Eliminar mi cuenta personal',`<p>Se eliminarán tu cuenta y tus datos personales de Qori Customer. Las ventas y los registros originales de los negocios se conservan. Esta acción no se puede deshacer.</p><form id="deleteAccountForm" class="stack">${field('confirmation','Escribe ELIMINAR MI CUENTA','','pattern="ELIMINAR MI CUENTA" required')}<button class="primary">Eliminar mi cuenta</button></form>`);
    }catch(e){showError(e.message,document.getElementById('dialogError')||document.getElementById('authError')||document.getElementById('pageError'));}finally{b.disabled=false;}
  });
  document.addEventListener('input',event=>{if(event.target.id==='walletSearch'){state.search=event.target.value;renderGroups();}});
  document.addEventListener('change',event=>{if(event.target.id==='walletKind'){state.kind=event.target.value;renderGroups();}});
  window.addEventListener('hashchange',()=>{if(location.hash==='#main')return;closeDialog();renderApp();});
  async function sync(){if(!document.getElementById('page')||!registrationComplete()||document.hidden||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;try{await refresh({render:false});const inviteLink=app.querySelector('a[href="#invitations"]');if(inviteLink)inviteLink.innerHTML=navIcon('invitations')+'Invitaciones'+(state.invitationCount?' ('+state.invitationCount+')':'');if(route()==='home')window.QoriAccounting.render(document.getElementById('page'),exploreContext());else if(['wallet','benefits'].includes(route()))renderWallet(document.getElementById('page'));else if(route()==='businesses')renderBusinesses(document.getElementById('page'));else if(route()==='invitations')window.QoriInvitations.render(document.getElementById('page'),exploreContext());else if(route()==='purchases')window.QoriPurchases.render(document.getElementById('page'),exploreContext());else if(route()==='payments')window.QoriPayments.render(document.getElementById('page'),exploreContext());else if(route()==='debts')window.QoriDebts.render(document.getElementById('page'),exploreContext(),route());else if(['finances','history','planning'].includes(route()))window.QoriFinance.render(document.getElementById('page'),exploreContext(),route());}catch(e){showError(e.message);}}
  window.addEventListener('storage',event=>{if(event.key==='qori-session-change')clearPrivateState('La sesión cambió en otra pestaña. Entra de nuevo para continuar.');});
  async function verifyVisibleSession(){if(state.account)try{await request('/me');await sync();}catch(error){if(error.status!==401&&error.code!=='SESSION_CHANGED')clearPrivateState('No pudimos verificar tu sesión. Vuelve a entrar.');}}
  window.addEventListener('focus',verifyVisibleSession);document.addEventListener('visibilitychange',()=>{if(!document.hidden)verifyVisibleSession();});setInterval(sync,60000);
  window.addEventListener('pagehide',()=>{if(state.account)clearPrivateState();});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  (async()=>{try{await loadAccount();booting=false;await refresh();}catch(error){booting=false;if(error.status===401)renderAuth();else if(state.account){renderApp();showError(error.message);}else renderAuth(error.message);}})();
})();

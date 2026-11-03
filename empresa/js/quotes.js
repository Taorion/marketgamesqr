(() => {
  const root = document.getElementById('quotesWorkspace');
  if (!root) return;
  const {esc,money,date,labels} = QuoteDocument;
  const call = (path='',method='GET',body) => api(`/api/business/quotes${path}`, {
    method, headers:authHeaders(), noClientCache:true,
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const scope = () => JSON.stringify(authHeaders());
  const quoteNumber = n => `COT-${String(n).padStart(6,'0')}`;
  const statuses = {ALL:'Todas',DRAFT:'Borradores',SENT:'Por responder',ACCEPTED:'Aceptadas',CONVERTED:'Con venta',EXPIRED:'Vencidas',DECLINED:'No aceptadas',CANCELLED:'Anuladas'};
  const statusHelp = {
    DRAFT:'Revisa los datos y emite la propuesta para habilitar su enlace y beneficio QR.',
    SENT:'La propuesta está lista para compartir. Puedes registrar la respuesta del cliente.',
    ACCEPTED:'El cliente está interesado. Coordina el pago y regístralo cuando lo recibas.',
    CONVERTED:'El pago quedó registrado en Ventas atribuidas y el inventario fue actualizado.',
    EXPIRED:'La vigencia terminó. Crea una nueva versión para actualizar la propuesta.',
    DECLINED:'El cliente no aceptó esta propuesta. Puedes preparar una nueva versión.',
    CANCELLED:'La propuesta está anulada y su enlace ya no está disponible.'
  };
  let generation=0, offset=0, search='', status='ALL', ctx;
  function notice(value) {
    const el=root.querySelector('[data-quote-message]');
    if(el) el.textContent=value;
  }
  function modal(title,html,wide=false) {
    const d=document.createElement('dialog');
    d.className=`qt-dialog ${wide?'qt-wide':''}`;
    const heading=`qtHeading-${crypto.randomUUID()}`;
    d.setAttribute('aria-labelledby',heading);
    d.innerHTML=`<header><div><span class="qt-eyebrow">COTIZACIONES</span><h2 id="${heading}">${esc(title)}</h2></div><button type="button" class="qt-close" aria-label="Cerrar">×</button></header><div class="qt-dialog-body">${html}</div><p class="qt-dialog-message" role="status"></p>`;
    document.body.append(d);
    const requestClose=()=>{
      if(d.dataset.busy==='true')return;
      if(d.dataset.dirty==='true')return confirmAction('¿Salir sin guardar?','Los cambios de esta cotización todavía no se han guardado. Puedes volver para conservarlos.',()=>d.close());
      d.close();
    };
    d.querySelector('.qt-close').onclick=requestClose;
    d.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
    d.addEventListener('close',()=>d.remove());
    d.showModal();
    return d;
  }
  const error=(d,e)=>{const p=d.querySelector('.qt-dialog-message');if(p){p.dataset.kind='error';p.textContent=e.message||String(e);}};
  async function task(d,button,fn) {
    if(d.dataset.busy==='true')return;
    const account=scope();
    d.dataset.busy='true'; d.setAttribute('aria-busy','true'); button.disabled=true;
    d.querySelector('.qt-dialog-message').textContent='';
    try {
      if(d.dataset.scope&&d.dataset.scope!==account)throw new Error('La sesión cambió. Abre nuevamente la cotización.');
      await fn();
    } catch(e) { if(scope()===account)error(d,e); }
    finally { d.dataset.busy='false';d.removeAttribute('aria-busy');button.disabled=false; }
  }
  function field(name,label,value='',extra='') {
    return `<label>${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
  }
  function shell() {
    root.innerHTML=`
      <header class="qt-hero"><div><span class="qt-eyebrow">OPERA · PROPUESTAS COMERCIALES</span><h2>Cotizaciones que hablan bien de tu negocio</h2><p>Presenta tus productos con fotos, tu marca y un beneficio QR. Comparte una propuesta que tu cliente pueda consultar y aceptar desde su celular.</p></div><button class="qt-primary" data-qt="new"><span aria-hidden="true">＋</span> Nueva cotización</button></header>
      <div class="qt-message" data-quote-message role="status"></div>
      <section class="qt-overview" id="qtOverview" aria-label="Resumen de cotizaciones"></section>
      <section class="qt-library" aria-label="Tus propuestas">
        <div class="qt-library-head"><div><h3>Tus propuestas</h3><p>Del primer borrador a la compra confirmada.</p></div><button type="button" data-qt="refresh" aria-label="Actualizar cotizaciones">Actualizar</button></div>
        <form class="qt-toolbar"><label>Buscar cotización<input name="search" value="${esc(search)}" maxlength="120" placeholder="Cliente, título o COT-000001"></label><button>Buscar</button><button type="button" data-qt="reset">Limpiar filtros</button></form>
        <nav class="qt-filters" id="qtFilters" aria-label="Filtrar por estado"></nav>
        <p class="qt-results" id="qtResults" role="status"></p>
        <div class="qt-list" id="qtList"><p>Cargando cotizaciones…</p></div>
        <div class="qt-pagination" id="qtPagination"></div>
      </section>
      <aside class="qt-note"><strong>Una aceptación es el siguiente paso.</strong> Registra la venta cuando recibas el pago. Las propuestas emitidas conservan las fotos, los precios y las condiciones que compartiste.</aside>`;
    root.querySelector('form').onsubmit=e=>{e.preventDefault();search=new FormData(e.target).get('search').trim();offset=0;load();};
  }
  function overview(summary) {
    const cards=[['DRAFT','Por preparar','Revisa y emite'],['SENT','Por responder','Comparte y da seguimiento'],['ACCEPTED','Aceptadas','Coordina el siguiente paso'],['CONVERTED','Con venta registrada','Consulta el historial']];
    document.getElementById('qtOverview').innerHTML=cards.map(([key,label,help])=>`<button type="button" class="qt-stat" data-qt="filter" data-status="${key}" aria-pressed="${status===key}"><span>${label}</span><strong>${summary[key]||0}</strong><small>${help}</small></button>`).join('');
    document.getElementById('qtOverview').setAttribute('aria-label',search?'Resumen de la búsqueda':'Resumen de todas las cotizaciones');
    document.getElementById('qtFilters').innerHTML=Object.entries(statuses).map(([key,label])=>`<button type="button" data-qt="filter" data-status="${key}" aria-pressed="${status===key}">${label}<span>${summary[key]||0}</span></button>`).join('');
  }
  function card(q) {
    return `<article class="qt-card"><div class="qt-card-copy"><div class="qt-card-top"><span class="qt-eyebrow">${quoteNumber(q.number)}</span><span class="qt-badge" data-status="${esc(q.status)}">${labels[q.status]}</span></div><h3>${esc(q.title)}</h3><p class="qt-customer">${esc(q.customer_name)}</p><div class="qt-card-meta"><span>${q.product_count||1} producto${q.product_count===1?'':'s'}</span><span>Válida hasta ${date(q.valid_until)}</span>${q.first_viewed_at?'<span>Enlace consultado</span>':''}</div>${q.benefit_title?`<div class="qt-benefit-chip"><span class="material-symbols-outlined" aria-hidden="true">qr_code_2</span> ${esc(q.benefit_title)}</div>`:''}</div><div class="qt-card-end"><small>Total cotizado</small><strong>${money(q.total)}</strong><button data-qt="detail" data-id="${q.id}">${q.status==='DRAFT'?'Revisar borrador':'Ver propuesta'} <span aria-hidden="true">→</span></button></div></article>`;
  }
  async function load() {
    const run=++generation;
    const list=root.querySelector('#qtList');
    list.setAttribute('aria-busy','true'); notice('');
    try {
      const result=await call(`?offset=${offset}&search=${encodeURIComponent(search)}&status=${status}`);
      if(run!==generation)return;
      if(offset>0&&!result.quotes.length){offset=Math.max(0,offset-30);return load();}
      overview(result.summary||{});
      document.getElementById('qtResults').textContent=`${result.total_count||0} propuesta${result.total_count===1?'':'s'}${search?` para “${search}”`:''} · ${statuses[status]}`;
      const filtered=search||status!=='ALL';
      list.innerHTML=result.quotes.length?result.quotes.map(card).join(''):`<div class="qt-empty"><span class="material-symbols-outlined" aria-hidden="true">${filtered?'manage_search':'request_quote'}</span><h3>${filtered?'No hay propuestas con estos filtros':'Dale a tu próxima venta una buena presentación'}</h3><p>${filtered?'Prueba otro cliente, título o número de cotización. También puedes consultar todos los estados.':'Elige los productos de tu inventario, agrega un beneficio y comparte un PDF o enlace con la identidad de tu negocio.'}</p><button class="qt-primary" data-qt="${filtered?'reset':'new'}">${filtered?'Ver todas las propuestas':'Crear mi primera cotización'}</button>${filtered?'':'<div class="qt-empty-steps"><span>1. Elige productos</span><span>2. Revisa tu propuesta</span><span>3. Comparte y vende</span></div>'}</div>`;
      document.getElementById('qtPagination').innerHTML=`<button data-qt="prev" ${offset===0?'disabled':''}>Anterior</button><span>Página ${Math.floor(offset/30)+1} de ${Math.max(1,Math.ceil(result.total_count/30))}</span><button data-qt="next" ${!result.has_more?'disabled':''}>Siguiente</button>`;
    } catch(e) {
      if(run===generation){notice(e.message);list.innerHTML='<div class="qt-empty"><h3>No pudimos cargar tus propuestas</h3><p>Revisa tu conexión e inténtalo nuevamente.</p><button data-qt="refresh">Volver a intentar</button></div>';}
    } finally { if(run===generation)list.removeAttribute('aria-busy'); }
  }

  function journey(q) {
    const steps=[['Creada',q.created_at],['Emitida',q.issued_at],['Aceptada',q.accepted_at],['Venta registrada',q.sale_id?true:null]];
    return `<section class="qt-detail-summary"><div><span class="qt-badge" data-status="${q.status}">${labels[q.status]}</span><strong>${quoteNumber(q.number)}</strong><p>${statusHelp[q.status]||''}</p></div><ol class="qt-journey" aria-label="Seguimiento de la propuesta">${steps.map(([name,value])=>`<li data-complete="${Boolean(value)}"><span>${name}</span><small>${typeof value==='string'?date(value):value?'Confirmada':'Pendiente'}</small></li>`).join('')}</ol></section>`;
  }
  async function download(q,d,button){await task(d,button,async()=>{const r=await fetch(`/api/business/quotes/${q.id}/pdf`,{headers:authHeaders()});if(!r.ok){const j=await r.json();throw new Error(j.error?.message||'No se pudo descargar el PDF.');}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${quoteNumber(q.number)}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);});}
  async function detail(id){const account=scope(),d=modal('Tu propuesta comercial','<p>Cargando documento…</p>',true);d.dataset.scope=account;
    try{let q=await call(`/${id}`);if(!d.isConnected||scope()!==account)return;
      const s=q.snapshot;let publicInfo={};
      if(q.public_url){const token=new URL(q.public_url).hash.slice(1);publicInfo.benefit_url=`/api/public/quotes/${token}/benefit`;}
      d.querySelector('.qt-dialog-body').innerHTML=`${journey(q)}<div class="qt-actions qt-document-actions"><button data-do="pdf">Descargar PDF</button>${q.status==='DRAFT'?'<button data-do="edit">Editar borrador</button><button class="qt-primary" data-do="issue">Emitir y preparar envío</button>':''}${['SENT','ACCEPTED'].includes(q.status)?'<button class="qt-primary" data-do="pay">Registrar pago y venta</button>':''}${q.status==='SENT'?'<button data-do="accept">Registrar aceptación</button>':''}<button data-do="copy">Crear nueva versión</button>${!['CONVERTED','CANCELLED'].includes(q.status)?'<button class="qt-danger" data-do="cancel">Anular</button>':''}</div>${q.public_url?`<section class="qt-share"><strong>Lista para compartir</strong><p>Comparte el enlace o adjunta el PDF descargado. El envío se realiza desde tu aplicación.</p><input aria-label="Enlace para el cliente" readonly value="${esc(q.public_url)}"><div class="qt-actions"><button data-do="link">Copiar enlace</button><button data-do="share">Compartir</button><a href="https://wa.me/${esc(String(s.customer.phone||'').replace(/\D/g,''))}?text=${encodeURIComponent(`Hola ${s.customer.name}, te compartimos tu cotización de ${s.business.name}: ${q.public_url}`)}" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="mailto:${encodeURIComponent(s.customer.email||'')}?subject=${encodeURIComponent(`Cotización COT-${q.number} · ${s.business.name}`)}&body=${encodeURIComponent(`Hola ${s.customer.name},\n\nConsulta tu propuesta y beneficio aquí:\n${q.public_url}\n\n${s.business.name}`)}">Correo</a><a href="${esc(q.public_url)}" target="_blank" rel="noopener noreferrer">Abrir enlace</a></div></section>`:''}${q.status==='CONVERTED'?'<p class="qt-note">Pago registrado en Ventas atribuidas. El beneficio sujeto a compra ya puede abrirse desde el documento.</p>':''}${QuoteDocument.html({...q,...publicInfo})}`;
      d.querySelectorAll('[data-do]').forEach(b=>b.onclick=()=>{
        const action=b.dataset.do;
        if(action==='pdf')return download(q,d,b);
        if(action==='edit'||action==='copy'){d.close();return editor(q,action==='copy');}
        if(action==='pay')return payment(q,d);
        if(action==='cancel')return confirmAction('Anular cotización','El enlace compartido dejará de estar disponible. Se conservará el registro en tu historial.',async()=>{await call(`/${id}/action`,'POST',{action:'cancel'});d.close();await load();});
        if(action==='issue'||action==='accept')return task(d,b,async()=>{await call(`/${id}/action`,'POST',{action});d.close();await load();await detail(id);});
        if(action==='link')return task(d,b,async()=>{await navigator.clipboard.writeText(q.public_url);d.querySelector('.qt-dialog-message').dataset.kind='success';d.querySelector('.qt-dialog-message').textContent='Enlace copiado.';});
        if(action==='share')return task(d,b,async()=>{if(navigator.share){try{await navigator.share({title:s.title,text:`Cotización de ${s.business.name}`,url:q.public_url});return;}catch(e){if(e.name==='AbortError')return;throw e;}}await navigator.clipboard.writeText(q.public_url);d.querySelector('.qt-dialog-message').dataset.kind='success';d.querySelector('.qt-dialog-message').textContent='Enlace copiado para compartir.';});
      });
    }catch(e){error(d,e);}
  }
  function confirmAction(title,text,fn){const d=modal(title,`<p>${esc(text)}</p><div class="qt-actions"><button data-cancel>Volver</button><button class="qt-primary" data-confirm>Confirmar</button></div>`);d.dataset.scope=scope();d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=e=>task(d,e.currentTarget,async()=>{await fn();d.close();});}
  function payment(q,parent){const d=modal('Registrar pago y venta',`<p>Confirma que recibiste <strong>${money(q.snapshot.total)}</strong> por esta cotización. Se registrará una venta y se descontarán las cantidades del inventario.</p><form><label>Medio de pago<select name="payment_method"><option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option><option value="OTHER">Otro</option></select></label><label class="qt-check"><input type="checkbox" name="confirmed" required>Confirmo que recibí el pago total.</label><button class="qt-primary">Registrar pago</button></form>`);d.dataset.scope=scope();d.querySelector('form').onsubmit=e=>{e.preventDefault();task(d,d.querySelector('form button'),async()=>{await call(`/${q.id}/convert`,'POST',{payment_confirmed:true,payment_method:new FormData(e.target).get('payment_method')});d.close();parent.close();await load();await detail(q.id);});};}
  async function editor(existing=null,copy=false){
    const account=scope(),d=modal(existing?(copy?'Nueva versión':'Editar borrador'):'Nueva cotización','<p>Preparando productos y marca…</p>',true);d.dataset.scope=account;
    try{
      const context=ctx||await call('/context');ctx=context;let catalog=await call('/products'),contactRows=[];
      if(!d.isConnected||scope()!==account)return;
      const s=existing?.snapshot||{},requestId=crypto.randomUUID(),lines=(s.items||[]).map(i=>({...i}));
      const until=existing&&!copy?existing.valid_until.slice(0,10):new Date(Date.now()+7*86400000).toISOString().slice(0,10);
      let contactId=existing?.contact_id||null,contactSource=existing?.contact_source||null;
      d.querySelector('.qt-dialog-body').innerHTML=`<form id="qtEditor"><nav class="qt-editor-nav" aria-label="Secciones de la cotización">${[["qtCustomerSection","1. Cliente"],["qtProductsSection","2. Productos"],["qtBenefitSection","3. Beneficio QR"],["qtTermsSection","4. Condiciones"]].map(([id,label])=>`<button type="button" data-section="${id}">${label}</button>`).join('')}</nav><div class="qt-editor-intro"><span class="material-symbols-outlined">auto_awesome</span><div><strong>${esc(context.business?.name||'Tu negocio')}</strong><p>${context.business?.logo||context.business?.logo_url?'Tu logo está listo. Usaremos las fotos guardadas en Inventario.':'Agrega el logo de tu negocio en Cuenta para personalizar tus propuestas. Las fotos se toman de Inventario.'}</p></div></div><div class="qt-form-grid">${field('title','Título de la propuesta',s.title||'Una propuesta para ti','required maxlength="140"')}${field('valid_until','Válida hasta',until,'type="date" required')}<div class="qt-full"><h3 id="qtCustomerSection">1. Tu cliente</h3><div class="qt-picker"><label>Buscar en Contactos<input name="contact_search" placeholder="Nombre, correo o teléfono" maxlength="120"></label><button type="button" id="qtFindContact">Buscar contacto</button></div><label>Contacto del negocio<select name="contact"><option value="">Ingresar datos para esta cotización</option>${contactId?`<option selected value="${contactSource}:${contactId}">${esc(s.customer?.name)}</option>`:''}</select></label><p class="qt-help" id="qtContactHint">${contactId?'Vinculada al historial de este contacto.':'Puedes escribir un destinatario sin crear un contacto nuevo.'}</p></div>${field('name','Nombre del cliente',s.customer?.name||'','required maxlength="180"')}${field('organization','Empresa del cliente (opcional)',s.customer?.organization||'','maxlength="180"')}${field('phone','WhatsApp con indicativo del país',s.customer?.phone||'','maxlength="40" placeholder="573001234567"')}${field('email','Correo (opcional)',s.customer?.email||'','type="email" maxlength="180"')}${field('document_id','Documento / NIT (opcional)',s.customer?.document_id||'','maxlength="80"')}<div class="qt-full"><h3 id="qtProductsSection">2. Productos y fotos</h3><p class="qt-help">El precio viene de Inventario. Si ya incluye impuestos, deja «Impuesto adicional» en 0 para no sumarlo dos veces. Puedes cotizar hasta 30 productos.</p><div class="qt-picker"><label>Buscar producto<input name="product_search" placeholder="Nombre o referencia" maxlength="120"></label><button type="button" id="qtFindProduct">Buscar</button></div><div class="qt-picker"><label>Producto del inventario<select name="product"></select></label><button type="button" id="qtAddProduct">Agregar producto</button></div><p class="qt-help" id="qtProductHint"></p><div id="qtLines" class="qt-lines"></div><div class="qt-estimate">Total estimado <strong id="qtTotal">${money(0)}</strong></div></div><div class="qt-full"><h3 id="qtBenefitSection">3. Beneficio QR</h3><label>Activación incluida<select name="activation_id"><option value="">Sin beneficio QR</option>${context.activations.map(a=>`<option value="${a.id}" ${a.id===existing?.activation_id?'selected':''}>${esc(a.title)}</option>`).join('')}</select></label><p class="qt-help">${context.activations.length?'Elige una experiencia vigente de tu negocio. Se conservan sus condiciones de participación.':'Aún no tienes activaciones vigentes. Puedes preparar la cotización sin beneficio o crear una activación primero.'}</p></div><p class="qt-help qt-full" id="qtBenefitHint" role="status"></p><label>Cuándo puede acceder al beneficio<select name="benefit_timing"><option value="ON_ISSUE">Al recibir la cotización</option><option value="AFTER_PAYMENT" ${s.benefit?.timing==='AFTER_PAYMENT'?'selected':''}>Después de registrar el pago</option></select></label><label>Cómo presentar el beneficio<textarea name="benefit_description" rows="3" maxlength="600">${esc(s.benefit?.description||'')}</textarea></label><div class="qt-full"><h3 id="qtTermsSection">4. Condiciones comerciales</h3></div><label>Forma de pago<textarea name="payment_terms" rows="3" maxlength="1000" placeholder="Ej. Transferencia al confirmar el pedido.">${esc(s.payment_terms||'')}</textarea></label><label>Entrega<textarea name="delivery_terms" rows="3" maxlength="1000" placeholder="Ej. Entrega en 3 días hábiles.">${esc(s.delivery_terms||'')}</textarea></label><label class="qt-full">Otras condiciones<textarea name="terms" rows="4" maxlength="4000">${esc(s.terms||'Precios en pesos colombianos. Disponibilidad de productos sujeta a confirmación.')}</textarea></label></div><footer class="qt-editor-footer"><div><small id="qtFooterCount">Sin productos</small><strong id="qtFooterTotal">${money(0)}</strong><span>Se guardará como borrador</span></div><button class="qt-primary" type="submit">Guardar y revisar →</button></footer></form>`;
      const f=d.querySelector('form'),get=name=>f.elements.namedItem(name);
      function picker(){get('product').innerHTML='<option value="">Selecciona un producto</option>'+catalog.map(p=>`<option value="${p.id}">${esc(p.name)} · ${money(p.unit_price)}${p.has_photo?' · Con foto':''}</option>`).join('');d.querySelector('#qtProductHint').textContent=catalog.length?'Si no encuentras un producto, busca por su nombre o referencia.':'No hay productos activos con esa búsqueda. Puedes crearlos y cargar sus fotos en Inventario.';}
      function total(){let sum=0;for(const i of lines){const base=Math.round(i.unit_price*i.quantity*100)/100;const net=base-Math.round(base*i.discount_percent)/100;sum+=net+Math.round(net*i.tax_percent)/100;}d.querySelector('#qtTotal').textContent=money(sum);d.querySelector('#qtFooterTotal').textContent=money(sum);d.querySelector('#qtFooterCount').textContent=`${lines.length} producto${lines.length===1?'':'s'} · Total COP`;}
      function draw(){d.querySelector('#qtLines').innerHTML=lines.map((i,index)=>`<article class="qt-line" data-index="${index}"><div class="qt-line-photo">${i.photo?`<img src="${esc(i.photo)}" alt="${esc(i.name)}">`:'<span>Sin foto</span>'}</div><div class="qt-line-main"><strong>${esc(i.name)}</strong><div class="qt-line-fields"><label>Cantidad<input data-field="quantity" type="number" min="1" max="100000" step="1" required value="${i.quantity}"></label><label>Precio unitario COP<input data-field="unit_price" type="number" min="0.01" max="999999999" step="0.01" required value="${i.unit_price}"></label><label>Descuento %<input data-field="discount_percent" type="number" min="0" max="99" step="0.01" required value="${i.discount_percent}"></label><label>Impuesto adicional %<input data-field="tax_percent" type="number" min="0" max="100" step="0.01" required value="${i.tax_percent}"></label></div></div><button type="button" data-remove="${index}" aria-label="Quitar ${esc(i.name)}">×</button></article>`).join('')||'<p class="qt-help">Agrega el primer producto para comenzar.</p>';total();}
      picker();draw();
      const markDirty=e=>{if(!['contact_search','product_search','product'].includes(e?.target?.name))d.dataset.dirty='true';};
      f.addEventListener('input',markDirty);f.addEventListener('change',markDirty);
      const beforeUnload=e=>{if(d.dataset.dirty==='true'){e.preventDefault();e.returnValue='';}};
      window.addEventListener('beforeunload',beforeUnload);
      d.addEventListener('close',()=>window.removeEventListener('beforeunload',beforeUnload));
      f.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>d.querySelector(`#${b.dataset.section}`).scrollIntoView({behavior:'smooth',block:'start'}));
      get('valid_until').min=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota'}).format(new Date());
      function benefitHint(){
        const a=context.activations.find(a=>a.id===get('activation_id').value),hint=d.querySelector('#qtBenefitHint');
        get('benefit_timing').disabled=!a;get('benefit_description').disabled=!a;
        if(!a){get('valid_until').setCustomValidity('');hint.textContent='Esta propuesta se enviará sin beneficio QR.';return;}
        hint.textContent=`${get('benefit_timing').value==='AFTER_PAYMENT'?'El QR se habilitará cuando registres el pago.':'El QR estará disponible al emitir la propuesta.'}${a.ends_at?` La activación vence el ${date(a.ends_at)}.`:''}`;
        const later=a.ends_at&&new Date(`${get('valid_until').value}T23:59:59-05:00`)>new Date(a.ends_at);
        get('valid_until').setCustomValidity(later?'Elige una fecha anterior al vencimiento de la activación o selecciona otro beneficio.':'');
      }
      get('valid_until').addEventListener('change',benefitHint);get('benefit_timing').addEventListener('change',benefitHint);benefitHint();
      d.querySelector('#qtLines').oninput=e=>{const key=e.target.dataset.field;if(!key)return;lines[Number(e.target.closest('[data-index]').dataset.index)][key]=Number(e.target.value);total();};
      d.querySelector('#qtLines').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){lines.splice(Number(b.dataset.remove),1);markDirty();draw();}};
      d.querySelector('#qtFindProduct').onclick=e=>task(d,e.currentTarget,async()=>{catalog=await call(`/products?search=${encodeURIComponent(get('product_search').value)}`);picker();});
      d.querySelector('#qtAddProduct').onclick=e=>task(d,e.currentTarget,async()=>{const p=catalog.find(p=>p.id===get('product').value);if(!p)throw new Error('Selecciona un producto.');if(lines.length>=30)throw new Error('Puedes incluir hasta 30 productos.');if(lines.some(i=>i.product_id===p.id))throw new Error('El producto ya está incluido. Ajusta su cantidad.');let photo=null;if(p.has_photo){const r=await fetch(`/api/business/inventory/products/${p.id}/photo`,{headers:authHeaders()});if(!r.ok)throw new Error('No se pudo cargar la foto. Intenta de nuevo.');photo=(await r.json()).data_url;if(!photo)throw new Error('El producto no tiene una foto disponible.');}lines.push({product_id:p.id,name:p.name,photo,quantity:1,unit_price:Number(p.unit_price),discount_percent:0,tax_percent:0});markDirty();draw();});
      d.querySelector('#qtFindContact').onclick=e=>task(d,e.currentTarget,async()=>{contactRows=await call(`/contacts?search=${encodeURIComponent(get('contact_search').value)}`);get('contact').innerHTML='<option value="">Ingresar datos para esta cotización</option>'+contactRows.map(c=>`<option value="${c.source_type}:${c.id}">${esc(c.name)}${c.email?` · ${esc(c.email)}`:''}</option>`).join('');if(contactId&&!contactRows.some(c=>c.id===contactId))get('contact').insertAdjacentHTML('beforeend',`<option value="${contactSource}:${contactId}">${esc(get('name').value)}</option>`);get('contact').value=contactId?`${contactSource}:${contactId}`:'';d.querySelector('#qtContactHint').textContent=contactRows.length?'Selecciona el contacto para vincular su historial.':'No se encontraron contactos. Puedes escribir el destinatario.';});
      function contactMode(){for(const name of ['name','organization','phone','email','document_id'])get(name).readOnly=Boolean(contactId);d.querySelector('#qtContactHint').textContent=contactId?'Usaremos los datos guardados en Contactos y vincularemos su historial.':'Destinatario de esta cotización. No crea un contacto nuevo.';}
      get('contact').onchange=()=>{const value=get('contact').value;[contactSource,contactId]=value?value.split(':'):[null,null];const c=contactRows.find(c=>c.id===contactId&&c.source_type===contactSource);if(c)for(const name of ['name','phone','email','organization','document_id'])get(name).value=c[name]||'';contactMode();};contactMode();
      get('activation_id').onchange=()=>{const a=context.activations.find(a=>a.id===get('activation_id').value);get('benefit_description').value=a?.description||a?.title||'';benefitHint();};
      f.onsubmit=e=>{e.preventDefault();task(d,f.querySelector('[type="submit"]'),async()=>{if(!lines.length)throw new Error('Agrega al menos un producto.');const body={request_id:requestId,title:get('title').value,valid_until:`${get('valid_until').value}T23:59:59-05:00`,contact_id:contactId,contact_source:contactSource,customer:Object.fromEntries(['name','organization','phone','email','document_id'].map(n=>[n,get(n).value])),items:lines.map(({product_id,quantity,unit_price,discount_percent,tax_percent})=>({product_id,quantity,unit_price,discount_percent,tax_percent})),activation_id:get('activation_id').value||null,benefit_timing:get('benefit_timing').value,benefit_description:get('benefit_description').value,payment_terms:get('payment_terms').value,delivery_terms:get('delivery_terms').value,terms:get('terms').value};const saved=await call(existing&&!copy?`/${existing.id}`:'',existing&&!copy?'PUT':'POST',body);d.dataset.dirty='false';d.close();await load();await detail(saved.id);});};
    }catch(e){error(d,e);}
  }
  root.onclick=e=>{const b=e.target.closest('[data-qt]');if(!b)return;const action=b.dataset.qt;if(action==='new')editor();if(action==='detail')detail(b.dataset.id);if(action==='refresh')load();if(action==='filter'){status=b.dataset.status;offset=0;load();}if(action==='reset'){search='';status='ALL';offset=0;root.querySelector('input[name="search"]').value='';load();}if(action==='next'){offset+=30;load();}if(action==='prev'){offset=Math.max(0,offset-30);load();}};
  window.Quotes={open(){offset=0;ctx=null;search='';status='ALL';shell();return load();},close(){generation++;ctx=null;root.innerHTML='';document.querySelectorAll('.qt-dialog').forEach(d=>d.close());}};
})();

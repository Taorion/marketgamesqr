/* Tarjetas de sellos: reads and mutations always go to the tenant-scoped API. */
(() => {
  const root=document.getElementById('stampCardsWorkspace');if(!root)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v||0));
  const number=v=>Number(v||0).toLocaleString('es-CO');
  const date=v=>v?new Date(v).toLocaleDateString('es-CO'):'';
  const label={ACTIVE:'Activo',PAUSED:'Pausado',ARCHIVED:'Archivado',REDEEMED:'Canjeado',CANCELLED:'Anulado',EXPIRED:'Vencido'};
  const apiCall=(path,method='GET',body)=>api(`/api/business/stamp-cards${path}`,{method,headers:authHeaders(),noClientCache:true,...(body?{body:JSON.stringify(body)}:{})});
  let ctx={programs:[],business:{}},memberRows=[],historyRows=[],memberOffset=0,historyOffset=0,requestVersion=0;
  let filters={from:new Date(Date.now()-29*86400000).toISOString().slice(0,10),to:new Date().toISOString().slice(0,10),program_id:'',search:''};
  function query(extra={}){const q=new URLSearchParams({...filters,...extra});if(!q.get('program_id'))q.delete('program_id');return q.toString();}
  function message(text,error=false){const node=root.querySelector('.sc-message');if(node){node.textContent=text;node.classList.toggle('error',error);}}
  function logo(){const src=ctx.business.logo_data_url||ctx.business.logo_url;return src&&/^(data:image\/(png|jpeg|webp|gif);base64,|https?:\/\/|\/)/i.test(src)?`<img src="${esc(src)}" alt="Logo de ${esc(ctx.business.name)}">`:'';}
  function art(p){return `<div class="sc-card-art"><div class="sc-brand">${logo()}<span>${esc(ctx.business.name||'Tu negocio')}</span></div><h4>${esc(p.name||'Cada visita cuenta')}</h4><p>${esc(p.benefit_value?.label||'Un beneficio para volver')}</p><div class="sc-dots">${Array.from({length:Math.min(Number(p.stamps_required)||8,50)},(_,i)=>`<span class="sc-dot">${i+1}</span>`).join('')}</div></div>`;}
  function shell(){root.innerHTML=`<header class="sc-hero"><div><span class="sc-eyebrow">Optimiza · Fidelización</span><h2>Tarjeta de sellos</h2><p>Escanea o carga el QR del cliente, revisa su tarjeta y pon el sello. Al confirmar el sello, registras la compra y su valor en Qori.</p></div><div class="sc-actions"><button data-action="enroll">Entregar tarjeta</button><button class="sc-primary" data-action="create">Crear programa</button></div></header>
    <section class="sc-quick-stamp" aria-label="Poner un sello"><div><h3>Poner un sello</h3><p>¿Te enviaron el QR por WhatsApp? Guarda la imagen y cárgala aquí.</p></div><div class="sc-actions"><button class="sc-primary" data-action="scan-camera">Escanear QR</button><button data-action="scan-image">Cargar QR</button></div></section><div class="sc-message" role="status" aria-live="polite"></div>
    <form class="sc-toolbar" id="scFilters"><label>Programa<select name="program_id"><option value="">Todos los programas</option></select></label><label>Desde<input type="date" name="from" required value="${filters.from}"></label><label>Hasta<input type="date" name="to" required value="${filters.to}"></label><button type="submit">Actualizar</button><span id="scBalance" class="sc-badge"></span></form>
    <div id="scMetrics" class="sc-kpis" aria-live="polite"><p>Cargando indicadores…</p></div>
    <div class="sc-charts"><article class="sc-panel"><h3>Sellos a través del tiempo</h3><p>Compras identificadas y visitas registradas en el periodo.</p><div id="scTrend"></div></article><article class="sc-panel"><h3>Del sello al beneficio</h3><p>Completar, generar el ticket y canjearlo son pasos distintos.</p><div id="scFunnel"></div></article></div>
    <div class="sc-note" id="scMethod">Los retornos son visitas selladas posteriores a la primera visita registrada de cada cliente. Las ventas vinculadas muestran asociación con el programa; no prueban ventas adicionales causadas por él. Cada compra confirmada al sellar queda vinculada a una venta en Qori.</div>
    <article class="sc-panel"><div class="sc-panel-head"><div><h3>Tus programas</h3><p>Crea la promesa y deja que cada compra acerque a tus clientes.</p></div></div><div id="scPrograms" class="sc-programs"></div></article>
    <article class="sc-panel"><div class="sc-panel-head"><div><h3>Tarjetas de tus clientes</h3><p>Comparte el enlace personal para que cada cliente consulte sus sellos.</p></div><form id="scSearch" class="sc-actions sc-inline-search"><input type="search" name="search" aria-label="Buscar cliente por nombre o documento" placeholder="Nombre o documento" maxlength="120"><button>Buscar</button></form></div><div id="scMembers"></div></article>
    <article class="sc-panel"><div class="sc-panel-head"><div><h3>Historial de sellos</h3><p>Origen, ventas, anulaciones y estado del beneficio.</p></div><button data-action="export">Exportar página CSV</button></div><div id="scHistory"></div></article>`;
    root.querySelector('#scFilters').addEventListener('submit',e=>{e.preventDefault();Object.assign(filters,Object.fromEntries(new FormData(e.target)));memberOffset=historyOffset=0;load();});
    root.querySelector('#scSearch').addEventListener('submit',e=>{e.preventDefault();filters.search=new FormData(e.target).get('search');memberOffset=historyOffset=0;loadLists();});
  }
  async function load(){const version=++requestVersion;try{
    const [context,data]=await Promise.all([apiCall('/context'),apiCall(`/dashboard?${query()}`)]);if(version!==requestVersion)return;
    ctx=context;root.querySelector('#scBalance').textContent=`${number(ctx.ticket_balance)} tickets disponibles`;
    const select=root.querySelector('[name="program_id"]');select.innerHTML=`<option value="">Todos los programas</option>${ctx.programs.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}${(ctx.deleted_programs||[]).map(p=>`<option value="${p.id}">${esc(p.name)} · Eliminado</option>`).join('')}`;select.value=filters.program_id;
    renderMetrics(data);renderPrograms();await loadLists();
  }catch(error){message(error.message,true);}}
  function renderMetrics({metrics:m,trend}){
    const stats=[['Clientes activos',number(m.active_customers),`${number(m.total_customers)} inscritos en total`],['Visitas de retorno',number(m.return_visits),'Visitas posteriores a la primera'],['Clientes que volvieron',`${number(m.return_rate)} %`,`${number(m.returning_customers)} clientes del periodo`],['Ventas vinculadas',money(m.linked_sales),'Compras con sello válido'],['Tarjetas completadas',number(m.completed),`${number(m.pending)} listas para generar beneficio`],['Tickets generados',number(m.issued),'1 ticket Qori por beneficio generado'],['Beneficios canjeados',number(m.redeemed),'Canjes confirmados en el Validador'],['Retorno estimado',m.estimated_return_pct===null?'Sin costo base':`${number(m.estimated_return_pct)} %`,`${money(m.estimated_cost)} en costos configurados`]];
    root.querySelector('#scMetrics').innerHTML=stats.map(([name,value,help])=>`<article class="sc-kpi"><small>${name}</small><strong>${value}</strong><p>${help}</p></article>`).join('');
    const max=Math.max(1,...trend.map(d=>d.stamps));
    root.querySelector('#scTrend').innerHTML=trend.length?`<div class="sc-trend" role="img" aria-label="Sellos diarios: ${esc(trend.map(d=>`${date(d.day)}: ${d.stamps}`).join('; '))}">${trend.map(d=>`<div class="sc-trend-bar" title="${esc(date(d.day))}: ${d.stamps} sellos · ${esc(money(d.sales))}"><span style="height:${Math.round(d.stamps/max*100)}%"></span></div>`).join('')}</div><div class="sc-trend-labels"><span>${date(trend[0].day)}</span><span>${date(trend.at(-1).day)}</span></div>`:'<div class="sc-empty">Aquí verás cómo crece la fidelización cuando registres los primeros sellos.</div>';
    const maxF=Math.max(1,m.completed,m.issued,m.redeemed);root.querySelector('#scFunnel').innerHTML=[['Completadas',m.completed],['Tickets generados',m.issued],['Beneficios canjeados',m.redeemed]].map(([name,n])=>`<div class="sc-funnel-row"><div><span>${name}</span><strong>${number(n)}</strong></div><div class="sc-meter"><span style="width:${Number(n)/maxF*100}%"></span></div></div>`).join('');
    root.querySelector('#scMethod').textContent=`Los retornos son visitas selladas posteriores a la primera registrada de cada cliente. Ventas vinculadas no equivalen a ventas adicionales causadas por el programa. Retorno estimado = (ventas vinculadas − costos configurados) / costos configurados; no incluye margen, impuestos ni otros gastos. Los costos se cuentan al emitir el ticket y al canjear el premio. ${m.needs_review?`${m.needs_review} tarjeta(s) requieren revisión por sellos anulados después de emitir su ticket.`:''}`;
  }
  function renderPrograms(){root.querySelector('#scPrograms').innerHTML=ctx.programs.length?ctx.programs.map(p=>`<article class="sc-card">${art(p)}<div class="sc-card-body"><span class="sc-badge ${p.status!=='ACTIVE'?'warn':''}">${label[p.status]} · ${number(p.members)} clientes</span><p>${p.stamps_required} sellos · ${p.one_per_day?'Máximo uno al día':'Confirmación manual'}<br>${p.purchase_product?`Producto: ${esc(p.purchase_product.product_name)}<br>`:''}${p.benefit_value?.product_scope?`Premio: ${esc(p.benefit_value.product_scope.product_name)}<br>`:''}Compra mínima ${money(p.minimum_purchase)} · Vigencia ${p.card_valid_days} días</p><div class="sc-actions"><button data-action="registration-qr" data-id="${p.id}">QR de inscripción</button><button data-action="edit" data-id="${p.id}">Configurar</button><button data-action="enroll" data-id="${p.id}" ${p.status!=='ACTIVE'?'disabled':''}>Entregar tarjeta</button><button data-action="delete" data-id="${p.id}">Eliminar</button></div></div></article>`).join(''):'<div class="sc-empty"><strong>Tu próxima visita empieza aquí.</strong><br>Crea un programa, elige un beneficio y entrega la primera tarjeta. Crear tarjetas y sumar sellos no consume tickets.</div>';}
  async function loadLists(){try{const [members,history]=await Promise.all([apiCall(`/members?${query({offset:memberOffset})}`),apiCall(`/history?${query({offset:historyOffset})}`)]);memberRows=members.members;historyRows=history.events;
    root.querySelector('#scMembers').innerHTML=memberRows.length?`<div class="sc-table-wrap"><table><thead><tr><th>Cliente</th><th>Programa</th><th>Progreso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${memberRows.map(m=>`<tr><td><strong>${esc(m.name)}</strong><small>${esc(m.document_key)}</small></td><td>${esc(m.program_name)}${m.program_deleted_at?'<small>Programa eliminado</small>':''}<small>Tarjeta ${m.cycle_number}</small></td><td><strong>${m.stamps} / ${m.rules.stamps_required}</strong><small>Vence ${date(m.expires_at)}</small></td><td>${m.review_required?'<span class="sc-badge warn">Revisar anulación</span>':esc(m.claimed_at?(label[m.ticket_status]||'Ticket generado'):new Date(m.expires_at)<new Date()?'Vencida':m.stamps>=m.rules.stamps_required?'Lista para beneficio':'En progreso')}</td><td><div class="sc-actions"><button data-action="share" data-id="${m.id}">Compartir</button>${m.program_status==='ACTIVE'&&!m.claimed_at&&m.stamps<m.rules.stamps_required&&new Date(m.expires_at)>new Date()?`<button data-action="stamp" data-id="${m.id}">Poner sello</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>${pagination('members',memberOffset,25,members.has_more)}`:'<div class="sc-empty">No hay tarjetas con estos filtros. Usa «Entregar tarjeta» para inscribir a un cliente.</div>';
    root.querySelector('#scHistory').innerHTML=historyRows.length?`<div class="sc-table-wrap"><table><thead><tr><th>Fecha / cliente</th><th>Tarjeta</th><th>Sello</th><th>Venta</th><th>Beneficio</th><th>Acción</th></tr></thead><tbody>${historyRows.map(e=>`<tr><td>${date(e.created_at)}<small>${esc(e.name)}</small></td><td>${esc(e.program_name)}<small>Ciclo ${e.cycle_number} · ${e.stamps}/${e.goal}</small></td><td>${e.sale_id?'Compra con sello':'Visita manual histórica'}<small>${esc(e.note)}</small>${e.voided_at?`<small>Anulado: ${esc(e.void_reason)}</small>`:''}</td><td>${e.sale_id?money(e.sale_amount):'Sin venta asociada'}</td><td>${esc(e.claimed_at?(label[e.ticket_status]||'Ticket generado'):'Sin emitir')}${e.review_required?'<small>Requiere revisión</small>':''}</td><td>${e.voided_at?'Historial conservado':`<button data-action="void" data-id="${e.id}">Anular sello</button>`}</td></tr>`).join('')}</tbody></table></div>${pagination('history',historyOffset,50,history.has_more)}`:'<div class="sc-empty">Sin movimientos en el periodo seleccionado.</div>';
  }catch(error){message(error.message,true);}}
  function pagination(kind,offset,size,more){return `<div class="sc-pagination"><button data-action="prev-${kind}" ${!offset?'disabled':''}>Anterior</button><span>Página ${Math.floor(offset/size)+1}</span><button data-action="next-${kind}" ${!more?'disabled':''}>Siguiente</button></div>`;}
  function dialog(title,content){const previous=document.getElementById('scDialog');if(previous){previous.dispatchEvent(new Event('sc-dispose'));previous.close();previous.remove();}const d=document.createElement('dialog');d.id='scDialog';d.className='sc-dialog';d.setAttribute('aria-labelledby','scDialogTitle');d.innerHTML=`<header><h3 id="scDialogTitle">${title}</h3><button type="button" aria-label="Cerrar">✕</button></header><div class="sc-dialog-content">${content}<p class="sc-message" role="status" id="scDialogMessage"></p></div>`;document.body.append(d);d.querySelector('header button').onclick=()=>d.close();d.showModal();return d;}
  function field(name,title,value,type='text',extra=''){return `<label>${title}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
  function formTask(d,fn){d.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await fn(new FormData(e.target));}catch(error){const n=d.querySelector('#scDialogMessage');n.textContent=error.message;n.classList.add('error');}finally{button.disabled=false;}});}
  function inventoryOptions(selected){
    const products=ctx.inventory_products||[],id=selected?.inventory_product_id;
    return `<option value="">Selecciona del inventario</option>${id&&!products.some(p=>p.id===id)?`<option value="${esc(id)}" selected disabled>${esc(selected.product_name)} · No disponible; elige otro</option>`:''}${products.map(p=>`<option value="${esc(p.id)}" ${p.id===id?'selected':''}>${esc(p.name)} · ${esc(p.sku||p.internal_id)}</option>`).join('')}`;
  }
  function editor(id){const p=ctx.programs.find(p=>p.id===id)||{stamps_required:8,minimum_purchase:0,one_per_day:true,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:0,ticket_cost:0,benefit_type:'FREE_GIFT',benefit_value:{}};
    const d=dialog(id?'Configurar programa':'Crear programa de sellos',`<form><div class="sc-form-grid">${field('name','Nombre del programa',p.name||'','text','required maxlength="120"')}${field('stamps_required','Sellos para completar',p.stamps_required,'number','min="2" max="50" required')}<label>Tipo de beneficio<select name="benefit_type">${[['FREE_GIFT','Producto o servicio gratis'],['PERCENT_DISCOUNT','Descuento porcentual'],['FIXED_AMOUNT_DISCOUNT','Descuento en pesos'],['CUSTOM','Beneficio personalizado']].map(([v,t])=>`<option value="${v}" ${v===p.benefit_type?'selected':''}>${t}</option>`).join('')}</select></label>${field('label','Beneficio que recibirá el cliente',p.benefit_value.label||'','text','required maxlength="240" placeholder="Ej. Un café de la casa"')}${field('benefit_number','Valor del descuento (% o COP)',p.benefit_value.percent||p.benefit_value.amount||0,'number','min="0" step="0.01"')}${field('minimum_purchase','Compra mínima para sumar un sello (COP)',p.minimum_purchase,'number','min="0" step="1" required')}${field('card_valid_days','Vigencia de la tarjeta (días)',p.card_valid_days,'number','min="1" max="3650" required')}${field('ticket_valid_days','Vigencia del ticket generado (días)',p.ticket_valid_days,'number','min="1" max="3650" required')}${field('reward_cost','Costo estimado del premio para tu negocio (COP)',p.reward_cost,'number','min="0" step="1" required')}${field('ticket_cost','Costo de tu ticket Qori (COP)',p.ticket_cost,'number','min="0" step="1" required')}<label class="sc-check"><input type="checkbox" name="one_per_day" ${p.one_per_day?'checked':''}>Máximo un sello por día y cliente (hora de Colombia).</label><div class="sc-note">Sellado manual: cada sello requiere la confirmación del negocio. Al confirmar el sello, registras la venta correspondiente. Una venta registrada por otro medio requiere confirmar su sello.</div><label>Estado<select name="status">${['ACTIVE','PAUSED','ARCHIVED'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${label[s]}</option>`).join('')}</select><small>Pausar o archivar detiene nuevas tarjetas y sellos. Los beneficios ya ganados se respetan.</small></label><label>Condiciones para el cliente<textarea name="terms" rows="3" maxlength="4000">${esc(p.terms||'')}</textarea></label><div class="sc-note sc-wide">El negocio revisa las condiciones de la tarjeta y confirma cada sello manualmente. Las tarjetas completas deben generar su beneficio e iniciar una nueva para seguir sumando. ${id?'Los cambios de beneficio y metas aplican a nuevas tarjetas; las entregadas conservan sus condiciones. El sellado manual está disponible para todas las tarjetas activas.':'Crear programas y tarjetas no consume tickets. Generar cada beneficio consume 1 ticket.'}</div></div><footer><button class="sc-primary">Guardar programa</button></footer></form>`);
    const type=d.querySelector('[name="benefit_type"]'),amount=d.querySelector('[name="benefit_number"]');
    type.closest('label').insertAdjacentHTML('beforebegin',`<label>Cómo se obtiene el sello<select name="purchase_rule"><option value="ANY">Por cualquier compra</option><option value="PRODUCT" ${p.purchase_product?'selected':''}>Por un producto específico</option></select><small>Se suma un sello por compra elegible, aunque incluya varias unidades.</small></label><label>Producto que suma el sello<select name="purchase_product_id">${inventoryOptions(p.purchase_product)}</select><small>La compra debe incluir este producto y cumplir el mínimo configurado.</small></label>`);
    type.closest('label').insertAdjacentHTML('afterend',`<label>Producto o servicio del premio<select name="reward_product_id"><option value="">Sin producto de inventario: describir el premio</option>${inventoryOptions(p.benefit_value.product_scope).replace('<option value="">Selecciona del inventario</option>','')}</select><small>El producto elegido quedará identificado en el ticket del beneficio.</small></label>`);
    const purchaseRule=d.querySelector('[name="purchase_rule"]'),purchaseProduct=d.querySelector('[name="purchase_product_id"]'),rewardProduct=d.querySelector('[name="reward_product_id"]');
    const note=d.querySelector('.sc-note.sc-wide');
    note.textContent=`Confirma el producto y el valor pagado al poner el sello. Qori registra la venta y actualiza sus métricas. Si la compra ya está registrada, vincúlala para no duplicarla. Las tarjetas completas deben generar su beneficio e iniciar una nueva para seguir sumando. ${id?'Los cambios de producto, beneficio y metas aplican a nuevas tarjetas; las entregadas conservan sus condiciones. El sellado manual está disponible para todas las tarjetas activas.':'Crear programas y tarjetas no consume tickets. Generar cada beneficio consume 1 ticket.'}`;
    if (!(ctx.inventory_products||[]).length) note.textContent+=' No tienes productos activos: créalos en Inventario para seleccionarlos aquí.';
    function toggle(){
      amount.closest('label').hidden=!['PERCENT_DISCOUNT','FIXED_AMOUNT_DISCOUNT'].includes(type.value);amount.max=type.value==='PERCENT_DISCOUNT'?'100':'999999999';
      purchaseProduct.closest('label').hidden=purchaseRule.value!=='PRODUCT';purchaseProduct.required=purchaseRule.value==='PRODUCT';purchaseProduct.disabled=purchaseRule.value!=='PRODUCT';
      rewardProduct.closest('label').hidden=type.value!=='FREE_GIFT';rewardProduct.disabled=type.value!=='FREE_GIFT';
    }
    type.onchange=toggle;purchaseRule.onchange=toggle;toggle();
    rewardProduct.onchange=()=>{const product=(ctx.inventory_products||[]).find(p=>p.id===rewardProduct.value);if(product)d.querySelector('[name="label"]').value=`${product.name} gratis`.slice(0,240);};
    formTask(d,async f=>{const data=Object.fromEntries(f);data.one_per_day=f.has('one_per_day');data.allow_manual=true;data.purchase_product=data.purchase_rule==='PRODUCT'?{inventory_product_id:data.purchase_product_id}:null;data.benefit_value={label:data.label,...(data.benefit_type==='PERCENT_DISCOUNT'?{percent:Number(data.benefit_number)}:data.benefit_type==='FIXED_AMOUNT_DISCOUNT'?{amount:Number(data.benefit_number)}:data.benefit_type==='FREE_GIFT'&&data.reward_product_id?{product_scope:{inventory_product_id:data.reward_product_id}}:{})};delete data.label;delete data.benefit_number;delete data.purchase_rule;delete data.purchase_product_id;delete data.reward_product_id;await apiCall(id?`/programs/${id}`:'/programs',id?'PUT':'POST',data);d.close();await load();message('Programa guardado.');});
  }
  function deleteProgram(id){
    const p=ctx.programs.find(p=>p.id===id);if(!p)return;
    const d=dialog('Eliminar programa de sellos',`<p>Vas a eliminar <strong>${esc(p.name)}</strong>.</p><p>El programa desaparecerá de «Tus programas» y dejará de recibir tarjetas y sellos nuevos.</p><p>Las tarjetas entregadas, el historial y los tickets emitidos se conservarán. Los clientes con una tarjeta completa y vigente podrán generar su beneficio. Puedes consultar los datos usando el filtro de programas eliminados.</p><form><footer><button type="button" data-cancel>Cancelar</button><button class="sc-primary">Eliminar programa</button></footer></form>`);
    d.querySelector('[data-cancel]').onclick=()=>d.close();
    formTask(d,async()=>{await apiCall(`/programs/${id}`,'DELETE');d.close();await load();message('Programa eliminado. Su historial y beneficios ganados se conservan.');});
  }
  async function registrationQr(id){
    const scope=businessScopeKey(),d=dialog('QR de inscripción','<p role="status">Preparando el QR del programa…</p>');
    try{
      const result=await apiCall(`/programs/${id}/enrollment-qr`);
      if(!d.isConnected||!d.open||!isCurrentBusinessScope(scope))return;
      const paused=result.program_status&&result.program_status!=='ACTIVE';
      d.querySelector('.sc-dialog-content').innerHTML=`<div class="sc-registration-qr"><span class="sc-eyebrow">${esc(ctx.business.name)}</span><h4>${esc(result.program_name)}</h4><p>Escanea y crea tu tarjeta de sellos</p><img src="${esc(result.qr_image)}" alt="QR de inscripción a ${esc(result.program_name)}"></div><p>Exhibe este QR en tu negocio o comparte el enlace. Cada cliente registra sus datos y recibe su propia tarjeta. El programa debe estar activo para aceptar inscripciones.</p><a class="sc-share-link" href="${esc(result.url)}" target="_blank" rel="noopener noreferrer">${esc(result.url)}</a><div class="sc-actions"><a href="${esc(result.qr_image)}" download="qr-inscripcion-${id}.png">Descargar QR</a><button id="scCopyRegistration">Copiar enlace</button><button id="scShareRegistration">Compartir</button><a href="${esc(result.url)}" target="_blank" rel="noopener noreferrer">Abrir inscripción</a></div><p class="sc-message" role="status" id="scDialogMessage"></p>`;
      if(paused)d.querySelector('.sc-registration-qr').insertAdjacentHTML('afterend',`<p class="sc-note" role="status">Programa ${result.program_status==='PAUSED'?'pausado':'archivado'}: no acepta inscripciones. Actívalo desde Configurar para que los clientes puedan crear su tarjeta. Este QR seguirá siendo el mismo.</p>`);
      const copyLink=async()=>{try{await navigator.clipboard.writeText(result.url);d.querySelector('#scDialogMessage').textContent='Enlace de inscripción copiado.';}catch{d.querySelector('#scDialogMessage').textContent='Selecciona y copia el enlace que aparece arriba.';}};
      d.querySelector('#scCopyRegistration').onclick=copyLink;
      d.querySelector('#scShareRegistration').onclick=async()=>{
        if(navigator.share){try{await navigator.share({title:result.program_name,text:`Crea tu tarjeta de sellos de ${ctx.business.name}`,url:result.url});return;}catch(error){if(error.name==='AbortError')return;}}
        await copyLink();
      };
    }catch(error){if(d.isConnected&&d.open)d.querySelector('#scDialogMessage').textContent=error.message;}
  }
  function enrollForm(id){const active=ctx.programs.filter(p=>p.status==='ACTIVE');if(!active.length){message('Crea o activa un programa antes de entregar tarjetas.',true);return;}
    const d=dialog('Entregar tarjeta a un cliente',`<form><div class="sc-form-grid"><label class="sc-wide">Programa<select name="program_id">${active.map(p=>`<option value="${p.id}" ${p.id===id?'selected':''}>${esc(p.name)} · ${p.stamps_required} sellos</option>`).join('')}</select></label>${field('name','Nombre del cliente','','text','required maxlength="160" autocomplete="name"')}${field('document_id','Documento del cliente','','text','required minlength="3" maxlength="80"')}${field('phone','Celular (opcional)','','tel','maxlength="40"')}${field('email','Correo (opcional)','','email','maxlength="180"')}<label class="sc-check sc-wide"><input type="checkbox" name="consent" required>El cliente autoriza el uso de sus datos para administrar su tarjeta de fidelización.</label><div class="sc-note sc-wide">Usa el mismo documento al registrar compras. Si el cliente ya tiene tarjeta en este programa, recuperaremos su enlace sin duplicar la inscripción.</div></div><footer><button class="sc-primary">Crear y obtener enlace</button></footer></form>`);
    formTask(d,async f=>{const result=await apiCall('/members','POST',{...Object.fromEntries(f),consent:f.has('consent')});d.close();await load();share({...result.member,url:result.url});});
  }
  function share(m){const p=ctx.programs.find(p=>p.id===m.program_id)||m.rules||{};const d=dialog('Comparte la tarjeta',`<div class="sc-preview sc-card">${art(p)}</div><p>Enlace personal de <strong>${esc(m.name)}</strong>. Compártelo solo con su titular; desde él podrá consultar sus sellos y generar el beneficio.</p><a class="sc-share-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.url)}</a><div class="sc-actions"><button id="scCopy">Copiar enlace</button><button id="scNativeShare">Compartir</button><a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Abrir tarjeta</a></div>`);d.querySelector('#scCopy').onclick=async()=>{try{await navigator.clipboard.writeText(m.url);d.querySelector('#scDialogMessage').textContent='Enlace copiado.';}catch{d.querySelector('#scDialogMessage').textContent='Selecciona y copia el enlace que aparece arriba.';}};d.querySelector('#scNativeShare').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Tu tarjeta de sellos',text:`Tu tarjeta de ${ctx.business.name}`,url:m.url});}catch{}}else d.querySelector('#scCopy').click();};}
  function manual(m){if(m)openFromValidator(m.id).catch(error=>message(error.message,true));}
  function voidEvent(id){const d=dialog('Anular sello',`<p>El historial y la venta vinculada se conservarán. Si la compra fue cancelada, anula la venta desde Ventas. Si la tarjeta pierde un sello requerido, su ticket sin usar se anulará. Si ya se canjeó, quedará marcado para revisión.</p><form>${field('reason','Motivo de la anulación','','text','required minlength="5" maxlength="500"')}<footer><button>Confirmar anulación</button></footer></form>`);formTask(d,async f=>{await apiCall(`/events/${id}/void`,'POST',Object.fromEntries(f));d.close();await load();message('Sello anulado; historial conservado.');});}
  function exportCsv(){const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"';const rows=[['Fecha','Cliente','Documento','Programa','Ciclo','Origen','Venta COP','Anulado','Motivo'],...historyRows.map(e=>[e.created_at,e.name,e.document_key,e.program_name,e.cycle_number,e.source,e.sale_amount,e.voided_at,e.void_reason])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='historial-sellos.csv';a.click();URL.revokeObjectURL(url);}
  root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;const a=button.dataset.action,id=button.dataset.id;
    if(a==='scan-camera')openScanner('camera');if(a==='scan-image')openScanner('image');if(a==='registration-qr')registrationQr(id);if(a==='create'||a==='edit')editor(id);if(a==='delete')deleteProgram(id);if(a==='enroll')enrollForm(id);if(a==='share')share(memberRows.find(m=>m.id===id));if(a==='stamp')manual(memberRows.find(m=>m.id===id));if(a==='void')voidEvent(id);if(a==='export')exportCsv();
    if(a.endsWith('-members')){memberOffset=Math.max(0,memberOffset+(a.startsWith('next')?25:-25));loadLists();}if(a.endsWith('-history')){historyOffset=Math.max(0,historyOffset+(a.startsWith('next')?50:-50));loadLists();}
  });
  function openScanner(mode='image'){
    const scope=businessScopeKey(),d=dialog('Leer QR de la tarjeta',`<p>Escanea el QR del cliente o carga la imagen que recibiste por WhatsApp.</p><div class="sc-actions"><button type="button" data-camera>Usar cámara</button><button type="button" data-upload>Cargar imagen del QR</button></div><input type="file" accept="image/*" data-qr-file hidden><video data-qr-video playsinline muted hidden></video><p class="sc-note">Leer el QR solo abre la tarjeta. Tú confirmas el sello después.</p>`);
    d.classList.add('sc-scan-dialog');
    const video=d.querySelector('video'),file=d.querySelector('[data-qr-file]'),status=d.querySelector('#scDialogMessage');
    let stream=null,timer=null,generation=0,reading=false;
    const initialView=document.body.dataset.currentView;
    const current=()=>d.isConnected&&d.open&&isCurrentBusinessScope(scope);
    function stop(){generation++;clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;video.hidden=true;}
    const observer=new MutationObserver(()=>{if(!current()||document.body.dataset.currentView!==initialView){dispose();d.close();}});
    observer.observe(document.body,{attributes:true,attributeFilter:['data-current-view']});
    function dispose(){stop();observer.disconnect();}
    d.addEventListener('close',dispose,{once:true});d.addEventListener('sc-dispose',dispose,{once:true});
    function say(text,error=false){if(current()){status.textContent=text;status.classList.toggle('error',error);}}
    async function decode(source,width,height){
      await ensureJsQrLoaded();
      // Try both full resolution and a reduced image for screenshots and compressed WhatsApp images.
      for(const max of [1800,1000]){
        const scale=Math.min(1,max/Math.max(width,height)),canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,canvas.width,canvas.height);
        const frame=ctx.getImageData(0,0,canvas.width,canvas.height),qr=window.jsQR(frame.data,frame.width,frame.height,{inversionAttempts:'attemptBoth'});
        if(qr)return qr.data;
      }
      return '';
    }
    async function found(raw){
      const id=extractStampCardQrId(raw);
      if(!id){say('Ese QR no identifica una tarjeta de sellos. Pide al cliente el QR que aparece dentro de su tarjeta.',true);return false;}
      if(!current())return false;
      dispose();d.close();
      try{await openFromValidator(id);}catch{/* The card dialog displays tenant-safe errors. */}
      return true;
    }
    d.querySelector('[data-upload]').onclick=()=>file.click();
    file.onchange=async()=>{
      const selected=file.files?.[0];file.value='';if(!selected||reading)return;
      stop();const version=generation;reading=true;
      try{
        if(selected.size>20*1024*1024)throw new Error('La imagen supera 20 MB. Guarda una captura del QR y vuelve a cargarla.');
        if(selected.type&&!selected.type.startsWith('image/'))throw new Error('Selecciona una imagen del QR (JPG, PNG o WebP).');
        say('Leyendo imagen…');
        const url=URL.createObjectURL(selected),img=new Image();
        try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('No pudimos abrir la imagen. Prueba con una captura JPG o PNG.'));img.src=url;});
          if(!current()||version!==generation)return;
          const raw=await decode(img,img.naturalWidth,img.naturalHeight);
          if(!current()||version!==generation)return;
          if(raw)await found(raw);else say('No encontramos un QR legible. Carga la imagen original o recorta una captura donde se vea completo.',true);
        }finally{URL.revokeObjectURL(url);}
      }catch(error){say(error.message,true);}finally{reading=false;}
    };
    async function camera(){
      if(reading)return;stop();const version=generation;
      try{
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('La cámara no está disponible en este navegador. Puedes cargar una imagen del QR.');
        say('Permite el acceso a la cámara y apunta al QR de la tarjeta.');await ensureJsQrLoaded();
        if(!current()||version!==generation)return;
        const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
        if(!current()||version!==generation){next.getTracks().forEach(track=>track.stop());return;}
        stream=next;video.srcObject=stream;video.hidden=false;await video.play();
        async function frame(){
          if(!current()||version!==generation){if(version===generation)stop();return;}
          try{if(video.readyState>=2){const raw=await decode(video,video.videoWidth,video.videoHeight);if(!current()||version!==generation)return;if(raw&&await found(raw))return;}}
          catch(error){say('No pudimos leer la cámara. Puedes cargar una imagen del QR.',true);stop();return;}
          timer=setTimeout(frame,300);
        }
        frame();
      }catch(error){if(version!==generation)return;stop();say(error.name==='NotAllowedError'?'No se autorizó la cámara. Permite el acceso o carga la imagen del QR.':error.message,true);}
    }
    d.querySelector('[data-camera]').onclick=camera;
    if(mode==='camera')camera();else file.click();
  }
  function purchaseForm(result){
    const products=result.purchase?.products||[],sales=result.purchase?.existing_sales||[],required=result.card.rules.purchase_product?.inventory_product_id;
    const selected=products.find(p=>p.id===required);
    return `<form data-purchase-form class="sc-purchase"><h4>Compra que confirma este sello</h4><label>Registrar compra<select name="mode"><option value="new">Nueva venta en Qori</option>${sales.length?'<option value="existing">Vincular una venta ya registrada</option>':''}</select></label><div data-new-purchase class="sc-form-grid"><label class="sc-wide">Producto comprado<select name="inventory_product_id" required><option value="">Selecciona el producto</option>${products.map(p=>`<option value="${esc(p.id)}" ${p.id===required?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>${field('quantity','Cantidad comprada',1,'number','min="1" max="10000" step="1" required')}${field('sale_amount','Total pagado (COP)',selected?Number(selected.unit_price):'','number','min="0.01" max="999999999" step="0.01" required')}</div><label data-existing-purchase hidden>Venta del cliente<select name="existing_sale_id" disabled><option value="">Selecciona la compra</option>${sales.map(s=>`<option value="${esc(s.id)}">${esc(date(s.created_at))} · ${esc(s.product_name)} · ${esc(money(s.sale_amount))}</option>`).join('')}</select></label>${!products.length?'<p class="sc-note">No hay un producto activo disponible para esta tarjeta. Configúralo en Productos o vincula una venta válida ya registrada.</p>':''}</form>`;
  }
  function bindPurchaseForm(d,result){
    const form=d.querySelector('[data-purchase-form]');if(!form)return;
    const updateAmount=()=>{const p=result.purchase.products.find(p=>p.id===form.elements.inventory_product_id.value);form.elements.sale_amount.value=p?Math.round(Number(p.unit_price)*Number(form.elements.quantity.value)*100)/100:'';};
    form.elements.inventory_product_id.onchange=updateAmount;form.elements.quantity.oninput=updateAmount;
    form.elements.mode.onchange=()=>{const existing=form.elements.mode.value==='existing';form.querySelector('[data-new-purchase]').hidden=existing;form.querySelector('[data-existing-purchase]').hidden=!existing;['inventory_product_id','quantity','sale_amount'].forEach(k=>form.elements[k].disabled=existing);form.elements.existing_sale_id.disabled=!existing;form.elements.existing_sale_id.required=existing;d.querySelector('[data-scan-stamp]').textContent=existing?'Poner sello y vincular venta':'Poner sello y registrar venta';};
    form.onsubmit=e=>{e.preventDefault();d.querySelector('[data-scan-stamp]').click();};
  }
  async function openFromValidator(id){
    const scope=businessScopeKey(),d=dialog('Compra y tarjeta del cliente','<p role="status">Buscando la tarjeta…</p>');
    d.classList.add('sc-scan-dialog');
    const current=()=>d.isConnected&&d.open&&isCurrentBusinessScope(scope);
    let busy=false,stamped=false;
    d.addEventListener('close',()=>{if(stamped&&isCurrentBusinessScope(scope)&&root.querySelector('#scMembers'))load();},{once:true});
    function render(result){
      if(!current())return;
      const c=result.card,r=c.rules;
      d.querySelector('.sc-dialog-content').innerHTML=`<div class="sc-scan-card"><span class="sc-eyebrow">${esc(c.business_name)}</span><h4>${esc(c.name)}</h4><p>Documento: ${esc(c.document_id)}</p><p>${esc(c.program_name)} · Tarjeta ${c.cycle_number}</p><strong class="sc-scan-progress">${c.stamps} de ${r.stamps_required} sellos</strong><div class="sc-dots" aria-label="${c.stamps} de ${r.stamps_required} sellos">${Array.from({length:r.stamps_required},(_,i)=>`<span class="sc-dot ${i<c.stamps?'filled':''}" aria-hidden="true">${i<c.stamps?'✓':i+1}</span>`).join('')}</div><p><strong>Premio:</strong> ${esc(r.benefit_value.label)}</p><p>Vence ${date(c.expires_at)}${r.one_per_day?' · Máximo un sello al día':''}</p>${Number(r.minimum_purchase)>0?`<p>Compra mínima: ${money(r.minimum_purchase)}</p>`:''}${r.terms?`<p>Condiciones: ${esc(r.terms)}</p>`:''}${r.purchase_product?`<p>Producto requerido: ${esc(r.purchase_product.product_name)}</p>`:''}</div><p class="sc-message" role="status" id="scDialogMessage">${stamped?`Sello registrado. ${result.sale?.linked_existing?'Venta existente vinculada':`Venta de ${money(result.sale?.sale_amount)} registrada en Qori`}.`:esc(result.blocked_reason||'Revisa el producto y el valor pagado. Al confirmar se registra la compra y se pone el sello.')}</p>${result.can_stamp&&!stamped?purchaseForm(result):''}${result.can_stamp&&!stamped?'<p class="sc-note">Confirma que el cliente cumple las condiciones del programa. La compra quedará registrada en las ventas y métricas de Qori.</p>':''}<footer><button type="button" data-scan-close>Cerrar tarjeta</button><button type="button" class="sc-primary" data-scan-stamp ${!result.can_stamp||stamped?'disabled':''}>${stamped?'Compra y sello registrados':'Poner sello y registrar venta'}</button></footer>`;
      bindPurchaseForm(d,result);
      d.querySelector('[data-scan-close]').onclick=()=>d.close();
      d.querySelector('[data-scan-stamp]').onclick=async()=>{
        if(busy||stamped||!result.can_stamp||!current())return;
        const form=d.querySelector('[data-purchase-form]');if(!form?.reportValidity())return;
        const f=new FormData(form),purchase=f.get('mode')==='existing'?{existing_sale_id:f.get('existing_sale_id')}:{inventory_product_id:f.get('inventory_product_id'),quantity:Number(f.get('quantity')),sale_amount:Number(f.get('sale_amount'))};
        busy=true;const button=d.querySelector('[data-scan-stamp]');button.disabled=true;button.textContent='Sellando…';
        try{
          const updated=await apiCall(`/validator/${encodeURIComponent(id)}/stamp`,'POST',{cycle_id:c.cycle_id,expected_stamps:c.stamps,expected_voids:c.void_count,purchase});
          stamped=true;if(current()){if(typeof clearApiResponseCache==='function')clearApiResponseCache();if(typeof invalidateCurrentPortalView==='function'){['sales','leads','inventory','dashboard'].forEach(view=>invalidateCurrentPortalView(view));}if(typeof state!=='undefined'){state.commandCenter=null;state.rmsMachineLoaded=false;}}render(updated);if(current()&&updated.duplicate)d.querySelector('#scDialogMessage').textContent='Esta confirmación ya fue registrada. No se agregó otro sello.';
        }catch(error){
          if(current()){const message=d.querySelector('#scDialogMessage');message.textContent=error.message;message.classList.add('error');button.disabled=false;button.textContent='Poner sello y registrar venta';}
        }finally{busy=false;}
      };
    }
    try{render(await apiCall(`/validator/${encodeURIComponent(id)}`));}
    catch(error){if(current()){d.querySelector('.sc-dialog-content').innerHTML='<p class="sc-message error" role="status"></p>';d.querySelector('[role="status"]').textContent=error.message;}throw error;}
  }
  window.StampCards={open:()=>{shell();load();},openFromValidator};
  if(document.body.dataset.currentView==='stamp-cards')window.StampCards.open();
})();

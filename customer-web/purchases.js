/* Planned purchases are private. Only confirmed expenses enter financial history. */
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(n,c)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:c==='COP'?0:2}).format(Number(n)/100);
 const categories={alimentacion:'Alimentación',supermercado:'Supermercado',transporte:'Transporte',hogar:'Hogar',salud:'Salud',educacion:'Educación',entretenimiento:'Entretenimiento',cuidado_personal:'Cuidado personal',servicios:'Servicios',otros:'Otros'};
 const field=(name,label,value='',attrs='')=>'<label class="field">'+label+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
 const select=(name,label,items,value)=>'<label class="field">'+label+'<select name="'+name+'">'+Object.entries(items).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===value?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';
 const today=ctx=>{const parts=new Intl.DateTimeFormat('en',{timeZone:ctx.account.timezone||'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k).value;return get('year')+'-'+get('month')+'-'+get('day');};
 function bindForm(d,ctx,save,refresh){
  d.querySelector('form').onsubmit=async e=>{
   e.preventDefault();e.stopPropagation();const button=e.submitter||d.querySelector('button[type=submit]');button.disabled=true;
   try{await save(Object.fromEntries(new FormData(e.target)));d.close();await refresh();}
   catch(error){ctx.showError(error.message,d.querySelector('#dialogError'));}finally{button.disabled=false;}
  };
 }
 function edit(ctx,refresh,plan=null){
  const request_id=crypto.randomUUID();
  const d=ctx.dialog(plan?'Editar compra planeada':'¿Qué necesitas comprar?','<form id="purchasePlanForm" class="stack">'+
   field('title','Compra o producto',plan?.title||'','required maxlength="160" placeholder="Ej. mercado de la semana"')+
   '<div class="purchase-fields">'+field('estimated_amount','Máximo que quieres destinar',plan?.estimated_amount||'','required type="number" min=".01" step=".01"')+
   select('currency','Moneda',{COP:'COP',USD:'USD',EUR:'EUR'},plan?.currency||ctx.account.currency||'COP')+'</div>'+
   select('category','Categoría',categories,plan?.category||'otros')+field('target_date','Fecha prevista (opcional)',plan?.target_date||'','type="date"')+
   '<label class="field">Notas<textarea name="note" maxlength="2000">'+esc(plan?.note)+'</textarea></label><p class="small muted">Planear no registra un gasto ni reserva dinero. Las compras sin fecha se incluyen en la previsión de este mes.</p><button type="submit" class="primary">Guardar plan de compra</button></form>');
  bindForm(d,ctx,f=>ctx.request('/purchases'+(plan?'/'+plan.id:''),{...f,target_date:f.target_date||null,...(plan?{revision:plan.revision}:{request_id})},plan?'PUT':'POST'),refresh);
 }
 async function finish(ctx,refresh,plan,existing){
  const d=ctx.dialog(existing?'Vincular una compra registrada':'Registrar compra pagada','<p>Cargando…</p>');
  try{
   let html;
   if(existing){
    const r=await ctx.request('/purchases/'+plan.id+'/candidates');
    const options={'':'Selecciona el movimiento',...Object.fromEntries(r.movements.map(m=>[m.entry_id?'entry:'+m.entry_id:'sale:'+m.sale_id,m.date+' · '+m.merchant+' · '+money(m.amount_minor,m.currency)]))};
    html='<p>Selecciona el gasto o la compra recibida de Empresa. Vincularla no vuelve a sumarla a tus gastos.</p>'+select('movement','Movimientos de los últimos 90 días',options,'');
   }else{
    html='<p>Si el negocio ya envió esta compra a tu cuenta, usa <strong>Vincular compra registrada</strong> para evitar duplicarla.</p>'+field('merchant','Negocio o concepto',plan.title,'required maxlength="160"')+
     field('amount','Importe realmente pagado · '+plan.currency,plan.estimated_amount,'required type="number" min=".01" step=".01"')+
     field('paid_on','Fecha de pago',today(ctx),'required type="date" max="'+today(ctx)+'"');
   }
   d.querySelector('.dialog-body').innerHTML='<form id="purchaseCompleteForm" class="stack">'+html+'<label class="check"><input type="checkbox" required>Confirmo que esta compra ya está pagada.</label><p id="dialogError" class="error" role="alert"></p><button type="submit" class="primary">'+(existing?'Vincular sin duplicar':'Guardar gasto y completar compra')+'</button></form>';
   bindForm(d,ctx,f=>{
    let body={revision:plan.revision,confirmed:true};
    if(existing){if(!f.movement)throw Error('Selecciona una compra registrada.');const [type,id]=f.movement.split(':');body[type==='entry'?'entry_id':'sale_id']=id;}
    else Object.assign(body,f);
    return ctx.request('/purchases/'+plan.id+'/complete',body);
   },refresh);
  }catch(e){ctx.showError(e.message,d.querySelector('.dialog-body'));}
 }
 async function opportunities(ctx,plan){
  const d=ctx.dialog('Beneficios para tu compra','<form id="purchaseBenefitSearch" class="purchase-fields">'+field('search','Qué buscas',plan.title,'maxlength="100" required')+'<button type="submit" class="primary">Buscar</button></form><p class="small muted">Consulta precio, vigencia y condiciones antes de comprar. Un beneficio solo te conviene si responde a lo que necesitas.</p><div id="purchaseOpportunities" role="status"></div><div class="row"><a class="secondary" href="#wallet">Mis beneficios disponibles</a><a class="secondary" href="#saved">Mis guardados</a></div>');
  d.querySelectorAll('a').forEach(a=>a.onclick=()=>d.close());let version=0;
  const search=async()=>{
   const turn=++version,target=d.querySelector('#purchaseOpportunities'),params=new URLSearchParams({search:d.querySelector('[name=search]').value});
   target.textContent='Buscando oportunidades publicadas…';
   try{
    const [offers,places]=await Promise.all([ctx.request('/explore?'+params),ctx.request('/explore/directory?'+params)]);
    if(turn!==version||!d.isConnected)return;
    target.innerHTML='<h3>Beneficios publicados</h3>'+(offers.publications.map(p=>{
     const priced=p.kind==='PRODUCT'&&p.product_price!=null;
     return '<article class="purchase-opportunity"><strong>'+esc(p.title)+'</strong><p>'+esc(p.business_name)+'</p>'+(priced?'<p>'+money(Number(p.product_price)*100,'COP')+(plan.currency==='COP'&&Number(p.product_price)>Number(plan.estimated_amount)?' · Supera el importe que planeaste':'')+'</p>':'')+'<p>'+esc(p.benefit||p.description)+'</p><a class="secondary" href="#publication/'+encodeURIComponent(p.id)+'">Ver condiciones y disponibilidad →</a></article>';
    }).join('')||'<p>No hay beneficios publicados que coincidan. No necesitas cambiar tu compra para aprovechar una oferta.</p>')+
     '<h3>Negocios Qori</h3>'+(places.businesses.slice(0,6).map(b=>'<p><a href="#business/'+encodeURIComponent(b.slug)+'">'+esc(b.name)+' →</a></p>').join('')||'<p>No encontramos negocios con esa búsqueda.</p>');
    target.querySelectorAll('a').forEach(a=>a.onclick=()=>d.close());
   }catch(e){target.textContent=e.message;}
  };
  d.querySelector('form').onsubmit=e=>{e.preventDefault();e.stopPropagation();search();};await search();
 }
 function summary(d){
  const projected=d.projected_remaining_minor;
  return '<section class="panel purchase-budget"><div><span class="eyebrow">Antes de comprar · '+esc(d.currency)+'</span><h2>'+(projected==null?'Define tu presupuesto de este mes':projected<0?'Tus planes superan el presupuesto':'Margen previsto en tu presupuesto')+'</h2>'+
   (projected==null?'<p>Un presupuesto mensual total permite contrastar gastos, obligaciones y compras pendientes.</p><a class="secondary" href="#planning">Crear mi presupuesto</a>':'<strong class="purchase-total">'+money(projected,d.currency)+'</strong>')+
   '<p class="small muted">Presupuesto menos gastos registrados, pagos pendientes hasta fin de mes y compras planeadas para este mes o sin fecha. Es una previsión; no representa tu saldo bancario.</p></div>'+
   '<dl class="purchase-breakdown"><div><dt>Gastos registrados</dt><dd>'+money(d.spent_minor,d.currency)+'</dd></div><div><dt>Pagos pendientes</dt><dd>'+money(d.obligations_minor,d.currency)+'</dd></div><div><dt>Compras planeadas</dt><dd>'+money(d.planned_minor,d.currency)+'</dd></div></dl></section>';
 }
 async function render(page,ctx){
  let filter='PLANNED',currency=ctx.account.currency||'COP',generation=0;
  const refresh=async()=>{
   const turn=++generation;page.innerHTML='<p role="status">Organizando tus compras y tu presupuesto…</p>';
   try{
    const d=await ctx.request('/purchases/overview?currency='+encodeURIComponent(currency));if(!page.isConnected||turn!==generation)return;
    page.innerHTML='<div class="page-heading"><div><span class="eyebrow">Compra con intención</span><h1>Mis compras</h1><p>Planea lo que necesitas, encuentra beneficios y registra lo que pagas.</p></div><button class="primary" id="newPurchase">+ Planear compra</button></div>'+
     '<div class="purchase-toolbar">'+select('purchaseCurrency','Ver importes en',{COP:'COP',USD:'USD',EUR:'EUR'},currency)+'<a class="secondary" href="#history">Historial de compras y gastos</a><a class="secondary" href="#payments">Agenda de pagos</a></div>'+summary(d)+
     '<div class="purchase-filters" aria-label="Estado de las compras">'+[['PLANNED','Por comprar'],['PURCHASED','Compradas'],['CANCELLED','Canceladas']].map(([k,v])=>'<button class="secondary" data-filter="'+k+'" aria-pressed="'+(filter===k)+'">'+v+'</button>').join('')+'</div><div id="purchasePlans" class="purchase-plans"></div>';
    page.querySelector('#newPurchase').onclick=()=>edit(ctx,refresh);
    page.querySelector('[name=purchaseCurrency]').onchange=e=>{currency=e.target.value;refresh();};
    const draw=()=>{
     const plans=d.plans.filter(p=>p.status===filter&&p.currency===currency),list=page.querySelector('#purchasePlans');
     list.innerHTML=plans.map(p=>'<article class="panel purchase-plan"><div><span class="eyebrow">'+esc(categories[p.category])+' · '+esc(p.target_date||'Sin fecha')+'</span><h2>'+esc(p.title)+'</h2><p>Planeado: <strong>'+money(p.estimated_minor,p.currency)+'</strong></p>'+
      (p.actual?'<p>Pagado: <strong>'+money(p.actual.amount_minor,p.actual.currency)+'</strong></p><p class="small">'+(p.difference_minor==null?'La moneda del movimiento cambió.':p.difference_minor<0?money(-p.difference_minor,p.currency)+' por encima de lo planeado':money(p.difference_minor,p.currency)+' por debajo de lo planeado')+'</p>':'')+
      (p.needs_review?'<p class="error">El movimiento vinculado ya no está disponible como gasto pagado. Revisa tu historial.</p>':'')+'<p>'+esc(p.note)+'</p></div><div class="purchase-actions">'+
      (p.status==='PLANNED'?'<button class="primary" data-opportunities="'+p.id+'">Buscar beneficios</button><button class="secondary" data-paid="'+p.id+'">Registrar compra pagada</button><button class="secondary" data-link="'+p.id+'">Vincular compra registrada</button><button class="quiet" data-edit="'+p.id+'">Editar plan</button><button class="quiet" data-state="'+p.id+'" data-action="CANCEL">Cancelar plan</button>':'<button class="secondary" data-state="'+p.id+'" data-action="REOPEN">Volver a planear</button>')+'</div></article>').join('')||'<section class="panel"><h2>'+(filter==='PLANNED'?'Dale un plan a tu próxima compra':'No hay compras en esta sección')+'</h2><p>'+(filter==='PLANNED'?'Anota qué necesitas y cuánto quieres destinar antes de buscar ofertas.':'Las compras se organizan aquí cuando actualizas su estado.')+'</p></section>';
     const plan=id=>plans.find(p=>p.id===id);
     list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(ctx,refresh,plan(b.dataset.edit)));
     list.querySelectorAll('[data-opportunities]').forEach(b=>b.onclick=()=>opportunities(ctx,plan(b.dataset.opportunities)));
     list.querySelectorAll('[data-paid]').forEach(b=>b.onclick=()=>finish(ctx,refresh,plan(b.dataset.paid),false));
     list.querySelectorAll('[data-link]').forEach(b=>b.onclick=()=>finish(ctx,refresh,plan(b.dataset.link),true));
     list.querySelectorAll('[data-state]').forEach(b=>b.onclick=async()=>{
      const p=plan(b.dataset.state);b.disabled=true;
      try{await ctx.request('/purchases/'+p.id+'/state',{revision:p.revision,action:b.dataset.action});await refresh();}catch(e){ctx.showError(e.message);b.disabled=false;}
     });
    };
    page.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;page.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();});
    draw();
   }catch(e){if(page.isConnected){page.innerHTML='<section class="panel"><h1>Mis compras</h1><p>No pudimos cargar tu planificación.</p><button id="retryPurchases" class="primary">Reintentar</button><a class="secondary" href="#history">Ver historial</a></section>';ctx.showError(e.message);page.querySelector('#retryPurchases').onclick=refresh;}}
  };await refresh();
 }
 window.QoriPurchases={render,edit,summary};
})();

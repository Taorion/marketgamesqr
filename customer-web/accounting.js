/* Each view receives an immutable book context; switching never redirects an open form's money. */
(()=>{
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(n,c)=>n==null?'Por definir':new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:c==='COP'?0:2}).format(n/100);
 const today=ctx=>new Intl.DateTimeFormat('en-CA',{timeZone:ctx.account.timezone||'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const field=(name,label,value='',attrs='')=>'<label class="field">'+label+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
 const select=(name,label,items,value)=>'<label class="field">'+label+'<select name="'+name+'">'+items.map(([k,v])=>'<option value="'+esc(k)+'" '+(k===value?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';
 function submit(dialog,ctx,save,done=ctx.refresh){
  dialog.querySelector('form').onsubmit=async e=>{
   e.preventDefault();e.stopPropagation();const button=e.submitter||e.target.querySelector('button[type=submit]');button.disabled=true;
   try{const result=await save(Object.fromEntries(new FormData(e.target)));dialog.close();await done(result);}
   catch(error){ctx.showError(error.message,dialog.querySelector('#dialogError'));}finally{button.disabled=false;}
  };
 }
 function createBook(ctx){
  const id=crypto.randomUUID();
  const d=ctx.dialog('Separa otra parte de tu dinero','<p>Una contabilidad guarda sus propios ingresos, gastos y compromisos. Por ejemplo: Casa, Ganado o un proyecto.</p><form class="stack">'+field('name','Nombre de la contabilidad','','required minlength="2" maxlength="80" placeholder="Ej. Mi negocio de ganado"')+select('currency','Moneda',[['COP','Pesos colombianos · COP'],['USD','Dólares · USD'],['EUR','Euros · EUR']],ctx.account.currency)+'<p class="small muted">El saldo y la proyección usarán esta moneda. No se convierte ni se mueve dinero bancario.</p><button type="submit" class="primary">Crear contabilidad</button></form>');
  submit(d,ctx,f=>ctx.request('/finance-books',{...f,request_id:id}),async r=>ctx.selectBook(r.book.id));
 }
 function opening(ctx,book=ctx.book){
  const d=ctx.dialog('Punto de partida de '+book.name,'<form class="stack">'+field('name','Nombre',book.name,'required minlength="2" maxlength="80"')+field('opening_amount','Dinero disponible al comenzar ese día ('+book.currency+')',book.opening_amount??'','type="number" step=".01" required placeholder="0"')+field('opening_date','Fecha de inicio',book.opening_date||today(ctx),'type="date" min="2000-01-01" max="'+today(ctx)+'" required')+'<p class="book-form-note">Indica el saldo <strong>antes de los movimientos de ese día</strong>. Qori sumará los ingresos y restará los gastos registrados desde esa fecha. Los movimientos anteriores se conservan en el historial.</p><p class="small muted">Puedes usar cero. Un saldo negativo representa dinero faltante. Este valor lo declaras tú; no es una consulta al banco.</p><button type="submit" class="primary">Guardar punto de partida</button></form>');
  submit(d,ctx,f=>ctx.request('/finance-books/'+book.id,{...f,revision:book.revision},'PUT'));
 }
 function transfer(ctx){
  const choices=ctx.books.filter(b=>b.currency===ctx.book.currency),id=crypto.randomUUID();
  if(choices.length<2){createBook(ctx);return;}
  const d=ctx.dialog('Trasladar dinero entre contabilidades','<p>Registra un traslado que ya hiciste. Reduce el saldo de origen y aumenta el de destino, sin contarlo como ingreso ganado ni como gasto.</p><form class="stack">'+select('from_book_id','Sale de',choices.map(b=>[b.id,b.name]),ctx.book.id)+select('to_book_id','Llega a',choices.map(b=>[b.id,b.name]),choices.find(b=>b.id!==ctx.book.id).id)+field('amount','Importe ('+ctx.book.currency+')','','type="number" step=".01" min=".01" required')+field('occurred_on','Fecha del traslado',today(ctx),'type="date" required max="'+today(ctx)+'"')+field('note','Concepto','','maxlength="1000"')+'<label class="check"><input type="checkbox" required> Confirmo que este traslado ya ocurrió. Qori solo lo registra.</label><button type="submit" class="primary">Registrar traslado</button></form>');
  submit(d,ctx,f=>ctx.request('/finance-transfers',{...f,request_id:id,confirmed:true}));
 }
 function reassign(ctx,kind,id){
  const d=ctx.dialog('Cambiar de contabilidad','<p>Corrige dónde se registra este movimiento. No crea otro gasto ni mueve dinero. Si cambias una obligación, también cambia su historial de pagos.</p><form class="stack">'+select('book_id','Contabilidad de destino',ctx.books.map(b=>[b.id,b.name+' · '+b.currency]),ctx.book.id)+'<button type="submit" class="primary">Guardar ubicación</button></form>');
  submit(d,ctx,f=>ctx.request('/finance-books/reassign',{...f,kind,id}));
 }
 function selector(root,ctx){
  const el=root.querySelector('.breadcrumb');if(!el)return;
  el.innerHTML='<div class="book-switcher">'+select('activeBook','Mi contabilidad',ctx.books.map(b=>[b.id,b.name+' · '+b.currency]),ctx.book.id)+'<button class="secondary" id="addBook" aria-label="Crear otra contabilidad">+</button></div>';
  el.querySelector('select').onchange=e=>ctx.selectBook(e.target.value);
  el.querySelector('#addBook').onclick=()=>createBook(ctx);
 }
 async function render(page,ctx){
  page.innerHTML='<p role="status">Organizando el dinero de '+esc(ctx.book.name)+'…</p>';
  const loading=page.firstElementChild;
  try{
   const d=await ctx.request('/finance-home');if(!page.isConnected||loading.parentNode!==page)return;
   const refresh=()=>ctx.refresh(),local={...ctx,refreshFinance:refresh},m=n=>money(n,d.currency);
   const due=d.commitments.filter(i=>i.kind==='EXPENSE'),needsSetup=d.balance_minor==null;
   page.innerHTML=`<div class="page-heading book-heading"><div><span class="eyebrow">Qori cuida tu bolsillo · ${esc(d.book.name)}</span><h1>Mi dinero, en orden.</h1><p>${esc(d.from)} — ${esc(d.to)} · Solo esta contabilidad · ${esc(d.currency)}</p></div><button class="quiet" id="bookSettings">Configurar saldo inicial</button></div>
    <div class="book-quick"><button class="primary" id="bookExpense">− Registrar gasto</button><button class="secondary" id="bookIncome">+ Registrar ingreso</button><button class="secondary" id="bookObligation">Agregar compromiso</button><button class="quiet" id="bookTransfer">Trasladar dinero</button></div>
    ${needsSetup?'<section class="panel book-onboarding"><span class="eyebrow">Empieza con lo que sabes hoy</span><h2>Tu contabilidad en tres pasos</h2><div class="book-steps"><button id="setupBalance"><b>1</b><strong>¿Cuánto tienes?</strong><span>Define un saldo y una fecha de inicio.</span></button><button id="setupIncome"><b>2</b><strong>¿Qué dinero esperas?</strong><span>Agenda tus ingresos periódicos.</span></button><button id="setupBills"><b>3</b><strong>¿Qué debes cubrir?</strong><span>Separa tus compromisos no negociables.</span></button></div><p class="small muted">Tus registros anteriores están en Personal. Puedes crear Casa, Ganado u otras contabilidades desde el selector superior.</p></section>':''}
    <section class="book-balance"><div><span>Dinero que tengo registrado</span><strong>${m(d.balance_minor)}</strong><p>${needsSetup?'Define tu punto de partida para calcularlo.':'Saldo inicial + ingresos − gastos + traslados, desde '+esc(d.book.opening_date)+'.'}</p><button class="book-balance-link" id="balanceEdit">${needsSetup?'Definir cuánto tengo →':'Revisar mi punto de partida →'}</button></div><div class="book-remaining"><span>Después de todos mis pagos pendientes</span><strong class="${d.available_after_commitments_minor<0?'book-negative':''}">${m(d.available_after_commitments_minor)}</strong><p>Usa solo tu dinero registrado. No incluye ingresos por recibir ni compras planeadas.</p></div></section>
    <div class="book-stats">${[['Ingresos recibidos este mes',d.income_minor],['Gastos pagados este mes',d.spent_minor],['No negociables pendientes',d.essential_minor],['Gasto proyectado del mes',d.projected_expenses_minor]].map(([label,value])=>'<article class="panel"><span>'+label+'</span><strong>'+m(value)+'</strong></article>').join('')}</div>
    <div class="book-columns"><section class="panel book-projection"><div class="finance-section-head"><h2>¿Cuánto me quedará?</h2><span class="pill">Proyección</span></div><dl>
      <div><dt>Lo que tengo registrado</dt><dd>${m(d.balance_minor)}</dd></div><div><dt>+ Ingresos pendientes de recibir</dt><dd>${m(d.expected_income_minor)}</dd></div><div><dt>− Compromisos pendientes</dt><dd>${m(d.pending_minor)}</dd></div><div><dt>− Compras Qori pendientes de pago</dt><dd>${m(d.pending_sales_minor||0)}</dd></div><div><dt>− Compras planeadas</dt><dd>${m(d.planned_minor)}</dd></div><div class="book-projection-total"><dt>Previsto al final del mes</dt><dd class="${d.projected_remaining_minor<0?'book-negative':''}">${m(d.projected_remaining_minor)}</dd></div></dl>
      <p class="small muted">Incluye vencidos y compras sin fecha. Los ingresos pendientes aún no son dinero disponible. No incluye gastos o ingresos que no hayas registrado o planeado.</p>${d.projected_remaining_minor<0?'<p class="book-warning">Con tus registros actuales falta dinero para cubrir lo previsto. Revisa fechas, ingresos y compras antes de comprometer más.</p>':''}
      <div class="row"><a class="secondary" href="#purchases">Revisar compras</a><button class="quiet" id="expectedIncome">Agregar ingreso previsto</button></div></section>
     <section class="panel"><div class="finance-section-head"><h2>Mis compromisos</h2><a href="#payments">Ver agenda →</a></div>${due.slice(0,6).map(i=>'<a class="book-due" href="#payments"><span><strong>'+esc(i.name)+'</strong><small>'+esc(i.due_date)+(i.due_date<d.today?' · Vencido':'')+' · '+(i.priority==='ESSENTIAL'?'No negociable':'Flexible')+'</small></span><b>'+m(Math.round(Number(i.billed_amount??i.estimated_amount)*100))+'</b></a>').join('')||'<p>Aún no tienes pagos pendientes aquí. Agrega vivienda, servicios, seguridad social o los compromisos de esta actividad.</p>'}<button class="secondary" id="addCommitment">+ Agregar compromiso</button></section></div>
     <section class="panel"><div class="finance-section-head"><h2>Últimos movimientos del mes</h2><a href="#history">Ver historial y análisis →</a></div>${d.movements.map(r=>'<button class="book-movement" data-book-movement="'+esc(r.id)+'"><span><strong>'+esc(r.merchant)+'</strong><small>'+esc(r.date)+' · '+(r.kind==='INCOME'?'Ingreso':'Gasto')+'</small></span><b>'+(r.kind==='INCOME'?'+':'−')+m(r.amount_minor)+'</b></button>').join('')||'<p>Registra tu primer ingreso o gasto. Lo que guardes aquí pertenece a '+esc(d.book.name)+'.</p>'}</section>
     <details class="panel book-transfers"><summary>Traslados entre mis contabilidades</summary><p class="small muted">No son ingresos ni gastos. Solo cuentan en el saldo desde la fecha inicial de cada contabilidad.</p>${d.transfers.map(t=>'<div class="book-due"><span><strong>'+esc(t.from_name)+' → '+esc(t.to_name)+'</strong><small>'+esc(t.occurred_on)+' · '+esc(t.note)+(t.voided_at?' · Anulado':'')+'</small></span><b>'+m(Math.round(Number(t.amount)*100))+'</b>'+(!t.voided_at?'<button class="quiet" data-void-transfer="'+esc(t.id)+'">Anular</button>':'')+'</div>').join('')||'<p>No hay traslados registrados.</p>'}</details>
     <section class="panel book-benefits"><div><h2>Compra con tu bolsillo en mente.</h2><p>Cuando vayas a comprar, pregunta: ¿Aquí son Qori?</p></div><a class="secondary" href="#explore">Encontrar beneficios →</a><a href="#wallet">Mis tarjetas y tickets</a><a href="#invitations">Invitaciones</a></section>
     <details class="panel book-transfers"><summary>Más de mi Qori</summary><div class="account-shortcuts"><a href="#directory">Negocios Qori</a><a href="#businesses">Mis negocios y giftcards</a><a href="#product-gifts">Regalos enviados</a><a href="#earned">Mis actividades</a><a href="#saved">Guardados</a><a href="#following">Negocios que sigo</a><a href="#requests">Solicitudes</a><a href="#place-requests">Quiero Qori aquí</a><a href="#planning">Presupuestos y metas</a><a href="#profile">Mi cuenta</a></div></details>
     <p class="small muted">Saldo calculado con tus datos, no consultado al banco. Cada moneda se calcula por separado. ${d.foreign_currency_count?'Hay movimientos en otras monedas; consúltalos en Análisis.':''}</p>`;
   page.querySelector('#bookExpense').onclick=()=>window.QoriFinance.editEntry(local,null,'EXPENSE');
   page.querySelector('#bookIncome').onclick=()=>window.QoriFinance.editEntry(local,null,'INCOME');
   for(const id of ['bookSettings','balanceEdit','setupBalance'])page.querySelector('#'+id)?.addEventListener('click',()=>opening(ctx,d.book));
   for(const id of ['bookObligation','addCommitment','setupBills'])page.querySelector('#'+id)?.addEventListener('click',()=>window.QoriPayments.ruleForm(ctx,refresh));
   for(const id of ['setupIncome','expectedIncome'])page.querySelector('#'+id)?.addEventListener('click',()=>window.QoriPayments.ruleForm(ctx,refresh,null,'INCOME'));
   page.querySelector('#bookTransfer').onclick=()=>transfer(ctx);
   page.querySelectorAll('[data-book-movement]').forEach(b=>b.onclick=()=>window.QoriFinance.openMovement(d.movements.find(m=>m.id===b.dataset.bookMovement),local));
   page.querySelectorAll('[data-void-transfer]').forEach(b=>b.onclick=()=>{
    const dialog=ctx.dialog('Anular traslado','<form class="stack"><p>El traslado dejará de afectar los saldos de ambas contabilidades. Su historial se conserva. No se devuelve dinero bancario.</p><button class="primary" type="submit">Confirmar anulación</button></form>');
    submit(dialog,ctx,()=>ctx.request('/finance-transfers/'+b.dataset.voidTransfer,null,'DELETE'));
   });
  }catch(e){if(page.isConnected){page.innerHTML='<section class="panel"><h1>Mi dinero</h1><p role="alert">'+esc(e.message)+'</p><button class="primary" id="retryBooks">Reintentar</button></section>';page.querySelector('#retryBooks').onclick=()=>render(page,ctx);}}
 }
 window.QoriAccounting={render,selector,createBook,opening,transfer,reassign};
})();

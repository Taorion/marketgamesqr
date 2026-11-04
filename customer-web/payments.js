/* Monthly obligations are plans; only explicit payment creates a financial movement. */
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(v,c)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:c==='COP'?0:2}).format(Number(v||0));
 const today=ctx=>new Intl.DateTimeFormat('en-CA',{timeZone:ctx.account.timezone||'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const field=(n,l,v='',attrs='')=>`<label class="field">${l}<input name="${n}" value="${esc(v)}" ${attrs}></label>`;
 const select=(n,l,options,value)=>`<label class="field">${l}<select name="${n}">${Object.entries(options).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('')}</select></label>`;
 const cats={hogar:'Hogar',servicios:'Servicios',salud:'Salud',educacion:'Educación',transporte:'Transporte',alimentacion:'Alimentación',supermercado:'Supermercado',entretenimiento:'Entretenimiento',cuidado_personal:'Cuidado personal',otros:'Otros'};
 const frequencies={month:'Mensual',week:'Semanal',year:'Anual'};
 const status=(i,date)=>i.status==='PAID'?'Pagado':i.status==='SKIPPED'?'Omitido':i.due_date<date?'Vencido':i.due_date===date?'Vence hoy':'Pendiente';
 let version=0,owner='',month='',currency='',filter='',search='';
 function submit(d,ctx,send,refresh){
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();e.stopPropagation();const b=e.submitter||e.target.querySelector('button.primary');if(b.disabled)return;b.disabled=true;
   try{await send(Object.fromEntries(new FormData(e.target)),e.target);d.close();await refresh();}
   catch(err){ctx.showError(err.message,d.querySelector('#dialogError'));}finally{b.disabled=false;}};
 }
 function download(name,type,body){const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function csv(items,date){
  const cell=v=>'"'+String(v??'').replace(/^[=+\-@\t\r]/,"'$&").replaceAll('"','""')+'"';
  return '\uFEFF'+[['Concepto','Periodo','Vencimiento','Estado','Moneda','Estimado','Valor factura','Valor pagado','Fecha pago','Diferencia vs estimado','Nota'],
   ...items.map(i=>[i.name,i.scheduled_date.slice(0,7),i.due_date,status(i,date),i.currency,i.estimated_amount,i.billed_amount,i.actual_amount,i.paid_on,i.actual_amount==null?'':(Number(i.actual_amount)-Number(i.estimated_amount)).toFixed(2),i.note])].map(r=>r.map(cell).join(';')).join('\r\n');
 }
 function calendar(items){
  const text=v=>String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Qori//Agenda de pagos//ES',...items.filter(i=>i.status==='PENDING').flatMap(i=>[
   'BEGIN:VEVENT','UID:'+i.id+'@qori','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
   'DTSTART;VALUE=DATE:'+i.due_date.replaceAll('-',''),'SUMMARY:'+text(i.name+' · Qori'),
   'DESCRIPTION:Obligación pendiente. Revisa el valor y confirma el pago en Qori Customer.',
   'URL:https://gosqori.com/customer/#payments',...(i.reminders_enabled?['BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Revisar obligación Qori','TRIGGER:-P'+i.remind_days+'D','END:VALARM']:[]),'END:VEVENT']),'END:VCALENDAR'].join('\r\n')+'\r\n';
 }
 function ruleForm(ctx,refresh,r=null){
  const common=field('name','Obligación o concepto',r?.name||'','required minlength="2" maxlength="120"')+field('amount','Estimado por periodo',r?.amount||'','type="number" min=".01" step=".01" required');
  const creation=select('currency','Moneda',{COP:'COP · Peso colombiano',USD:'USD · Dólar',EUR:'EUR · Euro'},currency||ctx.account.currency)+select('kind','Tipo',{EXPENSE:'Gasto fijo / factura',INCOME:'Ingreso periódico'},'EXPENSE')+select('category','Categoría',cats,'servicios')+select('frequency','Repetir',frequencies,'month')+field('next_date','Primer vencimiento',today(ctx),'type="date" required min="2000-01-01"');
  const d=ctx.dialog(r?'Configurar obligación':'Nueva obligación',`<form class="stack">${common}${r?`<p>${esc(frequencies[r.frequency])} · ${esc(r.currency)}. El nombre y estimado nuevos se usarán en periodos que aún no se hayan generado. Puedes editar cada factura desde la agenda.</p><label class="check"><input name="active" type="checkbox" ${r.active?'checked':''}> Generar nuevos periodos</label>`:creation}${field('remind_days','Recordarme desde (días antes)',r?.remind_days??3,'type="number" min="0" max="30" required')}<label class="check"><input name="reminders_enabled" type="checkbox" ${r?.reminders_enabled===false?'':'checked'}> Avisarme de esta obligación</label><p class="small muted">Se agenda por fecha, aunque el mes anterior siga pendiente. Al pagar, confirmarás el valor real.</p><button class="primary">Guardar obligación</button></form>`);
  submit(d,ctx,(f,form)=>ctx.request('/recurring'+(r?'/'+r.id:''),{...f,remind_days:Number(f.remind_days),reminders_enabled:form.elements.reminders_enabled.checked,...(r?{active:form.elements.active.checked}:{})},r?'PUT':'POST'),refresh);
 }
 function editBill(ctx,refresh,i){
  const d=ctx.dialog('Factura de '+i.name,`<p>Periodo ${esc(i.scheduled_date.slice(0,7))} · Estimado original: ${money(i.estimated_amount,i.currency)}. Esta corrección solo afecta esta factura.</p><form class="stack">${field('due_date','Fecha de vencimiento',i.due_date,'type="date" required')}${field('billed_amount','Valor de la factura (deja vacío mientras sea estimado)',i.billed_amount||'','type="number" min=".01" step=".01"')}<label class="field">Referencia o nota<textarea name="note" maxlength="2000">${esc(i.note)}</textarea></label><button class="primary">Guardar factura</button></form>`);
  submit(d,ctx,f=>ctx.request('/payment-agenda/'+i.id,{...f,billed_amount:f.billed_amount||null,revision:i.revision},'PUT'),refresh);
 }
 function pay(ctx,refresh,i,action='PAY'){
  const confirm=['PAY','CORRECT'].includes(action);
  const title={PAY:'Registrar pago',CORRECT:'Corregir pago',REOPEN:'Anular registro de pago',SKIP:'Omitir este periodo',RESTORE:'Restaurar obligación'}[action];
  const d=ctx.dialog(title,`<p>${esc(i.name)} · Vence ${esc(i.due_date)}</p><form class="stack">${confirm?field('amount','Valor real '+(i.kind==='INCOME'?'recibido':'pagado')+' ('+i.currency+')',i.actual_amount||i.billed_amount||i.estimated_amount,'type="number" min=".01" step=".01" required')+field('paid_on','Fecha real del pago',i.paid_on||today(ctx),'type="date" required max="'+today(ctx)+'"'):'<p>'+(action==='REOPEN'?'El movimiento dejará de sumar en tus gastos y la obligación volverá a pendiente. Se conserva el registro de la corrección. No se devuelve dinero.':action==='SKIP'?'Este periodo no contará como pago pendiente. No se registra ningún gasto.':'Volverá a aparecer entre tus obligaciones pendientes.')+'</p>'}<label class="check"><input type="checkbox" name="confirmed" required> ${confirm?'Confirmo que este pago o ingreso ya ocurrió.':'Confirmo este cambio.'}</label><button class="primary">${title}</button></form>`);
  submit(d,ctx,f=>ctx.request('/payment-agenda/'+i.id+'/payment',{...f,action,revision:i.revision,confirmed:true}),refresh);
 }
 async function history(ctx,i){
  const d=ctx.dialog('Historial de '+i.name,'<p>Cargando cambios…</p>');
  try{const r=await ctx.request('/payment-agenda/'+i.id);if(!d.isConnected)return;
   const names={PAY:'Pago registrado',CORRECT:'Pago corregido',REOPEN:'Registro de pago anulado',SKIP:'Periodo omitido',RESTORE:'Obligación restaurada',BILL_UPDATED:'Factura actualizada'};
   d.querySelector('.dialog-body').innerHTML='<p>Periodo '+esc(i.scheduled_date.slice(0,7))+' · Estimado original '+money(i.estimated_amount,i.currency)+'</p>'+
    (r.changes.map(c=>'<article class="payment-change"><strong>'+esc(names[c.action]||c.action)+'</strong><p>'+esc(new Date(c.created_at).toLocaleString('es-CO',{timeZone:ctx.account.timezone}))+'</p>'+
     (c.after_value.actual_amount?'<p>Valor real: '+money(c.after_value.actual_amount,i.currency)+' · Fecha: '+esc(c.after_value.paid_on)+'</p>':'')+
     (c.action==='CORRECT'?'<p>Valor anterior: '+money(c.before_value.actual_amount,i.currency)+'</p>':'')+
     (c.action==='BILL_UPDATED'?'<p>Vencimiento: '+esc(String(c.after_value.due_date).slice(0,10))+' · Factura: '+(c.after_value.billed_amount?money(c.after_value.billed_amount,i.currency):'Por confirmar')+'</p>':'')+'</article>').join('')||'<p>Aún no hay cambios ni pagos registrados.</p>');
  }catch(e){ctx.showError(e.message,d.querySelector('#dialogError'));}
 }
 async function pushControls(host,ctx){
  try{
   const settings=await ctx.request('/payment-agenda/push');if(!host.isConnected)return;
   if(!settings.configured){host.textContent='Los avisos del dispositivo aún no están habilitados. Tus recordatorios están disponibles aquí; también puedes descargar el calendario.';return;}
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){host.textContent='Este navegador no permite activar notificaciones. Puedes usar el calendario. En iPhone, abre Qori desde la pantalla de inicio para comprobar la opción.';return;}
   const registration=await navigator.serviceWorker.ready;let subscription=await registration.pushManager.getSubscription();
   const enabled=subscription&&settings.subscriptions.some(s=>s.endpoint===subscription.endpoint);
   host.innerHTML='<button class="secondary" id="paymentPushToggle">'+(enabled?'Desactivar avisos en este dispositivo':'Activar notificaciones de pagos')+'</button><p class="small muted">Un recordatorio diario desde las 9:00 de tu zona horaria si tienes obligaciones próximas o vencidas. Requiere permiso y una sesión vigente en este dispositivo.</p>';
   host.querySelector('button').onclick=async e=>{
    const b=e.target;b.disabled=true;
    try{
     if(enabled){await ctx.request('/payment-agenda/push',{endpoint:subscription.endpoint},'DELETE');await subscription.unsubscribe();}
     else{
      const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('No se concedió el permiso. Puedes consultar la agenda o usar el calendario.');
      if(subscription){await subscription.unsubscribe();subscription=null;}
      const key=Uint8Array.from(atob(settings.public_key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
      subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      await ctx.request('/payment-agenda/push',{subscription:subscription.toJSON()});
     }
     await pushControls(host,ctx);
    }catch(err){ctx.showError(err.message);b.disabled=false;}
   };
  }catch(e){if(host.isConnected)host.textContent='No pudimos consultar los avisos del dispositivo: '+e.message;}
 }
 async function render(page,ctx){
  const turn=++version;if(owner!==ctx.account.id){owner=ctx.account.id;month=today(ctx).slice(0,7);currency=ctx.account.currency||'COP';filter='';search='';}
  month||=today(ctx).slice(0,7);currency||=ctx.account.currency||'COP';const refresh=()=>render(page,ctx);
  page.innerHTML='<p role="status">Organizando tus obligaciones…</p>';
  try{
   const d=await ctx.request('/payment-agenda?'+new URLSearchParams({month,currency}));if(turn!==version||!page.isConnected)return;
   page.innerHTML=`<div class="page-heading"><div><span class="eyebrow">Tu mes, organizado</span><h1>Agenda de pagos</h1><p>Tus obligaciones, lo que estimaste y lo que realmente pagaste.</p></div><button class="primary" id="newObligation">+ Agregar obligación</button></div><nav class="finance-tabs" aria-label="Finanzas"><a href="#finances">Resumen</a><a href="#history">Historial</a><a href="#payments" aria-current="page">Agenda de pagos</a><a href="#planning">Presupuestos y metas</a></nav>
    <form class="payment-filters">${field('month','Mes',month,'type="month" required')}${select('currency','Moneda',{COP:'COP',USD:'USD',EUR:'EUR'},currency)}<button class="secondary">Ver mes</button></form>
    <div class="finance-stats">${[['Estimado del mes',d.summary.estimated_minor],['Pagado en obligaciones del mes',d.summary.paid_minor],['Pendiente del mes',d.summary.pending_minor],['Vencido, incluidos meses anteriores',d.summary.overdue_minor]].map(([label,value])=>`<article class="panel"><span>${label}</span><strong>${money(value/100,currency)}</strong></article>`).join('')}</div>
    <section class="panel payment-reminders" aria-label="Recordatorios"><div><h2>Recordatorios</h2><p>${d.reminders.length?d.reminders.length+' obligaciones próximas o vencidas requieren tu atención.':'No hay avisos pendientes entre las obligaciones consultadas.'}</p></div><div id="paymentPush"><p>Consultando notificaciones…</p></div></section>
    <section class="panel"><div class="finance-section-head"><div><h2>Obligaciones del mes</h2><p class="small muted">También se incluyen pendientes anteriores. Los estimados no cuentan como gastos hasta confirmar el pago.</p></div><div class="row"><button class="secondary" id="paymentsCsv">Descargar Excel / CSV</button><button class="secondary" id="paymentsCalendar">Descargar calendario</button></div></div>
    <div class="payment-filters">${field('search','Buscar obligación',search,'type="search" maxlength="120"')}${select('status','Mostrar',{'':'Todas',PENDING:'Pendientes',OVERDUE:'Vencidas',PAID:'Pagadas',SKIPPED:'Omitidas'},filter)}</div>
    <div id="paymentRows"></div></section>
    <section class="panel"><h2>Mis obligaciones recurrentes</h2><p class="small muted">Configura el estimado de nuevos periodos, los recordatorios o pausa la generación. Las facturas e historial existentes se conservan.</p><div class="payment-rules">${d.rules.map(r=>`<article><div><strong>${esc(r.name)}</strong><p>${esc(frequencies[r.frequency])} · ${money(r.amount,r.currency)} · ${r.active?'Activa':'Pausada'}</p></div><button class="secondary" data-rule="${r.id}">Configurar</button></article>`).join('')||'<p>Agrega arriendo, servicios, créditos, seguros, suscripciones u otros compromisos.</p>'}</div></section>`;
   const visible=()=>d.items.filter(i=>(!search||[i.name,i.note].join(' ').toLowerCase().includes(search.toLowerCase()))&&(!filter||(filter==='OVERDUE'?i.status==='PENDING'&&i.due_date<d.today:i.status===filter)));
   function rows(){
    const host=page.querySelector('#paymentRows');host.innerHTML=visible().map(i=>`<article class="payment-item ${i.status==='PENDING'&&i.due_date<d.today?'is-overdue':''}"><div class="payment-item-title"><div><strong>${esc(i.name)}</strong><p>${esc(cats[i.category])} · ${i.kind==='INCOME'?'Ingreso':'Gasto'} · Periodo ${i.scheduled_date.slice(0,7)}</p></div><span class="payment-state">${status(i,d.today)}</span></div><dl><div><dt>Vencimiento</dt><dd>${i.due_date}</dd></div><div><dt>Estimado</dt><dd>${money(i.estimated_amount,i.currency)}</dd></div><div><dt>Factura</dt><dd>${i.billed_amount?money(i.billed_amount,i.currency):'Por confirmar'}</dd></div><div><dt>Pago real</dt><dd>${i.actual_amount?money(i.actual_amount,i.currency):'—'}</dd></div><div><dt>Fecha del pago</dt><dd>${i.paid_on||'—'}</dd></div><div><dt>Diferencia vs estimado</dt><dd>${i.actual_amount?money(Number(i.actual_amount)-Number(i.estimated_amount),i.currency):'—'}</dd></div></dl>${i.note?'<p class="payment-note">'+esc(i.note)+'</p>':''}<div class="payment-actions">${i.status==='PENDING'?`<button class="primary" data-pay="PAY" data-id="${i.id}">Registrar ${i.kind==='INCOME'?'ingreso':'pago'}</button><button class="quiet" data-pay="SKIP" data-id="${i.id}">Omitir periodo</button>`:i.status==='PAID'?`<button class="secondary" data-pay="CORRECT" data-id="${i.id}">Corregir pago</button><button class="quiet" data-pay="REOPEN" data-id="${i.id}">Anular registro</button>`:`<button class="secondary" data-pay="RESTORE" data-id="${i.id}">Restaurar</button>`}<button class="secondary" data-bill="${i.id}">Editar factura</button><button class="quiet" data-changes="${i.id}">Historial</button></div></article>`).join('')||'<p>No hay obligaciones con estos filtros. Agrega una obligación o consulta otro mes.</p>';
    const find=id=>d.items.find(i=>i.id===id);
    host.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>pay(ctx,refresh,find(b.dataset.id),b.dataset.pay));
    host.querySelectorAll('[data-bill]').forEach(b=>b.onclick=()=>editBill(ctx,refresh,find(b.dataset.bill)));
    host.querySelectorAll('[data-changes]').forEach(b=>b.onclick=()=>history(ctx,find(b.dataset.changes)));
   }
   rows();page.querySelector('[name=search]').oninput=e=>{search=e.target.value;rows();};page.querySelector('[name=status]').onchange=e=>{filter=e.target.value;rows();};
   page.querySelector('form').onsubmit=e=>{e.preventDefault();e.stopPropagation();month=e.target.elements.month.value;currency=e.target.elements.currency.value;refresh();};
   page.querySelector('#newObligation').onclick=()=>ruleForm(ctx,refresh);
   page.querySelectorAll('[data-rule]').forEach(b=>b.onclick=()=>ruleForm(ctx,refresh,d.rules.find(r=>r.id===b.dataset.rule)));
   page.querySelector('#paymentsCsv').onclick=()=>download('qori-obligaciones-'+month+'.csv','text/csv;charset=utf-8',csv(visible(),d.today));
   page.querySelector('#paymentsCalendar').onclick=()=>download('qori-pagos-'+month+'.ics','text/calendar;charset=utf-8',calendar(visible()));
   pushControls(page.querySelector('#paymentPush'),ctx);
  }catch(e){if(turn===version&&page.isConnected){page.innerHTML='<p role="alert">No pudimos cargar tu agenda.</p><button class="secondary">Reintentar</button>';page.querySelector('button').onclick=refresh;ctx.showError(e.message);}}
 }
 window.QoriPayments={render,csv,calendar,ruleForm};
})();

(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>v?new Date(v).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}):'Sin fecha registrada';
 const badge=l=>'<span class="seller-phase" data-tone="'+(['info','warning','danger','success'].includes(l.tone)?l.tone:'neutral')+'">'+esc(l.label)+'</span>';
 function commissionSummary(c){
  if(!c)return '';
  if(c.policy_version==='LEGACY_10')return '<p>Comisión de suscripción: esquema anterior, 10% por pago confirmado.</p>';
  const day=v=>new Date(String(v).slice(0,10)+'T12:00:00Z').toLocaleDateString('es-CO',{timeZone:'America/Bogota'});
  return '<p>Comisión de suscripción: tabla VF1 · '+(!c.starts_on?'El plazo comienza con la primera cobertura paga.':c.month?'Mes '+Number(c.month)+' de 6.':'Fuera del mes de comisión actual.')+(c.ends_on?' Fin del plazo: '+day(c.ends_on)+'.':'')+' Tickets: 10%.</p>';
 }
 function summary(a){const l=a?.lifecycle;if(!l)return '';
  return '<div class="seller-account-inline">'+badge(l)+(l.trial?'<p>'+esc(l.trial.status==='CONVERTED'?'Freemium → plan pago confirmado':'Vencimiento Freemium')+': '+(l.trial.status==='CONVERTED'?esc(l.plan_name):date(l.trial.ends_at))+'</p>':'')+(l.trial?.status==='ACTIVE'&&l.trial.days_remaining!==null?'<strong>Quedan '+l.trial.days_remaining+' días de prueba</strong>':'')+'</div>';
 }
 function card(a){const l=a.lifecycle;if(!l)return '<article class="seller-account"><h3>'+esc(a.name)+'</h3><p>Actualiza para consultar las fechas de esta cuenta.</p></article>';
  const trial=l.trial;
  return '<article class="seller-account"><div class="row"><h3>'+esc(a.name)+'</h3>'+badge(l)+'</div><p class="seller-plan">Plan: <strong>'+esc(l.plan_name)+'</strong> · '+(l.access_allowed?'Acceso habilitado':'Acceso restringido')+'</p>'+
   (trial?'<div class="seller-trial"><h4>'+esc(trial.status==='CONVERTED'?'Pasó de Freemium a un plan pago':trial.status==='ENDED'?'Prueba Freemium anterior':'Prueba Freemium')+'</h4><dl><div><dt>Inicio de prueba</dt><dd>'+date(trial.started_at)+'</dd></div><div><dt>Vencimiento de prueba</dt><dd>'+date(trial.ends_at)+'</dd></div></dl>'+(trial.status==='ACTIVE'&&trial.days_remaining!==null?'<strong>Quedan '+trial.days_remaining+' días de prueba</strong>':trial.status==='EXPIRED'?'<strong>La prueba ya venció</strong>':'')+'</div>':'')+
   commissionSummary(a.commission)+'<dl><div><dt>Inscrito en mi cartera</dt><dd>'+date(a.created_at)+'</dd></div><div><dt>'+esc(l.phase==='LIFETIME'?'Vigencia del convenio':'Vencimiento del periodo actual')+'</dt><dd>'+(['FREE','LIFETIME'].includes(l.phase)?'Sin vencimiento':date(l.current_period_ends_at))+'</dd></div><div><dt>Último pago confirmado de plan</dt><dd>'+(l.last_payment_at?date(l.last_payment_at):'Sin pago registrado')+'</dd></div>'+(l.phase==='RENEWAL_DUE'?'<div><dt>Fin del periodo de gracia</dt><dd>'+date(l.grace_period_ends_at)+'</dd></div>':'')+'</dl><p class="seller-next"><strong>Siguiente paso:</strong> '+esc(l.next_action)+'</p></article>';
 }
 function render(host,accounts,{refresh}={}){
  const rows=accounts||[],active=rows.filter(a=>['TRIAL_ACTIVE','TRIAL_ENDING'].includes(a.lifecycle?.phase)).length,ending=rows.filter(a=>a.lifecycle?.phase==='TRIAL_ENDING').length,expired=rows.filter(a=>a.lifecycle?.phase==='TRIAL_EXPIRED').length;
  host.className='seller-accounts';host.innerHTML='<div class="row"><h2>Estado de mis negocios</h2><button class="outline" type="button" data-refresh-accounts>Actualizar estados</button></div><p>Freemium: inicio, vencimiento y paso a un plan pago. Fechas en hora de Colombia.</p><div class="seller-account-counts"><span><strong>'+active+'</strong> en Freemium</span><span><strong>'+ending+'</strong> vencen en 7 días o menos</span><span><strong>'+expired+'</strong> pruebas vencidas</span></div><div class="seller-account-filters"><label>Buscar negocio<input type="search" data-account-search placeholder="Nombre o plan" maxlength="160"></label><label>Filtrar por fase<select data-account-phase><option value="ALL">Todas las fases</option><option value="TRIAL">En prueba Freemium</option><option value="TRIAL_ENDING">Freemium por vencer</option><option value="TRIAL_EXPIRED">Freemium vencido</option><option value="CONVERTED">Pasaron de Freemium a pago</option><option value="PAID_ACTIVE">Plan pago activo</option><option value="PAYMENT">Pago o renovación pendiente</option><option value="SUSPENDED">Suspendidos</option></select></label></div><p data-account-count role="status"></p><div data-account-rows></div><small>Se muestran hasta 200 negocios recientes de tu cartera. Un estado activo no acredita un pago.</small>';
  const draw=()=>{const search=host.querySelector('[data-account-search]').value.toLocaleLowerCase('es'),phase=host.querySelector('[data-account-phase]').value;
   const found=rows.filter(a=>{const l=a.lifecycle||{};return (a.name+' '+(l.plan_name||a.plan_code)).toLocaleLowerCase('es').includes(search)&&(phase==='ALL'||phase==='TRIAL'&&['TRIAL_ACTIVE','TRIAL_ENDING'].includes(l.phase)||phase==='CONVERTED'&&l.converted_to_paid||phase==='PAYMENT'&&['PAYMENT_PENDING','RENEWAL_DUE','EXPIRED'].includes(l.phase)||l.phase===phase);});
   host.querySelector('[data-account-count]').textContent=found.length+' negocios encontrados';host.querySelector('[data-account-rows]').innerHTML=found.map(card).join('')||'<p class="empty">No hay negocios que coincidan con esta búsqueda.</p>';
  };
  host.querySelector('[data-account-search]').oninput=draw;host.querySelector('[data-account-phase]').onchange=draw;
  host.querySelector('[data-refresh-accounts]').onclick=()=>refresh?.();draw();
 }
 window.QoriSellerAccounts={render,summary};
})();

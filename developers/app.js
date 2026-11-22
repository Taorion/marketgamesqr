'use strict';
const $=id=>document.getElementById(id),view=document.body.dataset.view;
let accountId=null,partnerId=null,selectedDocument=null,nextOffset=null,policy=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function clear(){accountId=null;$('workspace').hidden=true;$('access').hidden=false;for(const id of ['apps','documents','detail-lines','consents','secret'])if($(id))$(id).replaceChildren();if($('secret-panel'))$('secret-panel').hidden=true;}
async function api(url,{method='GET',body}={}) {
 const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Qori-Web':'1',...(accountId?{'X-Qori-Account':accountId}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json();
 if(!r.ok){if(r.status===401||r.status===409&&r.headers.get('X-Qori-Session-Changed'))clear();throw new Error(d.error?.code||d.error?.message||'No se pudo completar la operación.');}
 return d;
}
function action(label,fn,cls='secondary'){
 const b=el('button',label,cls);b.type='button';b.addEventListener('click',()=>run(fn,b));return b;
}
async function run(fn,button){if(button)button.disabled=true;try{await fn();}catch(e){status(e.message,true);}finally{if(button)button.disabled=false;}}
function bind(id,fn){$(id).addEventListener('submit',e=>{e.preventDefault();run(()=>fn(new FormData(e.target)),e.submitter);});}
const money=(n,currency='COP')=>new Intl.NumberFormat('es-CO',{style:'currency',currency}).format(n/100);
async function developers(){
 const data=await api('/api/developers/v1/overview');partnerId=data.partners[0]?.id||null;
 $('registration').hidden=!!partnerId;$('app-form').hidden=!partnerId;
 $('partner-name').textContent=data.partners.map(p=>p.name+' · Verificación empresarial: '+p.verification_state).join(', ');
 $('apps').replaceChildren();
 for(const app of data.apps){
  const card=el('article',undefined,'card');card.append(el('h3',app.name),el('p','SANDBOX · '+app.id,'muted'));
  const counts=Object.fromEntries(app.metrics.map(m=>[m.state,m.count]));
  card.append(el('p','En cola: '+((counts.QUEUED||0)+(counts.RETRY||0))+' · Procesadas: '+(counts.DONE||0)+' · Rechazadas: '+(counts.DEAD||0)));
  card.append(el('p',app.merchants.some(m=>!m.revoked_at&&new Date(m.expires_at)>new Date())?'Emisor sintético autorizado: 900000000':'Sin emisor autorizado'));
  const actions=el('div',undefined,'actions');
  actions.append(action(app.listed?'Ocultar del catálogo':'Mostrar en catálogo sandbox',async()=>{await api('/api/developers/v1/apps/'+app.id+'/catalog',{method:'PUT',body:{listed:!app.listed}});await developers();status('Catálogo actualizado.');}));
  actions.append(action('Autorizar comercio de prueba',async()=>{await api('/api/developers/v1/apps/'+app.id+'/fixture-merchant',{method:'POST',body:{synthetic_only:true}});await developers();status('Comercio de prueba autorizado.');}));
  actions.append(action('Revocar comercio',async()=>{await api('/api/developers/v1/apps/'+app.id+'/fixture-merchant',{method:'DELETE'});await developers();status('Autorización revocada.');},'danger'));
  actions.append(action('Generar credencial',async()=>{const d=await api('/api/developers/v1/apps/'+app.id+'/keys',{method:'POST',body:{}});$('secret').textContent=d.secret;$('secret-panel').hidden=false;$('send-form').elements.token.value=d.secret;await developers();$('secret-panel').scrollIntoView({behavior:'smooth',block:'center'});status('Credencial creada; se muestra una sola vez.');}));
  card.append(actions);
  for(const key of app.keys){const p=el('div',undefined,'actions');p.append(el('span',key.prefix+'… · '+(key.revoked_at?'Revocada':'Vence '+new Date(key.expires_at).toLocaleDateString('es-CO')),'muted'));if(!key.revoked_at)p.append(action('Revocar credencial',async()=>{await api('/api/developers/v1/apps/'+app.id+'/keys/'+key.id,{method:'DELETE'});$('secret').textContent='';$('secret-panel').hidden=true;$('send-form').elements.token.value='';await developers();status('Credencial revocada.');},'danger'));card.append(p);}
  if(app.receipts.length){const details=el('details');details.append(el('summary','Últimos acuses técnicos'));for(const r of app.receipts)details.append(el('p',r.id+' · '+r.status,'muted'));card.append(details);}
  $('apps').append(card);
 }
 if(!data.apps.length)$('apps').append(el('p','Crea tu primera aplicación para comenzar.'));
}
async function customer(append=false){
 if(!append){
  const [consents,catalog,books]=await Promise.all([api('/api/customer/invoices/consent'),api('/api/customer/invoices/integrations'),api('/api/customer/finance-books')]);policy=consents.policy;
  $('policy').textContent=policy.text;$('identity-state').textContent=consents.identity_verified?'Identidad sintética habilitada para pruebas.':'Falta una atestación de identidad. La cédula declarada no acredita titularidad. En este sandbox solo se habilitan fixtures locales.';
  const form=$('consent-form');form.querySelector('button').disabled=!consents.identity_verified;
  for(const [field,items]of [['app',catalog.integrations.map(a=>({id:a.id,name:a.name+' · '+a.partner}))],['book',books.books]]){form.elements[field].replaceChildren();for(const item of items){const o=el('option',item.name);o.value=item.id;form.elements[field].append(o);}}
  $('consents').replaceChildren();
  for(const c of consents.consents){const card=el('article',undefined,'card');card.append(el('h3',c.app_name),el('p',c.revoked_at?'Revocada':'Recepción autorizada'),el('p',c.text_version,'muted'));if(!c.revoked_at)card.append(action('Revocar recepción',async()=>{await api('/api/customer/invoices/consents/'+c.id,{method:'DELETE'});await customer();status('Revocada. Los próximos envíos no se asignarán a tu cuenta.');},'danger'));$('consents').append(card);}
  $('documents').replaceChildren();nextOffset=0;
 }
 const data=await api('/api/customer/invoices/?offset='+(nextOffset||0));nextOffset=data.next_offset;$('more').hidden=nextOffset===null;
 for(const d of data.documents){const card=el('article',undefined,'card');card.append(el('h3',d.id===d.uuid?d.seller.name:d.seller.name+' · '+d.type),el('p',d.issued_on+' · '+money(d.totals.payable_minor,d.currency)),el('p','DIAN no verificada · Pago no acreditado','muted'));card.append(action('Ver detalle',()=>detail(d.id)));$('documents').append(card);}
 if(!append&&!data.documents.length)$('documents').append(el('p','Aún no tienes facturas recibidas. Autoriza una aplicación y envía un ejemplo con el consumidor sintético.'));
}
async function detail(id){
 const {document:d}=await api('/api/customer/invoices/'+id);selectedDocument=id;$('detail').hidden=false;
 $('detail-title').textContent=d.seller.name+' · '+d.number;
 $('detail-summary').textContent='Facturado: '+money(d.totals.payable_minor,d.currency)+' · Impuestos: '+money(d.totals.tax_minor,d.currency)+' · Descuentos generales: '+money(d.totals.discount_minor,d.currency)+' · Cargos: '+money(d.totals.charge_minor,d.currency)+'. DIAN no verificada. El medio de pago declarado no demuestra que se haya pagado.';
 const table=el('table'),head=el('thead'),row=el('tr');for(const s of ['Producto','Cantidad','Precio unitario','Base','Categoría sugerida'])row.append(el('th',s));head.append(row);table.append(head);const body=el('tbody');
 for(const line of d.lines){const r=el('tr');for(const s of [line.name,line.quantity,money(Math.round(Number(line.unit_price)*100),d.currency),money(line.net_minor,d.currency),line.category])r.append(el('td',s));body.append(r);}table.append(body);$('detail-lines').replaceChildren(table);
 $('detail-taxes').replaceChildren();for(const t of d.taxes)for(const s of t.subtotals)$('detail-taxes').append(el('p',(s.name||s.code)+' · '+(s.percent||'')+' % · '+money(s.amount_minor,d.currency)));
 if(d.related)$('detail-taxes').append(el('p','Relacionado con '+d.related.id+(d.related_document_id?' · Factura encontrada en tu bandeja.':' · Pendiente de recibir la factura relacionada.')));
 $('xml-link').href='/api/customer/invoices/'+id+'/xml';
 $('reconcile-form').hidden=d.type!=='Invoice'||!!d.entry_id;$('reconciled').textContent=d.entry_id?'Vinculada al gasto existente '+d.entry_id+'. No se creó un nuevo gasto.':'';
 $('detail').scrollIntoView({behavior:'smooth',block:'start'});
}
async function boot(){
 try{const me=await api('/api/customer/me');accountId=me.account?.id||me.id;if(!accountId)throw new Error('No se pudo identificar la sesión.');
 $('workspace').hidden=false;$('access').hidden=true;
 await(view==='developers'?developers():customer());status('Sandbox listo. Usa únicamente datos sintéticos.');
 }catch(e){clear();status(e.message,true);}
}
if(view==='developers'){
 bind('partner-form',async d=>{await api('/api/developers/v1/partners',{method:'POST',body:{name:d.get('name')}});await developers();status('Integrador registrado para sandbox.');});
 bind('app-form',async d=>{await api('/api/developers/v1/apps',{method:'POST',body:{partner_id:partnerId,name:d.get('name')}});$('app-form').reset();await developers();status('Aplicación creada.');});
 $('hide-secret').onclick=()=>{$('secret').textContent='';$('secret-panel').hidden=true;$('send-form').elements.token.value='';};
 $('send-form').elements.key.value='sandbox-'+crypto.randomUUID();
 fetch('/developers/example.xml',{cache:'no-store'}).then(r=>r.text()).then(t=>{$('send-form').elements.xml.value=t;}).catch(()=>status('No se pudo cargar el ejemplo.',true));
 bind('send-form',async d=>{
  const r=await fetch('/api/invoice/v1/invoices',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+d.get('token'),'Idempotency-Key':d.get('key')},body:JSON.stringify({issuer_nit:'900000000',xml:d.get('xml')})});
  const result=await r.json();$('result').textContent='HTTP '+r.status+'\n'+JSON.stringify(result,null,2);if(!r.ok)throw new Error(result.error?.code||'No se pudo enviar.');await developers();status('Recibida en cola. Actualiza los acuses para consultar el resultado técnico.');
 });
}else{
 bind('consent-form',async d=>{await api('/api/customer/invoices/consents',{method:'POST',body:{app_id:d.get('app'),book_id:d.get('book'),accepted:true,text_version:policy.version}});await customer();status('Consentimiento registrado.');});
 bind('reconcile-form',async d=>{await api('/api/customer/invoices/'+selectedDocument+'/reconcile',{method:'POST',body:{entry_id:d.get('entry'),confirmed:true}});await detail(selectedDocument);status('Gasto vinculado. No se creó otro movimiento.');});
 $('more').onclick=()=>run(()=>customer(true),$('more'));
}
$('refresh').onclick=()=>run(()=>view==='developers'?developers():customer(),$('refresh'));
window.addEventListener('storage',e=>{if(e.key==='qori-session-change'){clear();status('La sesión cambió. Recarga para continuar.',true);}});
boot();


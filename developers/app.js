'use strict';
const $=id=>document.getElementById(id),view=document.body.dataset.view;
let accountId=null,partnerId=null,selectedDocument=null,nextOffset=null,policy=null,categories=[];
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
 for(const id of ['send-form','homologation-form']){const field=$(id).elements.app,prior=field.value;field.replaceChildren();for(const app of data.apps){const o=el('option',app.name);o.value=app.id;field.append(o);}if(data.apps.some(a=>a.id===prior))field.value=prior;}
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
  actions.append(action('Generar credencial',async()=>{const d=await api('/api/developers/v1/apps/'+app.id+'/keys',{method:'POST',body:{}});$('secret').textContent='client_id: '+d.client_id+'\nclient_secret: '+d.client_secret;$('secret-panel').hidden=false;await developers();$('secret-panel').scrollIntoView({behavior:'smooth',block:'center'});status('Credencial creada; se muestra una sola vez.');}));
  actions.append(action(app.active?'Desactivar aplicación':'Reactivar aplicación',async()=>{await api('/api/developers/v1/apps/'+app.id+'/state',{method:'PUT',body:{active:!app.active}});await developers();}));
  actions.append(action('Consumo del mes',async()=>{const to=new Date().toISOString().slice(0,10),from=to.slice(0,8)+'01';card.append(el('pre',JSON.stringify(await api('/api/developers/v1/apps/'+app.id+'/metrics?from='+from+'&to='+to),null,2)));}));
  for(const h of app.homologations||[])card.append(el('p','Homologación: '+h.state+' · Producción bloqueada'));
  card.append(actions);
  for(const key of app.keys){const p=el('div',undefined,'actions');p.append(el('span',key.prefix+'… · '+(key.revoked_at?'Revocada':'Vence '+new Date(key.expires_at).toLocaleDateString('es-CO')),'muted'));if(!key.revoked_at)p.append(action('Revocar credencial',async()=>{await api('/api/developers/v1/apps/'+app.id+'/keys/'+key.id,{method:'DELETE'});$('secret').textContent='';$('secret-panel').hidden=true;await developers();status('Credencial revocada.');},'danger'));card.append(p);}
  if(app.receipts.length){const details=el('details');details.append(el('summary','Últimos acuses técnicos'));for(const r of app.receipts)details.append(el('p',r.submission_id+' · '+r.status,'muted'));card.append(details);}
  $('apps').append(card);
 }
 $('members').replaceChildren();
 if(partnerId&&data.partners[0].role==='OWNER'){const team=await api('/api/developers/v1/partners/'+partnerId+'/members');for(const m of team.members){const p=el('p',m.customer_id+' · '+m.role,'muted');p.append(action('Retirar acceso',async()=>{await api('/api/developers/v1/partners/'+partnerId+'/members/'+m.customer_id,{method:'DELETE'});await developers();}));$('members').append(p);}}
 if(!data.apps.length)$('apps').append(el('p','Crea tu primera aplicación para comenzar.'));
}
async function customer(append=false){
 if(!append){
  const [consents,catalog,books]=await Promise.all([api('/api/customer/invoices/consent'),api('/api/customer/invoices/integrations'),api('/api/customer/finance-books')]);policy=consents.policy;categories=consents.categories||[];
  $('policy').textContent=policy.text;$('identity-state').textContent=consents.identity_verified?'Identidad sintética habilitada para pruebas.':'Falta una atestación de identidad. La cédula declarada no acredita titularidad. En este sandbox solo se habilitan fixtures locales.';
  const form=$('consent-form');form.querySelector('button').disabled=!consents.identity_verified;
  for(const [field,items]of [['app',catalog.integrations.map(a=>({id:a.id,name:a.name+' · '+a.partner}))],['book',books.books]]){form.elements[field].replaceChildren();for(const item of items){const o=el('option',item.name);o.value=item.id;form.elements[field].append(o);}}
  $('consents').replaceChildren();
  for(const c of consents.consents){const card=el('article',undefined,'card');card.append(el('h3',c.app_name),el('p',c.revoked_at?'Revocada':'Recepción autorizada'),el('p',c.text_version,'muted'));if(!c.revoked_at)card.append(action('Revocar recepción',async()=>{await api('/api/customer/invoices/consents/'+c.id,{method:'DELETE'});await customer();status('Revocada. Los próximos envíos no se asignarán a tu cuenta.');},'danger'));$('consents').append(card);}
  $('documents').replaceChildren();nextOffset=0;await requests();
  if(!consents.identity_verified){$('more').hidden=true;return;}
  await financialSummary();
 }
 const data=await api('/api/customer/invoices/?'+filters()+'&offset='+(nextOffset||0));nextOffset=data.next_offset;$('more').hidden=nextOffset===null;
 for(const d of data.documents){const card=el('article',undefined,'card');card.append(el('h3',d.id===d.uuid?d.seller.name:d.seller.name+' · '+d.type),el('p',d.issued_on+' · '+money(d.totals.payable_minor,d.currency)),el('p','DIAN no verificada · Pago no acreditado','muted'));card.append(action('Ver detalle',()=>detail(d.id)));$('documents').append(card);}
 if(!append&&!data.documents.length)$('documents').append(el('p','Aún no tienes facturas recibidas. Autoriza una aplicación y envía un ejemplo con el consumidor sintético.'));
}
async function detail(id){
 const {document:d}=await api('/api/customer/invoices/'+id);selectedDocument=id;$('detail').hidden=false;
 $('detail-title').textContent=d.seller.name+' · '+d.number;
 $('detail-cufe').textContent='CUFE/CUDE: '+d.uuid;
 $('detail-summary').textContent='Facturado: '+money(d.totals.payable_minor,d.currency)+' · Impuestos: '+money(d.totals.tax_minor,d.currency)+' · Descuentos generales: '+money(d.totals.discount_minor,d.currency)+' · Cargos: '+money(d.totals.charge_minor,d.currency)+'. DIAN no verificada. El medio de pago declarado no demuestra que se haya pagado.';
 const table=el('table'),head=el('thead'),row=el('tr');for(const s of ['Producto','Cantidad / unidad','Precio unitario','Base','Categoría sugerida','Organizar'])row.append(el('th',s));head.append(row);table.append(head);const body=el('tbody');
 for(const line of d.lines){const r=el('tr');for(const s of [line.name+(line.sku?' · SKU '+line.sku:''),line.quantity+' '+(line.unit||''),line.unit_price+' '+d.currency,money(line.net_minor,d.currency),line.category||'Sin clasificar'])r.append(el('td',s));const cell=el('td'),select=el('select');select.setAttribute('aria-label','Categoría de '+line.name);for(const c of categories){const o=el('option',c.replaceAll('_',' '));o.value=c;select.append(o);}select.value=line.category||'';cell.append(select,action('Guardar',async()=>{await api('/api/customer/invoices/'+id+'/lines/'+encodeURIComponent(line.id)+'/category',{method:'PUT',body:{category:select.value,revision:line.category_trace?.revision||0}});await detail(id);status('Categoría actualizada; XML intacto.');}));r.append(cell);body.append(r);}table.append(body);$('detail-lines').replaceChildren(table);
 $('detail-taxes').replaceChildren();for(const line of d.lines){const section=el('details');section.append(el('summary','Tributos y ajustes · '+line.name));if(line.description)section.append(el('p',line.description));for(const tax of line.taxes)for(const t of tax.subtotals)section.append(el('p',(t.name||t.code)+' '+(t.percent||'')+' % · '+money(t.amount_minor,d.currency)));for(const a of line.adjustments)section.append(el('p',(a.charge?'Cargo: ':'Descuento: ')+money(a.amount_minor,d.currency)+' '+(a.reason||'')));$('detail-taxes').append(section);}for(const t of d.taxes)for(const s of t.subtotals)$('detail-taxes').append(el('p',(s.name||s.code)+' · '+(s.percent||'')+' % · '+money(s.amount_minor,d.currency)));
 if(d.related)$('detail-taxes').append(el('p','Relacionado con '+d.related.id+(d.related_document_id?' · Factura encontrada en tu bandeja.':' · Pendiente de recibir la factura relacionada.')));
 $('xml-link').href='/api/customer/invoices/'+id+'/xml';
 $('reconcile-form').hidden=d.type!=='Invoice'||!!d.entry_id;$('reconciled').textContent=d.entry_id?'Vinculada al gasto existente '+d.entry_id+'. No se creó un nuevo gasto.':'';
 $('detail').scrollIntoView({behavior:'smooth',block:'start'});
}
async function boot(){
 try{const me=await api('/api/customer/me');accountId=me.account?.id||me.id;if(!accountId)throw new Error('No se pudo identificar la sesión.');
 $('workspace').hidden=false;$('access').hidden=true;
 await(view==='developers'?developers():customer());status('Sandbox listo. Usa únicamente datos sintéticos.');
 }catch(e){if(!accountId)clear();status(e.message,true);}
}
if(view==='developers'){
 bind('partner-form',async d=>{await api('/api/developers/v1/partners',{method:'POST',body:{name:d.get('name')}});await developers();status('Integrador registrado para sandbox.');});
 bind('app-form',async d=>{await api('/api/developers/v1/apps',{method:'POST',body:{partner_id:partnerId,name:d.get('name')}});$('app-form').reset();await developers();status('Aplicación creada.');});
 $('hide-secret').onclick=()=>{$('secret').textContent='';$('secret-panel').hidden=true;};
 $('send-form').elements.key.value='sandbox-'+crypto.randomUUID();
 bind('send-form',async d=>{
  const result=await api('/api/developers/v1/apps/'+d.get('app')+'/sandbox-run',{method:'POST',body:{scenario:d.get('scenario'),idempotency_key:d.get('key')}});$('result').textContent=JSON.stringify(result,null,2);await developers();status('Recibida en cola. Actualiza los acuses técnicos.');
 });
}else{
 bind('consent-form',async d=>{await api('/api/customer/invoices/consents',{method:'POST',body:{app_id:d.get('app'),book_id:d.get('book'),accepted:true,text_version:policy.version}});await customer();status('Consentimiento registrado.');});
 bind('reconcile-form',async d=>{await api('/api/customer/invoices/'+selectedDocument+'/reconcile',{method:'POST',body:{entry_id:d.get('entry'),confirmed:true}});await detail(selectedDocument);status('Gasto vinculado. No se creó otro movimiento.');});
 $('more').onclick=()=>run(()=>customer(true),$('more'));
}
$('refresh').onclick=()=>run(()=>view==='developers'?developers():customer(),$('refresh'));
window.addEventListener('storage',e=>{if(e.key==='qori-session-change'){clear();status('La sesión cambió. Recarga para continuar.',true);}});
function filters(){return new URLSearchParams([...new FormData($('filter-form'))].filter(([,v])=>v));}
async function requests(){const d=await api('/api/customer/invoices/requests');$('privacy-requests').replaceChildren(...d.requests.map(r=>el('p',r.kind+' · '+r.state+' · '+r.id,'muted')));}
async function financialSummary(){
 const [summary,notices]=await Promise.all([api('/api/customer/invoices/summary?'+filters()),api('/api/customer/invoices/notices')]);
 $('financial-summary').replaceChildren();$('notices').replaceChildren();
 for(const c of summary.currencies){const card=el('article',undefined,'card');card.append(el('h3',c.currency),el('p','Compras documentadas: '+money(c.purchases_minor,c.currency)),el('p','Pagos vinculados a gastos registrados: '+money(c.linked_payments_minor,c.currency)),el('p','Impuestos: '+money(c.tax_minor,c.currency)+' · Descuentos: '+money(c.discount_minor,c.currency)),el('p','Sin vínculo: pago no confirmado. Un gasto registrado no constituye verificación bancaria.','muted'));
 for(const [label,values]of [['Por periodo',c.periods],['Por categoría',c.categories]]){const d=el('details');d.append(el('summary',label));for(const [k,n]of Object.entries(values))d.append(el('p',k.replaceAll('_',' ')+': '+money(n,c.currency)));card.append(d);}
 card.append(el('p','Facturas declaradas a crédito (valor bruto): '+money(c.credit_purchases_minor,c.currency)));
 const merchants=el('details');merchants.append(el('summary','Por comercio'));for(const m of Object.values(c.merchants))merchants.append(el('p',m.name+': '+money(m.amount_minor,c.currency)));card.append(merchants);
 const products=el('details');products.append(el('summary','Precios observados comparables'));for(const p of Object.values(c.products))products.append(el('p',p.name+' · '+p.sku+' / '+p.unit+': '+p.observations.map(o=>o.date+' '+o.unit_price+' '+c.currency).join(' · ')));card.append(products);
 if(c.unmatched_notes)card.append(el('p',c.unmatched_notes+' notas pendientes de factura original.'));$('financial-summary').append(card);}
 for(const n of notices.items.filter(n=>!n.read_at))$('notices').append(action('Abrir factura recibida',async()=>{await detail(n.document_id);await api('/api/customer/invoices/notices/'+n.id+'/read',{method:'POST'});await financialSummary();}));
}
if(view==='developers'){
 bind('profile-form',async d=>{const terms=await api('/api/developers/v1/terms');await api('/api/developers/v1/partners/'+partnerId+'/profile',{method:'PUT',body:{...Object.fromEntries(d),accepted:true,terms_version:terms.version}});status('Perfil sintético guardado.');});
 bind('invite-form',async d=>{$('invitation-result').textContent=JSON.stringify(await api('/api/developers/v1/partners/'+partnerId+'/invites',{method:'POST',body:{role:d.get('role')}}),null,2);});
 bind('join-form',async d=>{await api('/api/developers/v1/invites/accept',{method:'POST',body:{token:d.get('token')}});$('join-form').reset();await developers();});
 bind('homologation-form',async d=>{const body={};for(const [k]of d)if(k!=='app')body[k]=true;await api('/api/developers/v1/apps/'+d.get('app')+'/homologation',{method:'POST',body});await developers();status('Revisión solicitada. Producción permanece bloqueada.');});
}else{
 bind('identity-form',async d=>{await api('/api/customer/invoices/identity/requests',{method:'POST',body:Object.fromEntries(d)});await customer();status('Solicitud registrada; no acredita identidad automáticamente.');});
 bind('filter-form',()=>customer());
 bind('privacy-form',async d=>{await api('/api/customer/invoices/requests',{method:'POST',body:{kind:d.get('kind'),reason:d.get('reason'),document_id:selectedDocument}});$('privacy-form').reset();await requests();status('Solicitud registrada para revisión.');});
}
boot();

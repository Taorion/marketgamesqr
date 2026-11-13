const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
function setup({status='DRAFT',role='QORI_SELLER',hash='',linked=false,override=false,closed=false,prospects=null}={}){
 const w=new JSDOM(fs.readFileSync('seller/index.html','utf8'),{url:'https://example.test/seller/'+hash,runScripts:'outside-only'}).window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.onclose?.();};
 w.sessionStorage.setItem('qori-seller-token','qa-only');w.fetch=async(path,options={})=>{calls.push({path,body:options.body&&JSON.parse(options.body)});let d={ok:true};
 if(path.endsWith('/resources'))d={resources:[],presentation_url:'https://example.test/conoce-qori/?seller=seller-1',admin:false};
 if(path.endsWith('/terms'))d={commission_policy:require('../backend/src/services/sellerCommissionPolicy').publicPolicy(),clauses:[{title:'Condiciones',text:'10% sobre compras confirmadas'}]};
 if(path.endsWith('/demo/session'))d={token:'demo-only-token',user:{id:'demo-actor',business_id:'demo-business',demo_mode:true}};
 if(path.endsWith('/application'))d={user:{id:'seller-1',full_name:'Embajador <img src=x>',email:'qa@example.test',role},legacy:status===null,application:status===null?null:{status,approval_mode:override?'ADMIN_OVERRIDE':'DOCUMENTS'},documents:[],documentation:override?{attention:true,override:true,missing:['IDENTITY','RUT','BANK','CONTRACT']}:undefined};
 if(path.endsWith('/dashboard')&&status==='SUSPENDED')return {ok:false,json:async()=>({error:{message:'Acceso bloqueado',details:{code:'SELLER_APPROVAL_REQUIRED'}}})};
 if(path.endsWith('/dashboard'))d={totals:{pending_cop:15000,paid_cop:0,paying_businesses:1},accounts:[{id:'b',name:'Café',plan_code:'PENSE_EN_TI',subscription_status:'ACTIVE'}],commissions:[],payouts:[],next_payment_date:'2026-11-12',referral_url:'https://example.test/pense-en-ti/?seller=seller-1',plan_referral_url:'https://example.test/paquetes/?advisor=seller-1'};
 if(path.endsWith('/prospects'))d={rows:prospects||(linked?[{id:'prospect',business_id:'b',business_name:'Cliente Freemium',stage:'WON',closed_at:closed?'2026-11-09T12:00:00Z':null}]:[]),has_more:false,next_offset:0};
 if(path.split('?')[0].endsWith('/accounts'))d={accounts:[{id:'b',lifecycle:{label:'Freemium · vence pronto',tone:'warning',trial:{status:'ACTIVE',ends_at:'2026-11-15T15:00:00Z',days_remaining:2}}}]};
 if(path.endsWith('/admin/queue'))d={applications:[{user_id:'applicant',full_name:'Ana',email:'ana@example.test',status:'SUBMITTED',documents:[]}],balances:[],payouts:[]};
 return {ok:true,json:async()=>d};
 };w.eval(fs.readFileSync('seller/accounts.js','utf8'));w.eval(fs.readFileSync('seller/history.js','utf8'));w.eval(fs.readFileSync('seller/referral-links.js','utf8'));w.eval(fs.readFileSync('seller/resources.js','utf8'));w.eval(fs.readFileSync('seller/opportunity.js','utf8'));w.eval(fs.readFileSync('seller/app.js','utf8'));return {w,calls,setStatus:value=>{status=value;}};
}
test('approved Seller hands off a separate demo session while pending Seller has no demo access',async()=>{
 const {w,calls}=setup({status:'APPROVED'});try{
  await until(()=>w.document.querySelector('#referralLink'));
  w.localStorage.setItem('qr_business_portal_session_v1','original-business');
  w.document.querySelector('#openDemoQori').click();
  await until(()=>w.localStorage.getItem('qori_demo_portal_session_v1'));
  assert.equal(JSON.parse(w.localStorage.getItem('qori_demo_portal_session_v1')).token,'demo-only-token');
  assert.equal(w.localStorage.getItem('qr_business_portal_session_v1'),'original-business');
  assert.equal(w.sessionStorage.getItem('qori-seller-token'),'qa-only');
  assert.ok(calls.some(c=>c.path.endsWith('/demo/session')));
 }finally{w.close();}
 const locked=setup();try{await until(()=>locked.w.document.querySelector('#approvalTitle'));assert.equal(locked.w.document.querySelector('#openDemoQori'),null);}finally{locked.w.close();}
});

test('pending application keeps commercial UI hidden and document workflow available',async()=>{
 const {w,calls}=setup();try{await until(()=>w.document.querySelector('#completeApplication'));assert.match(w.document.querySelector('#approvalTitle').textContent,/pendiente de aprobación/);w.document.querySelector('#completeApplication').click();await until(()=>w.document.querySelector('#downloadContract'));assert.equal(w.document.querySelector('[data-view=crm]'),null);assert.equal(w.document.querySelectorAll('[data-kind]').length,4);assert.equal(w.document.querySelector('h1 img'),null);assert.equal(calls.some(x=>x.path.endsWith('/dashboard')),false);assert.equal(w.document.querySelector('[name=ciiu]'),null);assert.equal(w.document.querySelector('#signupForm button').disabled,false);assert.equal(w.document.querySelector('#submitApplication button').disabled,false);assert.match(w.document.querySelector('#signupForm').textContent,/4610 — Comercio al por mayor a cambio de una retribución o por contrata/);assert.match(w.document.querySelector('#panel').textContent,/4610 — Comercio al por mayor a cambio de una retribución o por contrata/);
 const f=w.document.querySelector('#submitApplication');f.elements.signed.checked=true;f.elements.truthful.checked=true;f.elements.ciiu_terms.checked=true;await f.onsubmit({currentTarget:f,preventDefault(){}});await until(()=>calls.some(x=>x.path.endsWith('/submit')));assert.deepEqual(calls.find(x=>x.path.endsWith('/submit')).body,{signed_and_notarized:true,documents_truthful:true,ciiu_terms_accepted:true});await new Promise(r=>setImmediate(r));}finally{w.close();}
});
test('approved Seller sees balances and can record a scoped CRM follow-up',async()=>{
 const {w,calls}=setup({status:'APPROVED'});try{await until(()=>w.document.querySelector('#referralLink'));assert.match(w.document.querySelector('#panel').textContent,/Por pagar/);w.document.querySelector('[data-view=crm]').click();await until(()=>w.document.querySelector('#newProspect'));w.document.querySelector('#newProspect').click();const f=[...w.document.querySelectorAll('dialog form')].find(f=>f.elements.business_name);assert.ok(f);assert.deepEqual([...f.elements.stage.options].map(o=>o.value),['NEW','CONTACTED','NEGOTIATING']);
 for(const [k,v] of Object.entries({business_name:'Café de prueba',contact_name:'Ana',email:'ana@example.test',phone:'3105550000',notes:'Conversación autorizada',stage:'CONTACTED'}))f.elements[k].value=v;await f.onsubmit({currentTarget:f,preventDefault(){}});await until(()=>calls.some(x=>x.body?.business_name));const body=calls.find(x=>x.body?.business_name).body;assert.equal(body.seller_id,undefined);assert.equal(body.stage,'CONTACTED');await new Promise(r=>setImmediate(r));}finally{w.close();}
});
test('submitted application only shows review notice, then unlocks after approved status refresh',async()=>{
 const {w,calls,setStatus}=setup({status:'SUBMITTED',hash:'#admin'});try{
  await until(()=>w.document.querySelector('#approvalTitle'));assert.match(w.document.querySelector('#approvalTitle').textContent,/Estamos revisando tu solicitud para aprobación/);
  assert.equal(w.document.querySelector('#workspace [data-view]'),null);assert.equal(w.document.querySelector('#downloadContract'),null);assert.equal(w.document.querySelector('#completeApplication'),null);assert.ok(w.document.body.classList.contains('seller-locked'));
  assert.equal(calls.some(c=>/dashboard|accounts|prospects|admin\/queue/.test(c.path)),false);
  setStatus('APPROVED');w.document.querySelector('#refreshApproval').click();await until(()=>w.document.querySelector('#referralLink'));assert.equal(w.document.querySelector('#approvalTitle'),null);assert.equal(w.document.body.classList.contains('seller-locked'),false);
  w.document.querySelector('#loginOpen').click();assert.equal(w.document.querySelector('#workspace').innerHTML,'');
 }finally{w.close();}
});
test('missing, rejected and suspended applications cannot inherit legacy commercial access',async()=>{
 for(const status of [null,'REJECTED','SUSPENDED','CHANGES_REQUESTED']){
  const {w,calls}=setup({status});try{await until(()=>w.document.querySelector('#approvalTitle'));assert.equal(w.document.querySelector('#workspace [data-view]'),null);assert.equal(calls.some(c=>c.path.endsWith('/dashboard')),false);assert.equal(Boolean(w.document.querySelector('#completeApplication')),status===null||status==='CHANGES_REQUESTED');}finally{w.close();}
 }
});
test('approval revoked during a session replaces the portal with the locked screen',async()=>{
 const {w,setStatus}=setup({status:'APPROVED'});try{await until(()=>w.document.querySelector('#referralLink'));setStatus('SUSPENDED');w.document.querySelector('[data-view=dashboard]').click();await until(()=>w.document.querySelector('#approvalTitle'));assert.match(w.document.querySelector('#approvalTitle').textContent,/suspendido/);assert.equal(w.document.querySelector('#referralLink'),null);assert.equal(w.document.querySelector('[data-view=crm]'),null);}finally{w.close();}
});
test('CRM linked subscriber shows Freemium deadline alongside the commercial stage',async()=>{
 const {w}=setup({status:'APPROVED',linked:true});try{await until(()=>w.document.querySelector('#referralLink'));w.document.querySelector('[data-view=crm]').click();await until(()=>w.document.querySelector('.seller-account-inline'));assert.match(w.document.querySelector('#prospectRows').textContent,/Freemium · vence pronto/);assert.match(w.document.querySelector('#prospectRows').textContent,/Quedan 2 días de prueba/);assert.match(w.document.querySelector('#prospectRows').textContent,/Inscrito/);}finally{w.close();}
});
test('superadmin review sends explicit documentary verification instead of automatic approval',async()=>{
 const {w,calls}=setup({status:'APPROVED',role:'QORI_SUPERADMIN',hash:'#admin'});try{await until(()=>w.document.querySelector('[data-review]'));const f=w.document.querySelector('[data-review]');f.elements.status.value='APPROVED';f.elements.note.value='Documentos comprobados por administración.';for(const k of ['identity_checked','ciiu_checked','bank_ownership_checked','notarized_contract_checked','legal_terms_checked'])f.elements[k].checked=true;await f.onsubmit({currentTarget:f,preventDefault(){}});await until(()=>calls.some(x=>x.path.endsWith('/review')));assert.equal(calls.find(x=>x.path.endsWith('/review')).body.notarized_contract_checked,true);await new Promise(r=>setImmediate(r));}finally{w.close();}
});

test('authorized Seller keeps commercial access and red attention while completing documents',async()=>{const {w,calls}=setup({status:'APPROVED',override:true});try{await until(()=>w.document.querySelector('#referralLink'));assert.match(w.document.querySelector('.seller-document-attention').textContent,/Atención: documentación pendiente/);assert.match(w.document.querySelector('.seller-document-attention').textContent,/Alta autorizada por superadmin/);w.document.querySelector('[data-view=application]').click();await until(()=>w.document.querySelector('[data-kind]'));assert.equal(w.document.querySelectorAll('[data-kind]').length,4);assert.ok(w.document.querySelector('[data-view=crm]'));}finally{w.close();}});

test('Seller only sees a validated close after the administrator records it',async()=>{const {w}=setup({status:'APPROVED',linked:true,closed:true});try{await until(()=>w.document.querySelector('#referralLink'));w.document.querySelector('[data-view=crm]').click();await until(()=>w.document.querySelector('#prospectRows .card'));assert.match(w.document.querySelector('#prospectRows').textContent,/Cierre validado por Admin/);assert.equal(w.document.querySelector('[data-edit]'),null);}finally{w.close();}});

test('approved Seller opens library from navigation; pending Seller cannot see it',async()=>{const {w}=setup({status:'APPROVED'});try{await until(()=>w.document.querySelector('[data-view=resources]'));w.document.querySelector('[data-view=resources]').click();await until(()=>w.document.querySelector('[data-presentation]'));assert.match(w.document.querySelector('[data-presentation]').textContent,/Copiar/);}finally{w.close();}});

test('approved Seller opens opportunity and continues to CRM',async()=>{const {w}=setup({status:'APPROVED'});try{await until(()=>w.document.querySelector('[data-view=opportunity]'));w.document.querySelector('[data-view=opportunity]').click();await until(()=>w.document.querySelector('#panel [data-action=crm]'));w.document.querySelector('#panel [data-action=crm]').click();await until(()=>w.document.querySelector('#newProspect'));assert.ok(w.document.querySelector('#newProspect'));}finally{w.close();}});

test('daily actions open a new contact and preserve keyboard access to result sections',async()=>{
 const {w,calls}=setup({status:'APPROVED'});try{
  await until(()=>w.document.querySelector('[data-start=new]'));
  for(const link of w.document.querySelectorAll('.seller-shortcuts a')){link.click();assert.equal(w.document.activeElement.id,link.getAttribute('href').slice(1));}
  w.document.querySelector('[data-start=new]').click();await until(()=>w.document.querySelector('dialog [name=business_name]'));
  assert.equal(w.document.querySelector('[data-view=crm]').getAttribute('aria-current'),'page');
  assert.equal(calls.some(c=>c.body?.business_name),false);
  w.document.querySelector('dialog [data-close]').click();w.document.querySelector('[data-view=dashboard]').click();await until(()=>w.document.querySelector('[data-start=resources]'));
  w.document.querySelector('[data-start=resources]').click();await until(()=>w.document.querySelector('[data-presentation]'));
 }finally{w.close();}
});

test('CRM preserves an existing reminder on edit and supports rescheduling or clearing it',async()=>{
 const original='2026-11-16T15:30:00.000Z';
 for(const mode of ['preserve','change','clear']){
  const {w,calls}=setup({status:'APPROVED',prospects:[{id:'p',business_name:'Café',contact_name:'Ana',email:'ana@example.test',phone:'3105550000',stage:'CONTACTED',next_contact_at:original}]});
  try{
   await until(()=>w.document.querySelector('#referralLink'));w.document.querySelector('[data-view=crm]').click();await until(()=>w.document.querySelector('[data-edit]'));
   assert.match(w.document.querySelector('.follow-up').textContent,/Colombia/);
   w.document.querySelector('[data-edit]').click();const f=w.document.querySelector('dialog [name=business_name]').form,input=f.elements.next_contact_at;
   assert.equal(new Date(input.value).toISOString(),original);
   if(mode==='clear')input.value='';if(mode==='change')input.value='2026-11-18T10:45';
   const expected=mode==='clear'?null:new Date(input.value).toISOString();
   f.onsubmit({preventDefault(){},currentTarget:f});await until(()=>calls.some(c=>c.path.endsWith('/prospects/p')));
   assert.equal(calls.find(c=>c.path.endsWith('/prospects/p')).body.next_contact_at,expected);
   await until(()=>!w.document.querySelector('dialog[data-seller-dialog]'));
  }finally{w.close();}
 }
});

test('logout removes private dialogs and prevents a retained form from saving with a later session',async()=>{
 const {w,calls}=setup({status:'APPROVED'});try{
  await until(()=>w.document.querySelector('[data-start=new]'));w.document.querySelector('[data-start=new]').click();await until(()=>w.document.querySelector('dialog [name=business_name]'));
  const f=w.document.querySelector('dialog [name=business_name]').form;f.elements.business_name.value='Private draft';
  w.document.querySelector('#loginOpen').click();assert.equal(w.document.querySelector('[data-seller-dialog]'),null);
  f.onsubmit({preventDefault(){},currentTarget:f});await new Promise(r=>setImmediate(r));assert.equal(calls.some(c=>c.body?.business_name==='Private draft'),false);
 }finally{w.close();}
});

test('expired authentication clears the workspace and offers login without a broken retry screen',async()=>{
 const {w}=setup({status:'APPROVED'});try{
  await until(()=>w.document.querySelector('#referralLink'));w.fetch=async()=>({ok:false,status:401,json:async()=>({error:{message:'Expired token'}})});
  w.document.querySelector('[data-view=dashboard]').click();await until(()=>w.document.querySelector('#loginDialog').open);
  assert.equal(w.sessionStorage.getItem('qori-seller-token'),null);assert.equal(w.document.querySelector('#workspace').innerHTML,'');assert.match(w.document.querySelector('#loginForm .status').textContent,/sesión terminó/);
  await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('#retry'),null);
 }finally{w.close();}
});

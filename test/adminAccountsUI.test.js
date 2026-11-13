const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));async function until(f){for(let n=0;n<80;n++){if(f())return;await tick();}throw Error('UI did not settle');}
const balances={tickets:{available:63,included:13,additional:50,credited_total:50,used_total:7},giftcards:{available:65,mode:'PREPAID',feature_enabled:true,credit_balance:65,credits_purchased:50,credits_used:5,issued_month:5,monthly_remaining:null,total_remaining:null,tickets_per_card:0,pending_cop:26000,issued_count:5,issued_cop:105000,redeemed_cop:9000,expired_cop:30000,cancelled_cop:40000},access_allowed:true,as_of:'2026-11-09T12:00:00Z'};
function setup(role='QORI_SUPERADMIN'){
 const w=new JSDOM('<section id="accountsWorkspace" hidden></section>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const ctx={user:{role},showTeam(){},showLegacy(){},showSellerAdmin(){},download:async()=>{},api:async(path,opts={})=>{const body=opts.body&&JSON.parse(opts.body);calls.push({path,body});
  if(path.endsWith('bootstrap'))return {counts:Object.fromEntries(['sellers','businesses','customers'].map(k=>[k,{total:1,active:1}])),versions:{sellers:[{code:'SELLER',name:'Seller'}],businesses:[{code:'PENSE_EN_TI',name:'Pensé en ti'}],customers:[{code:'CUSTOMER_FREE',name:'Customer gratis'}]}};
  if(body)return {ok:true};
  if(path.includes('/businesses/c1'))return {record:{id:'c1',name:'Empresa QA',plan_code:'PENSE_EN_TI',subscription_status:'ACTIVE',is_active:true,plan:{name:'Pensé en ti',monthly_price_cop:0},users:[],balances},history:[]};
  if(path.includes('/customers/c1'))return {record:{id:'c1',full_name:'Ana <script>',email:'qa@example.test',is_active:true,admin_revision:2,sessions:1},history:[]};
  return {total:1,has_more:false,rows:[{id:'c1',name:'Ana <img src=x>',email:'qa@example.test',version:path.includes('/customers')?'CUSTOMER_FREE':'PENSE_EN_TI',is_active:true,created_at:'2026-11-07',balances}]};
 }};w.eval(fs.readFileSync('admin/js/accounts.js','utf8'));return {w,calls,ctx};
}
test('Customer management is reachable, escapes names and sends explicit revision/reason',async()=>{
 const {w,calls,ctx}=setup();try{await w.QoriAccounts.load(ctx);w.document.querySelector('[data-kind=customers]').click();await until(()=>w.document.querySelector('[data-detail]'));assert.equal(w.document.querySelector('img'),null);w.document.querySelector('[data-detail]').click();await until(()=>w.document.querySelector('dialog'));const f=w.document.querySelector('dialog form');f.elements.full_name.value='Ana editada';f.elements.reason.value='Verificación administrativa';f.elements.is_active.checked=false;f.elements.revoke_sessions.checked=true;await f.onsubmit({preventDefault(){},target:f});const changed=calls.find(c=>c.body);assert.deepEqual(changed.body,{full_name:'Ana editada',is_active:false,revoke_sessions:true,expected_revision:2,reason:'Verificación administrativa'});assert.equal(w.document.querySelector('dialog'),null);}finally{w.close();}
});
test('Seller role never loads admin accounts and logout clears sensitive detail',async()=>{
 const {w,calls,ctx}=setup('QORI_SELLER');try{await w.QoriAccounts.load(ctx);assert.equal(calls.length,0);assert.equal(w.document.querySelector('section').hidden,true);ctx.user.role='QORI_SUPERADMIN';await w.QoriAccounts.load(ctx);w.QoriAccounts.clear();assert.equal(w.document.querySelector('section').innerHTML,'');}finally{w.close();}
});

test('account loading errors stay visible and can be retried',async()=>{
 const {w,ctx}=setup();try{const original=ctx.api;ctx.api=async()=>{throw Error('Error temporal de cuentas');};await w.QoriAccounts.load(ctx);const root=w.document.querySelector('#accountsWorkspace');assert.equal(root.hidden,false);assert.match(root.textContent,/Error temporal de cuentas/);ctx.api=original;root.querySelector('#accountsRetry').click();await until(()=>root.querySelector('[data-detail]'));assert.equal(root.hidden,false);}finally{w.close();}
});
test('business balances are visible in list and detail; Customer has no business balance column',async()=>{
 const {w,calls,ctx}=setup();try{
  await w.QoriAccounts.load(ctx);const list=w.document.querySelector('#accountsRows');assert.match(list.textContent,/63 tickets/);assert.match(list.textContent,/65 giftcards para emitir/);assert.match(list.textContent,/26.000/);
  list.querySelector('[data-detail]').click();await until(()=>w.document.querySelector('dialog'));
  const detail=w.document.querySelector('[aria-label="Saldos del negocio"]');assert.ok(detail);assert.match(detail.textContent,/Incluidos restantes13/);assert.match(detail.textContent,/Adicionales restantes50/);assert.match(detail.textContent,/Saldo vencido/);assert.match(detail.textContent,/Saldo cancelado/);assert.match(detail.textContent,/Sin límite/);assert.equal(calls.filter(c=>c.body).length,0);
  w.document.querySelector('[data-close]').click();w.document.querySelector('[data-kind=customers]').click();await until(()=>w.document.querySelector('[data-detail]'));assert.doesNotMatch(w.document.querySelector('#accountsRows thead').textContent,/Tickets y giftcards/);
 }finally{w.close();}
});

test('Admin gives explicit high-level access without claiming document verification',async()=>{const {w,calls,ctx}=setup();try{const original=ctx.api;ctx.api=async(path,opts={})=>{if(!opts.body&&path.includes('/sellers/c1'))return {record:{id:'c1',name:'Embajador QA',email:'qa@example.test',is_active:true,application:{status:'DRAFT'},documents:[],documentation:{attention:true,missing:['IDENTITY','RUT','BANK','CONTRACT']},commissions:{}},history:[]};return original(path,opts);};await w.QoriAccounts.load(ctx);w.document.querySelector('[data-kind=sellers]').click();await until(()=>w.document.querySelector('[data-detail]'));w.document.querySelector('[data-detail]').click();await until(()=>w.document.querySelector('#sellerAuthorize'));assert.match(w.document.querySelector('.seller-document-attention').textContent,/Cédula/);w.document.querySelector('#sellerAuthorize').click();const f=w.document.querySelector('dialog form');assert.equal(f.elements.acknowledge_pending_documents.required,true);f.elements.note.value='Autorizo acceso mientras entrega sus documentos.';f.elements.acknowledge_pending_documents.checked=true;await f.onsubmit({preventDefault(){},target:f});const c=calls.find(c=>c.path.endsWith('/authorize-access'));assert.deepEqual(c.body,{note:'Autorizo acceso mientras entrega sus documentos.',acknowledge_pending_documents:true});assert.equal(w.document.querySelector('dialog'),null);}finally{w.close();}});


test('business removal requires written reconfirmation and checkbox; cancel does not delete',async()=>{
 const {w,ctx}=setup(),requests=[];const original=ctx.api;
 ctx.api=async(path,opts={})=>{requests.push({path,...opts});if(path.endsWith('/deletion-preview'))return {name:'Empresa QA',confirmation:'Empresa QA',token:'confirmation-token'};return original(path,opts);};
 try{
  await w.QoriAccounts.load(ctx);w.document.querySelector('[data-detail]').click();await until(()=>w.document.querySelector('[data-delete-kind]'));
  w.document.querySelector('[data-delete-kind]').click();await until(()=>w.document.querySelector('[name=confirmation]'));
  let f=w.document.querySelector('dialog form'),submit=f.querySelector('[type=submit]');assert.equal(submit.disabled,true);
  f.elements.confirmation.value='Empresa QA';f.elements.reason.value='Eliminación autorizada de prueba';f.dispatchEvent(new w.Event('input'));assert.equal(submit.disabled,true);
  w.document.querySelector('[data-close]').click();assert.equal(requests.some(r=>r.method==='DELETE'),false);
  w.document.querySelector('[data-detail]').click();await until(()=>w.document.querySelector('[data-delete-kind]'));w.document.querySelector('[data-delete-kind]').click();await until(()=>w.document.querySelector('[name=confirmation]'));
  f=w.document.querySelector('dialog form');submit=f.querySelector('[type=submit]');f.elements.confirmation.value='Empresa QA';f.elements.reason.value='Eliminación autorizada de prueba';f.elements.confirmed.checked=true;f.dispatchEvent(new w.Event('input'));assert.equal(submit.disabled,false);
  await f.onsubmit({preventDefault(){},target:f});const removed=requests.filter(r=>r.method==='DELETE');assert.equal(removed.length,1);assert.deepEqual(JSON.parse(removed[0].body),{token:'confirmation-token',confirmation:'Empresa QA',confirmed:true,reason:'Eliminación autorizada de prueba'});
  assert.equal(w.document.querySelector('dialog'),null);
 }finally{w.close();}
});

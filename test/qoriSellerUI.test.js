const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
function setup({status='DRAFT',role='QORI_SELLER',hash=''}={}){
 const w=new JSDOM(fs.readFileSync('seller/index.html','utf8'),{url:'https://example.test/seller/'+hash,runScripts:'outside-only'}).window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.onclose?.();};
 w.sessionStorage.setItem('qori-seller-token','qa-only');w.fetch=async(path,options={})=>{calls.push({path,body:options.body&&JSON.parse(options.body)});let d={ok:true};
 if(path.endsWith('/terms'))d={clauses:[{title:'Condiciones',text:'10% sobre compras confirmadas'}]};
 if(path.endsWith('/application'))d={user:{id:'seller-1',full_name:'Embajador <img src=x>',email:'qa@example.test',role},legacy:false,application:{status},documents:[]};
 if(path.endsWith('/dashboard'))d={totals:{pending_cop:15000,paid_cop:0,paying_businesses:1},accounts:[{id:'b',name:'Café',plan_code:'PENSE_EN_TI',subscription_status:'ACTIVE'}],commissions:[],payouts:[],next_payment_date:'2026-11-12',referral_url:'https://example.test/pense-en-ti/?seller=seller-1',plan_referral_url:'https://example.test/paquetes/?advisor=seller-1'};
 if(path.endsWith('/prospects'))d={rows:[],has_more:false,next_offset:0};
 if(path.endsWith('/admin/queue'))d={applications:[{user_id:'applicant',full_name:'Ana',email:'ana@example.test',status:'SUBMITTED',documents:[]}],balances:[],payouts:[]};
 return {ok:true,json:async()=>d};
 };w.eval(fs.readFileSync('seller/app.js','utf8'));return {w,calls};
}
test('pending application keeps commercial UI hidden and document workflow available',async()=>{
 const {w,calls}=setup();try{await until(()=>w.document.querySelector('#downloadContract'));assert.equal(w.document.querySelector('[data-view=crm]'),null);assert.equal(w.document.querySelectorAll('[data-kind]').length,4);assert.equal(w.document.querySelector('h1 img'),null);assert.equal(calls.some(x=>x.path.endsWith('/dashboard')),false);assert.equal(w.document.querySelector('[name=ciiu]'),null);assert.match(w.document.querySelector('#signupForm').textContent,/CIIU pendiente de validación/);assert.match(w.document.querySelector('#panel').textContent,/CIIU pendiente de validación/);
 const f=w.document.querySelector('#submitApplication');assert.ok(f.querySelector('button[type=submit]').disabled);assert.ok(w.document.querySelector('#signupForm button').disabled);assert.match(w.document.querySelector('#panel').textContent,/No lo firmes ni autentiques/);await f.onsubmit({currentTarget:f,preventDefault(){}});assert.equal(calls.some(x=>x.path.endsWith('/submit')),false);await new Promise(r=>setImmediate(r));}finally{w.close();}
});
test('approved Seller sees balances and can record a scoped CRM follow-up',async()=>{
 const {w,calls}=setup({status:'APPROVED'});try{await until(()=>w.document.querySelector('#referralLink'));assert.match(w.document.querySelector('#panel').textContent,/Por pagar/);w.document.querySelector('[data-view=crm]').click();await until(()=>w.document.querySelector('#newProspect'));w.document.querySelector('#newProspect').click();const f=[...w.document.querySelectorAll('dialog form')].find(f=>f.elements.business_name);assert.ok(f);
 for(const [k,v] of Object.entries({business_name:'Café de prueba',contact_name:'Ana',email:'ana@example.test',phone:'3105550000',notes:'Conversación autorizada',stage:'CONTACTED'}))f.elements[k].value=v;await f.onsubmit({currentTarget:f,preventDefault(){}});await until(()=>calls.some(x=>x.body?.business_name));const body=calls.find(x=>x.body?.business_name).body;assert.equal(body.seller_id,undefined);assert.equal(body.stage,'CONTACTED');await new Promise(r=>setImmediate(r));}finally{w.close();}
});
test('superadmin review sends explicit documentary verification instead of automatic approval',async()=>{
 const {w,calls}=setup({status:'APPROVED',role:'QORI_SUPERADMIN',hash:'#admin'});try{await until(()=>w.document.querySelector('[data-review]'));const f=w.document.querySelector('[data-review]');assert.ok(f.querySelector('option[value=APPROVED]').disabled);f.elements.status.value='CHANGES_REQUESTED';f.elements.note.value='Documentos comprobados por administración.';for(const k of ['identity_checked','ciiu_checked','bank_ownership_checked','notarized_contract_checked','legal_terms_checked'])f.elements[k].checked=true;await f.onsubmit({currentTarget:f,preventDefault(){}});await until(()=>calls.some(x=>x.path.endsWith('/review')));assert.equal(calls.find(x=>x.path.endsWith('/review')).body.status,'CHANGES_REQUESTED');assert.equal(calls.find(x=>x.path.endsWith('/review')).body.notarized_contract_checked,true);await new Promise(r=>setImmediate(r));}finally{w.close();}
});

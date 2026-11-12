const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=p=>fs.readFileSync(p,'utf8'),until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
const referral={email:'cliente@example.test',plan_referral_url:'https://example.test/paquetes/?advisor=s&prospect_ref=signed',referral_url:'https://example.test/pense-en-ti/?seller=s&prospect_ref=signed',expires_in_days:30};
function dialogs(w){w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.onclose?.();};}
test('Seller shares the prospect-specific paid link, has a free option and no repair or close authority',async()=>{
 const w=new JSDOM(source('seller/index.html'),{url:'https://example.test/seller/',runScripts:'outside-only'}).window;dialogs(w);let copied='';
 try{
  w.sessionStorage.setItem('qori-seller-token','qa');Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{copied=value;}}});
  w.fetch=async(path)=>{let d;
   if(path.endsWith('/terms'))d={clauses:[]};
   else if(path.endsWith('/application'))d={user:{id:'s',role:'QORI_SELLER',full_name:'Embajador'},application:{status:'APPROVED'},documents:[]};
   else if(path.endsWith('/dashboard'))d={totals:{},accounts:[],commissions:[],payouts:[],referral_url:'https://example.test/free',plan_referral_url:'https://example.test/paid'};
   else if(path.endsWith('/accounts'))d={accounts:[]};
   else if(path.endsWith('/prospects'))d={rows:[{id:'p',business_name:'Café <img src=x>',email:referral.email,contact_name:'Cliente',stage:'NEW'}],has_more:false};
   else if(path.endsWith('/referral'))d=referral;else throw Error(path);
   return {ok:true,json:async()=>d};
  };
  w.eval(source('seller/accounts.js'));w.eval(source('seller/app.js'));await until(()=>w.document.querySelector('#referralLink'));w.document.querySelector('[data-view=crm]').click();await until(()=>w.document.querySelector('[data-prospect-referral]'));
  assert.equal(w.document.querySelector('#prospectRows img'),null);w.document.querySelector('[data-prospect-referral]').click();await until(()=>w.document.querySelector('dialog [data-link]'));
  const d=w.document.querySelector('dialog:has([data-link])');assert.equal(d.querySelector('[data-link]').value,referral.plan_referral_url);assert.equal(d.querySelector('[data-free]').value,referral.referral_url);
  assert.match(d.textContent,/cliente@example.test/);assert.match(new URL(d.querySelector('[data-whatsapp]').href).searchParams.get('text'),/prospect_ref=signed/);d.querySelector('[data-copy]').click();await until(()=>copied);assert.equal(copied,referral.plan_referral_url);assert.equal(w.document.querySelector('[data-action=link-prospect]'),null);assert.equal(w.document.querySelector('[data-action=close-prospect]'),null);
  d.querySelector('[data-close]').click();assert.equal(d.isConnected,false);
 }finally{w.close();}
});
test('Admin reviews same-seller business and sends exact previous link plus reason; Seller cannot repair',async()=>{
 for(const role of ['QORI_SELLER','QORI_SUPERADMIN']){
  const w=new JSDOM('<div id="commercialWorkspace"></div>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[];dialogs(w);
  try{
   const ctx={api:async(path,opts={})=>{calls.push({path,body:opts.body&&JSON.parse(opts.body)});if(opts.body)return {ok:true};if(path.includes('/bootstrap'))return {counts:{},user:{id:'s',role,name:'QA',permissions:['prospects.manage']},sellers:[],plans:[],policies:[],modules:{},limit_labels:{}};
    if(path.includes('/linkable-businesses'))return {rows:[{id:'b',name:'Café <img src=x>',contact_email:referral.email,plan_code:'STARTER',linked_prospects:[{id:'automatic',name:'Registro automático'}]}],has_more:false};
    if(path.includes('/prospects?'))return {rows:[{id:'p',business_name:'Café',email:referral.email,stage:'NEW',seller_name:'Embajador'}],has_more:false};throw Error(path);
   }};
   w.eval(source('admin/js/commercial.js'));await w.QoriCommercial.load(ctx);w.document.querySelector('[data-action=tab][data-id=prospects]').click();await until(()=>w.document.querySelector('[data-action=prospect-referral]'));
   const button=w.document.querySelector('[data-action=link-prospect]');if(role==='QORI_SELLER'){assert.equal(button,null);continue;}button.click();await until(()=>w.document.querySelector('[name=business_id] option[value=b]'));
   const f=w.document.querySelector('dialog form');f.elements.business_id.value='b';f.elements.business_id.dispatchEvent(new w.Event('change'));assert.match(f.textContent,/Registro automático/);assert.equal(f.querySelector('img'),null);
   f.elements.reason.value='Cliente confirmó el negocio y su contacto previo.';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>calls.some(c=>c.body));assert.deepEqual(calls.find(c=>c.body).body,{business_id:'b',expected_linked_prospect_id:'automatic',reason:'Cliente confirmó el negocio y su contacto previo.'});await until(()=>!w.document.querySelector('dialog'));
  }finally{w.close();}
 }
});
test('a delayed prospect link cannot reopen Admin data after logout',async()=>{
 const w=new JSDOM('<div id="commercialWorkspace"></div>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window;dialogs(w);let resolveLink;
 try{
  const ctx={api:async path=>{
   if(path.endsWith('/referral'))return new Promise(resolve=>{resolveLink=resolve;});
   if(path.includes('/bootstrap'))return {counts:{},user:{id:'s',role:'QORI_SUPERADMIN',name:'QA',permissions:['prospects.manage']},sellers:[],plans:[],policies:[],modules:{},limit_labels:{}};
   if(path.includes('/prospects?'))return {rows:[{id:'p',business_name:'Café',email:referral.email,stage:'NEW'}],has_more:false};throw Error(path);
  }};
  w.eval(source('admin/js/commercial.js'));await w.QoriCommercial.load(ctx);w.document.querySelector('[data-action=tab][data-id=prospects]').click();await until(()=>w.document.querySelector('[data-action=prospect-referral]'));
  w.document.querySelector('[data-action=prospect-referral]').click();await until(()=>resolveLink);w.QoriCommercial.clear();resolveLink(referral);await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelector('dialog'),null);assert.equal(w.document.querySelector('#commercialWorkspace').textContent,'');
 }finally{w.close();}
});

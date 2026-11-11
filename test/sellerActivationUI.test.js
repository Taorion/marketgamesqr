const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
const activation={url:'https://example.test/seller/#activar='+'a'.repeat(43),expires_at:'2026-12-01T12:00:00Z'};
function adminSetup(){
 const w=new JSDOM('<section id="accountsWorkspace"></section>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[],copied=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>copied.push(s)}});
 const ctx={user:{role:'QORI_SUPERADMIN'},showTeam(){},showLegacy(){},showSellerAdmin(){},api:async(path,options={})=>{
  const body=options.body&&JSON.parse(options.body);calls.push({path,body,method:options.method});
  if(path.endsWith('/bootstrap'))return {counts:Object.fromEntries(['sellers','businesses','customers'].map(k=>[k,{total:0,active:0}])),versions:{sellers:[],businesses:[],customers:[]}};
  if(path==='/api/admin/accounts/sellers'&&options.method==='POST')return {seller:{id:'new-seller'},activation};
  return {total:0,rows:[],has_more:false};
 }};
 for(const file of ['admin/js/seller-activation.js','admin/js/accounts.js'])w.eval(fs.readFileSync(file,'utf8'));return {w,ctx,calls,copied};
}
test('Admin manually creates an ambassador without setting a password, keeps the activation link and can copy it',async()=>{
 const s=adminSetup();try{await s.w.QoriAccounts.load(s.ctx);s.w.document.querySelector('#accountsCreateSeller').click();const f=s.w.document.querySelector('dialog form');assert.equal(f.querySelector('[type=password]'),null);
  for(const [k,v] of Object.entries({full_name:'Embajadora Prueba',email:'seller@example.test',document_key:'12345678',phone:'3105550000',city:'Bogotá',reason:'Alta solicitada por administración.'}))f.elements[k].value=v;
  await f.onsubmit({preventDefault(){},currentTarget:f});const call=s.calls.find(c=>c.method==='POST');assert.equal(call.body.email,'seller@example.test');assert.equal(call.body.password,undefined);assert.equal(call.body.terms_accepted,undefined);
  assert.equal(s.w.document.querySelector('#sellerActivationLink').value,activation.url);await s.w.document.querySelector('#copySellerActivation').onclick();assert.deepEqual(s.copied,[activation.url]);assert.ok(s.w.document.querySelector('#manageCreatedSeller'));
 }finally{s.w.close();}
});
test('Admin errors keep entered data and do not generate a link; logout discards late responses',async()=>{
 const s=adminSetup();try{const original=s.ctx.api;s.ctx.api=async(p,o)=>{if(o?.method==='POST')throw Error('Este correo ya tiene una cuenta.');return original(p,o);};await s.w.QoriAccounts.load(s.ctx);s.w.document.querySelector('#accountsCreateSeller').click();let f=s.w.document.querySelector('dialog form');f.elements.email.value='existing@example.test';await f.onsubmit({preventDefault(){},currentTarget:f});assert.match(f.textContent,/ya tiene una cuenta/);assert.equal(f.elements.email.value,'existing@example.test');assert.equal(f.querySelector('[type=submit]').disabled,false);
  let resolve;s.ctx.api=async(p,o)=>o?.method==='POST'?new Promise(r=>resolve=r):original(p,o);const inFlight=f.onsubmit({preventDefault(){},currentTarget:f});s.w.QoriAccounts.clear();resolve({seller:{id:'new'},activation});await inFlight;assert.equal(s.w.document.querySelector('#sellerActivationLink'),null);
 }finally{s.w.close();}
});
function sellerSetup({invalid=false}={}){
 const w=new JSDOM(fs.readFileSync('seller/index.html','utf8'),{url:activation.url,runScripts:'outside-only'}).window,calls=[];
 w.sessionStorage.setItem('qori-seller-token','previous-account');
 w.fetch=async(path,options)=>{const body=JSON.parse(options.body);calls.push({path,body});const preview=path.endsWith('/preview');return {ok:!invalid,json:async()=>invalid?{error:{message:'Enlace vencido.'}}:preview?{seller:{full_name:'Ana <img src=x>',email:'seller@example.test'},terms:{version:'current-terms',ciiu_requirement:{code:'4610'},clauses:[{title:'Condiciones',text:'Solo compras confirmadas.'}]}}:{ok:true,email:'seller@example.test'}};};
 w.eval(fs.readFileSync('seller/activation.js','utf8'));return {w,calls};
}
test('first visit asks for a new confirmed password and explicit acceptance without leaking the link into requests',async()=>{
 const s=sellerSetup();try{await until(()=>s.w.document.querySelector('#sellerActivationForm'));assert.equal(s.w.location.hash,'');assert.equal(s.w.sessionStorage.getItem('qori-seller-token'),null);assert.equal(s.w.document.querySelector('#landing').hidden,true);assert.equal(s.w.document.querySelector('#sellerActivation img'),null);
  const f=s.w.document.querySelector('#sellerActivationForm');f.elements.password.value='PasswordPersonal2026!';f.elements.password_confirm.value='OtroPassword2026!';await f.onsubmit({preventDefault(){}});assert.match(f.textContent,/no coinciden/);assert.equal(s.calls.length,1);
  f.elements.password_confirm.value=f.elements.password.value;for(const k of ['terms_accepted','privacy_accepted','adult_confirmed'])f.elements[k].checked=true;await f.onsubmit({preventDefault(){}});
  assert.equal(s.calls[1].body.terms_version,'current-terms');assert.equal(s.calls[1].body.privacy_accepted,true);assert.equal(s.w.QoriSellerActivation.active,false);assert.match(s.w.document.querySelector('#sellerActivation').textContent,/cuenta está activada/);assert.equal(s.w.document.querySelector('[name=password][autocomplete=new-password]')?.closest('#sellerActivation'),null);
  let email;s.w.addEventListener('qori-seller-activated',e=>email=e.detail.email);s.w.document.querySelector('#activatedSellerLogin').click();assert.equal(email,'seller@example.test');
 }finally{s.w.close();}
});
test('expired links show a clear renewal instruction and no password form',async()=>{
 const s=sellerSetup({invalid:true});try{await until(()=>s.w.document.querySelector('#sellerActivation [role=alert]'));assert.match(s.w.document.querySelector('#sellerActivation').textContent,/nuevo enlace/);assert.equal(s.w.document.querySelector('#sellerActivationForm'),null);}finally{s.w.close();}
});

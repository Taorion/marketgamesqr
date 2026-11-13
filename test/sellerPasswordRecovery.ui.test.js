const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const link='https://example.test/seller/#recuperar='+'a'.repeat(43);
function setup(url=link){
  const w=new JSDOM(fs.readFileSync('seller/index.html','utf8'),{url,runScripts:'outside-only'}).window,calls=[];
  w.sessionStorage.setItem('qori-seller-token','old-session');
  w.fetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,message:'Si la cuenta permite recuperación, revisa tu correo.'})};};
  w.eval(fs.readFileSync('seller/password-recovery.js','utf8'));w.eval(fs.readFileSync('seller/activation.js','utf8'));
  return {w,calls,form:w.document.querySelector('#sellerPasswordRecovery form')};
}
const submit=form=>form.onsubmit({preventDefault(){},currentTarget:form});
test('Seller recovery removes the secret from the URL and old session, blocks auto-login and saves a confirmed password',async()=>{
 const {w,calls,form}=setup();try{
  assert.equal(w.location.hash,'');assert.equal(w.sessionStorage.getItem('qori-seller-token'),null);assert.equal(w.QoriSellerActivation.active,true);assert.equal(w.document.querySelector('#landing').hidden,true);
  assert.equal(calls.length,0);assert.equal(w.document.body.textContent.includes('a'.repeat(43)),false);
  form.elements.password.value='UnaClavePersonal2026!';form.elements.password_confirm.value='OtraClavePersonal2026!';await submit(form);assert.equal(calls.length,0);assert.match(form.textContent,/no coinciden/);
  form.elements.password_confirm.value=form.elements.password.value;await submit(form);
  assert.equal(calls[0].path,'/api/auth/password/reset');assert.equal(calls[0].body.token,'a'.repeat(43));assert.match(form.textContent,/Contraseña actualizada/);assert.equal(form.querySelector('input'),null);assert.equal(form.querySelector('a').pathname,'/seller/');
 }finally{w.close();}
});
test('expired and failed recovery keeps errors visible and permits requesting a replacement without pretending success',async()=>{
 const {w,form}=setup();try{
  w.fetch=async()=>({ok:false,json:async()=>({error:{message:'Enlace de recuperación inválido o vencido.'}})});
  form.elements.password.value=form.elements.password_confirm.value='UnaClavePersonal2026!';await submit(form);
  assert.match(form.querySelector('[role=status]').textContent,/vencido/);assert.equal(form.querySelector('button').disabled,false);assert.ok(w.document.querySelector('a[href="/seller/?recuperar=1"]'));
 }finally{w.close();}
});
test('forgot password stays in Seller, sends only the email and displays a non-enumerating result',async()=>{
 const {w,calls,form}=setup('https://example.test/seller/?recuperar=1');try{
  form.elements.email.value='embajador@example.test';await submit(form);assert.deepEqual(calls,[{path:'/api/auth/password/request-reset',body:{email:'embajador@example.test'}}]);assert.match(form.textContent,/Si la cuenta permite/);assert.equal(w.location.search,'');
 }finally{w.close();}
});

function adminSetup({pending=false}={}){
 const w=new JSDOM('<section id="accountsWorkspace"></section>',{url:'https://example.test/admin/',runScripts:'outside-only'}).window,calls=[],copied=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>copied.push(s)}});
 const ctx={user:{role:'QORI_SUPERADMIN'},api:async(path,options={})=>{
  calls.push({path,options});
  if(path.endsWith('/bootstrap'))return {counts:Object.fromEntries(['sellers','businesses','customers'].map(k=>[k,{total:1,active:1}])),versions:{sellers:[],businesses:[],customers:[]}};
  if(path.includes('?'))return {rows:[{id:'seller-id',name:'Ana',is_active:true}],total:1,has_more:false};
  if(path.endsWith('/password-reset'))return {recovery:{url:link,expires_at:'2026-12-01T12:00:00Z'}};
  return {record:{name:'Ana',email:'ana@example.test',is_active:true,password_setup_required:pending,documents:[],commissions:{pending_cop:0,paid_cop:0}},history:[]};
 }};
 for(const file of ['admin/js/seller-activation.js','admin/js/accounts.js'])w.eval(fs.readFileSync(file,'utf8'));
 return {w,ctx,calls,copied};
}
async function settle(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');}
async function openSeller(s){await s.w.QoriAccounts.load(s.ctx);s.w.document.querySelector('[data-kind=sellers]').click();await settle(()=>s.w.document.querySelector('[data-detail]'));s.w.document.querySelector('[data-detail]').click();await settle(()=>s.w.document.querySelector('dialog'));}
test('Admin offers recovery for activated sellers, reconfirms recipient and reason, and copies the generated personal link',async()=>{
 const s=adminSetup();try{
  await openSeller(s);s.w.document.querySelector('#sellerPasswordReset').click();let f=s.w.document.querySelector('dialog form');assert.match(f.textContent,/ana@example.test/);assert.equal(s.calls.some(c=>c.path.endsWith('/password-reset')),false);
  f.elements.reason.value='El embajador solicitó recuperar su acceso.';await submit(f);
  assert.equal(s.calls.at(-1).options.method,'POST');assert.equal(JSON.parse(s.calls.at(-1).options.body).reason,'El embajador solicitó recuperar su acceso.');assert.equal(f.querySelector('#sellerRecoveryLink').value,link);
  await f.querySelector('#copySellerRecovery').onclick();assert.deepEqual(s.copied,[link]);assert.match(f.textContent,/No se ha enviado/);
 }finally{s.w.close();}
});
test('pending activation retains its own action and cannot bypass terms with the recovery button',async()=>{
 const s=adminSetup({pending:true});try{await openSeller(s);assert.equal(s.w.document.querySelector('#sellerPasswordReset'),null);assert.ok(s.w.document.querySelector('#sellerActivationRenew'));}finally{s.w.close();}
});
test('Admin errors are recoverable and logout discards an in-flight recovery link',async()=>{
 const s=adminSetup();try{
  await openSeller(s);s.w.document.querySelector('#sellerPasswordReset').click();const f=s.w.document.querySelector('dialog form');f.elements.reason.value='Solicitud de recuperación personal.';
  s.ctx.api=async()=>{throw Error('Cuenta suspendida.');};await submit(f);assert.match(f.textContent,/Cuenta suspendida/);assert.equal(f.querySelector('button').disabled,false);
  let resolve;s.ctx.api=async()=>new Promise(r=>resolve=r);const waiting=submit(f);s.w.QoriAccounts.clear();resolve({recovery:{url:link,expires_at:'2026-12-01T12:00:00Z'}});await waiting;assert.equal(s.w.document.querySelector('#sellerRecoveryLink'),null);
 }finally{s.w.close();}
});

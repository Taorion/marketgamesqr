const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom');
const wait=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(hash=''){
 const w=new JSDOM('<div id="app"><p>Abriendo tu espacio…</p></div><div id="announcement"></div>',{url:'https://example.test/customer/'+hash,runScripts:'outside-only'}).window,calls=[];let verified=false,name='',documentKey=null;
 w.QoriExplore={stop(){},render(){throw Error('Guest reached Explore');}};w.QoriNotifications={stop(){},watch(){}};w.QoriBenefitRecovery={documentFields:()=>''};w.QoriPortal={preferences:()=>''};
 w.QoriAccounting={selector(){},render(page){page.innerHTML='<h1 id="private-home">Mi dinero</h1>';}};
 w.fetch=async(url,options={})=>{calls.push(url);let status=200,data={},body=options.body?JSON.parse(options.body):{};
  if(url==='/api/customer/auth/options')data={providers:[{provider:'google',label:'Google',enabled:false},{provider:'microsoft',label:'Microsoft',enabled:false}]};
  else if(url==='/api/customer/auth/web/code')data={challenge_id:'challenge'};
  else if(url==='/api/customer/auth/web/verify'){if(body.code==='123456'){verified=true;data={account:{id:'buyer',full_name:name,currency:'COP',email:'new@example.test',preferences:{notifications:{}}}};}else{status=401;data={error:{message:'Código inválido o vencido.'}};}}
  else if(!verified){status=401;data={error:{message:'Inicia sesión en Qori.'}};}
  else if(url==='/api/customer/me'){if(options.method==='PATCH'){name=body.full_name;documentKey=body.document_id;}data={account:{id:'buyer',full_name:name,declared_document_key:documentKey,currency:'COP',email:'new@example.test',preferences:{notifications:{}}}};}
  else if(url==='/api/customer/finance-books')data={books:[{id:'personal',is_default:true,name:'Personal',currency:'COP'}]};
  else if(url==='/api/customer/wallet/overview')data={cards:[],purchased_gifts:[],pending_benefits:[],pending_invitations:0};
  else if(url==='/api/customer/relationships')data={relationships:[]};
  return {ok:status<400,status,headers:new w.Headers(verified?{'X-Qori-Customer':'buyer'}:{}),json:async()=>data};
 };
 for(const p of ['wallet-model.js','session-guard.js','benefit-recovery.js','auth-access.js','app.js'])w.eval(fs.readFileSync('customer-web/'+p,'utf8'));
 const submit=id=>{const f=w.document.getElementById(id);f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,bubbles:true,submitter:f.querySelector('[type=submit],button.primary')}));};
 return {w,calls,submit};
}
test('default and direct feature URLs always open login without guest navigation or catalog requests',async()=>{
 for(const route of ['', '#explore','#scan','#gift-shop','#publication/offer','#business/shop','#home','#finances']){
  const {w,calls}=setup(route);try{await wait(()=>w.document.querySelector('#passwordLoginForm'));assert.equal(w.document.querySelector('.layout,.sidebar,#guestLogin'),null);assert.ok(calls.every(u=>['/api/customer/me','/api/customer/auth/options'].includes(u)));assert.ok(w.document.querySelector('[name=password]')); }finally{w.close();}
 }
});
test('email alone and wrong code never open the platform; route changes preserve verification until a valid login',async()=>{
 const {w,calls,submit}=setup();try{
  await wait(()=>w.document.querySelector('#passwordLoginForm'));w.document.querySelector('[data-auth-mode=code]').click();const f=w.document.querySelector('#emailForm');f.elements.email.value='new@example.test';f.elements.consent.checked=true;submit('emailForm');await wait(()=>w.document.querySelector('#verifyForm'));
  assert.match(w.document.body.textContent,/Aún no has iniciado sesión/);w.location.hash='explore';await new Promise(r=>setTimeout(r,20));assert.ok(w.document.querySelector('#verifyForm'));assert.equal(w.document.querySelector('.layout'),null);
  w.document.querySelector('[name=code]').value='000000';submit('verifyForm');await wait(()=>w.document.querySelector('#authError')?.textContent.includes('inválido'));assert.equal(w.document.querySelector('.sidebar'),null);assert.equal(calls.some(u=>u.includes('/explore')),false);
  w.document.querySelector('[name=code]').value='123456';submit('verifyForm');await wait(()=>w.document.querySelector('#profileForm'));assert.match(w.document.body.textContent,/Completa tu registro/);assert.equal(w.document.querySelector('.sidebar'),null);
  assert.equal(calls.some(u=>['/finance-books','/wallet/overview','/relationships'].some(p=>u.endsWith(p))),false);
  for(const name of ['document_id','document_confirmation']){const input=w.document.querySelector('[name='+name+']');assert.ok(input.required);assert.equal(input.closest('details'),null);}
  w.document.querySelector('[name=full_name]').value='Persona Verificada';submit('profileForm');await wait(()=>w.document.querySelector('#pageError').textContent.includes('obligatoria'));assert.equal(w.document.querySelector('.sidebar'),null);
  w.document.querySelector('[name=document_id]').value='123456789';w.document.querySelector('[name=document_confirmation]').value='987654321';submit('profileForm');await wait(()=>w.document.querySelector('#pageError').textContent.includes('misma cédula'));assert.equal(w.document.querySelector('.sidebar'),null);
  w.document.querySelector('[name=document_confirmation]').value='123456789';submit('profileForm');await wait(()=>w.document.querySelector('#private-home'));assert.ok(w.document.querySelector('.sidebar'));
  assert.equal(calls.some(u=>u.endsWith('/benefit-recovery')),false,'Benefit recovery consent is optional and separate');
 }finally{w.close();}
});

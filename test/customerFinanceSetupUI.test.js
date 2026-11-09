const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const wait=async fn=>{for(let n=0;n<150;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup({state='PENDING',failRead=false,failSave=false,benefit=false}={}){
 const w=new JSDOM('<div id="app">Abriendo tu espacio…</div><div id="announcement"></div>',{url:'https://example.test/customer/?continue=%2Fsellos%2Finscripcion.html%3Fprograma%3Dexample#home',runScripts:'outside-only'}).window,calls=[];let reads=0,saves=0,returns=0,done=state;
 const account=()=>({id:'buyer',full_name:'Persona Nueva',declared_document_key:'123456789',currency:'COP',email:'new@example.test',finance_setup_state:done,preferences:{notifications:{}}});
 w.QoriExplore={stop(){}};w.QoriNotifications={stop(){},watch(){}};w.QoriPortal={preferences:()=>''};w.QoriAccounting={selector(){},render(page){page.innerHTML='<h1 id="private-home">Mi dinero</h1>';}};
 w.QoriBenefitReturn=()=>{returns++;if(benefit){w.document.querySelector('#app').innerHTML='<h1 id="benefit">Continuando al beneficio</h1>';return true;}return false;};
 w.fetch=async(url,options={})=>{
  const body=options.body?JSON.parse(options.body):undefined;calls.push({url,body});let status=200,data={};
  if(url==='/api/customer/me')data={account:account()};
  else if(url==='/api/customer/finance-setup'){
   if(body){saves++;if(failSave&&saves===1){status=503;data={error:{message:'Error de conexión de prueba'}};}else{done='COMPLETE';data={account:account()};}}
   else{reads++;if(failRead&&reads===1){status=503;data={error:{message:'No pudimos leer tu preparación'}};}else data={state:done,today:'2026-11-08',currency:'COP',pocket_name:'Personal'};}
  }else if(url==='/api/customer/finance-books')data={books:[{id:'personal',is_default:true,name:'Personal',currency:'COP'}]};
  else if(url==='/api/customer/wallet/overview')data={cards:[],purchased_gifts:[],pending_benefits:[],pending_invitations:0};
  else if(url==='/api/customer/relationships')data={relationships:[]};
  return {ok:status<400,status,headers:new w.Headers({'X-Qori-Customer':'buyer'}),json:async()=>data};
 };
 for(const f of ['wallet-model.js','session-guard.js','finance-setup.js','app.js'])w.eval(fs.readFileSync('customer-web/'+f,'utf8'));
 const submit=id=>{const form=w.document.getElementById(id);form.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:form.querySelector('[type=submit]')}));};
 return {w,calls,submit,returns:()=>returns};
}
test('first login gates every route and requires a deliberate balance and confirmation',async()=>{
 const x=setup(),{w,calls,submit}=x;try{
  await wait(()=>w.document.querySelector('#financeSetupAmount'));assert.equal(w.document.querySelector('.sidebar,#page'),null);assert.equal(x.returns(),0);assert.ok(calls.every(c=>['/api/customer/me','/api/customer/finance-setup'].includes(c.url)));
  assert.equal(w.document.querySelector('[name=balance]').value,'');submit('financeSetupAmount');assert.equal(w.document.querySelector('#financeSetupConfirm').hidden,true);
  w.location.hash='wallet';await new Promise(r=>setTimeout(r,30));assert.ok(w.document.querySelector('#financeSetupAmount'));assert.equal(w.document.querySelector('.sidebar'),null);
  w.document.querySelector('[name=balance]').value='-50000';assert.equal(w.document.querySelector('[name=balance]').hasAttribute('min'),false);submit('financeSetupAmount');
  assert.equal(w.document.querySelector('#financeSetupAmount').hidden,true);assert.equal(w.document.querySelector('#financeSetupConfirm').hidden,false);assert.match(w.document.querySelector('#setupAmount').textContent,/-/);
  submit('financeSetupConfirm');assert.equal(calls.some(c=>c.body),false);w.document.querySelector('#editInitialBalance').click();assert.equal(w.document.querySelector('[name=balance]').value,'-50000');
 }finally{w.close();}
});
test('positive, zero and negative amounts finish setup; later boots skip preparation',async()=>{
 for(const balance of ['1234.56','0','-50.25']){
  const {w,calls,submit}=setup();try{await wait(()=>w.document.querySelector('#financeSetupAmount'));w.document.querySelector('[name=balance]').value=balance;submit('financeSetupAmount');w.document.querySelector('[name=confirmed]').checked=true;submit('financeSetupConfirm');submit('financeSetupConfirm');await wait(()=>w.document.querySelector('#private-home'));assert.equal(calls.filter(c=>c.body).length,1);assert.equal(calls.find(c=>c.body).body.balance,balance);assert.ok(w.document.querySelector('.sidebar'));}finally{w.close();}
 }
 for(const state of ['COMPLETE','LEGACY']){const {w,calls}=setup({state});try{await wait(()=>w.document.querySelector('#private-home'));assert.equal(calls.some(c=>c.url.includes('/finance-setup')),false);}finally{w.close();}}
});
test('read/save failures stay gated, retain amounts, retry idempotently and resume benefits after completion',async()=>{
 const x=setup({failRead:true,failSave:true,benefit:true}),{w,calls,submit}=x;try{
  await wait(()=>w.document.querySelector('#retryFinanceSetup'));assert.equal(w.document.querySelector('.sidebar'),null);w.document.querySelector('#retryFinanceSetup').click();await wait(()=>w.document.querySelector('#financeSetupAmount'));
  w.document.querySelector('[name=balance]').value='0';submit('financeSetupAmount');w.document.querySelector('[name=confirmed]').checked=true;submit('financeSetupConfirm');await wait(()=>w.document.querySelector('#pageError')?.textContent.includes('prueba'));
  assert.equal(x.returns(),0);assert.equal(w.document.querySelector('[name=balance]').value,'0');submit('financeSetupConfirm');await wait(()=>w.document.querySelector('#benefit'));assert.equal(x.returns(),1);const writes=calls.filter(c=>c.body);assert.equal(writes.length,2);assert.equal(writes[0].body.request_id,writes[1].body.request_id);
 }finally{w.close();}
});
test('late setup reads cannot replace a cleared session screen',async()=>{
 const w=new JSDOM('<div id="app"></div>',{url:'https://example.test/',runScripts:'outside-only'}).window;
 try{w.eval(fs.readFileSync('customer-web/finance-setup.js','utf8'));let resolve;const host=w.document.querySelector('#app'),promise=w.QoriFinanceSetup.render(host,{request:()=>new Promise(r=>resolve=r),brand:()=>'',refresh:()=>{throw Error('stale refresh');}});host.innerHTML='<h1>Inicia sesión</h1>';resolve({state:'PENDING'});await promise;assert.equal(host.textContent,'Inicia sesión');}finally{w.close();}
});

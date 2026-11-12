const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const until=async fn=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
test('checkout return never claims payment success; recovery shows only the authenticated next step and clears the password',async()=>{
 for(const state of ['PENDING_PAYMENT','ACTIVE','ERROR']){
  const w=new JSDOM(fs.readFileSync('paquetes/index.html','utf8'),{url:'https://example.test/paquetes/?signup=success',runScripts:'outside-only'}).window,calls=[];
  try{w.HTMLElement.prototype.scrollIntoView=function(){};w.fetch=async(path,opts)=>{calls.push({path,body:JSON.parse(opts.body)});return {ok:state!=='ERROR',json:async()=>state==='ERROR'?{error:{message:'Credenciales incorrectas'}}:{state,message:'Estado consultado',order:state==='PENDING_PAYMENT'?{id:'order',package_title:'Crece <img src=x>',price_cop:229000,currency:'COP',checkout_url:'https://checkout.example.test/original'}:undefined}};};
   w.eval(fs.readFileSync('paquetes/js/signup-recovery.js','utf8'));assert.equal(w.document.querySelector('#signupRecovery').open,true);assert.match(w.document.querySelector('#signupReturnNotice').textContent,/no confirma el cobro/);
   const form=w.document.querySelector('#signupRecoveryForm');form.elements.email.value='cliente@example.test';form.elements.password.value='OriginalPassword!2026';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>!form.querySelector('button').disabled);
   assert.deepEqual(calls[0].body,{email:'cliente@example.test',password:'OriginalPassword!2026'});assert.equal(form.elements.password.value,'');assert.equal(form.querySelector('img'),null);
   const link=form.querySelector('[data-recovery-result] a');if(state==='ERROR'){assert.equal(link,null);assert.match(form.textContent,/Credenciales incorrectas/);}else assert.equal(link.href,state==='ACTIVE'?'https://example.test/empresa/':'https://checkout.example.test/original');
  }finally{w.close();}
 }
});
test('editing credentials while a recovery request runs discards the previous account result',async()=>{
 const w=new JSDOM(fs.readFileSync('paquetes/index.html','utf8'),{url:'https://example.test/paquetes/',runScripts:'outside-only'}).window;let respond;
 try{
  w.fetch=()=>new Promise(resolve=>{respond=resolve;});w.eval(fs.readFileSync('paquetes/js/signup-recovery.js','utf8'));
  const f=w.document.querySelector('#signupRecoveryForm');f.elements.email.value='first@example.test';f.elements.password.value='FirstPassword!';f.dispatchEvent(new w.Event('submit',{cancelable:true}));await until(()=>respond);
  f.elements.email.value='second@example.test';f.elements.email.dispatchEvent(new w.Event('input',{bubbles:true}));respond({ok:true,json:async()=>({state:'ACTIVE',message:'First account active'})});await until(()=>!f.querySelector('button').disabled);
  assert.equal(f.querySelector('[data-recovery-result]').textContent,'');assert.equal(f.querySelector('[data-recovery-status]').textContent,'');assert.equal(f.elements.password.value,'');
 }finally{w.close();}
});

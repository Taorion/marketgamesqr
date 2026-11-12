const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',key='qori_commercial_referral_v1';
const source=p=>fs.readFileSync(p,'utf8'),until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');};
test('referral survives navigation, decorates internal links, expires and explicit links replace it without unsafe fallback',()=>{
 const w=new JSDOM('<a href="/paquetes/">Planes</a><a href="/pense-en-ti/">Gratis</a><a href="https://elsewhere.test/paquetes/">Externo</a>',{url:'https://example.test/pense-en-ti/?seller='+id,runScripts:'outside-only'}).window;
 try {w.eval(source('qori-web/js/seller-referral.js'));w.QoriReferral.decorate();assert.equal(w.QoriReferral.get(),id);assert.match(w.document.querySelector('a').href,new RegExp(id));assert.equal(w.document.querySelectorAll('a')[2].href,'https://elsewhere.test/paquetes/');
  w.history.replaceState(null,'','/paquetes/');w.eval(source('qori-web/js/seller-referral.js'));assert.equal(w.QoriReferral.get(),id);
  w.history.replaceState(null,'','/paquetes/?advisor='+other);w.eval(source('qori-web/js/seller-referral.js'));assert.equal(w.QoriReferral.get(),other);
  w.history.replaceState(null,'','/paquetes/?advisor=invalid');w.eval(source('qori-web/js/seller-referral.js'));assert.equal(w.QoriReferral.get(),'invalid');
  w.QoriReferral.clear();assert.equal(w.QoriReferral.get(),null);assert.equal(w.localStorage.getItem(key),null);
  w.localStorage.setItem(key,JSON.stringify({id,expires_at:Date.now()-1}));w.eval(source('qori-web/js/seller-referral.js'));assert.equal(w.QoriReferral.get(),null);
 } finally{w.close();}
});
async function checkout({invalid=false}={}){
 const w=new JSDOM(source('paquetes/index.html'),{url:'https://example.test/paquetes/?advisor='+id+'&plan=STARTER',runScripts:'outside-only'}).window;
 await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 w.HTMLElement.prototype.scrollIntoView=function(){};const calls=[];
 w.fetch=async(path,options={})=>{calls.push({path,body:options.body&&JSON.parse(options.body)});
  if(path.includes('/commercial-advisors/'))return {ok:!invalid,json:async()=>invalid?{error:{message:'Embajador suspendido'}}:{advisor:{id,name:'Ana <img src=x>'}}};
  if(path.includes('/signup/portal'))return {ok:false,json:async()=>({error:{message:'QA detener antes del cobro'}})};
  return {ok:true,json:async()=>({})};
 };
 w.eval(source('qori-web/js/seller-referral.js'));w.eval(source('paquetes/js/app.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await until(()=>!w.document.querySelector('#submitButton').disabled);return {w,calls};
}
test('checkout automatically sends linked seller; typing cannot lose it, XSS is text, explicit self opt-out clears it',async()=>{
 const {w,calls}=await checkout();try{assert.equal(w.document.querySelector('#salesAdvisorSeller').checked,true);assert.equal(w.document.querySelector('#salesAdvisorSearch').readOnly,true);assert.equal(w.document.querySelector('#salesAdvisorStatus img'),null);
  w.document.querySelector('#signupForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await until(()=>calls.some(c=>c.body));assert.equal(calls.find(c=>c.body).body.commercial_advisor_id,id);
  await until(()=>!w.document.querySelector('#submitButton').disabled);w.document.querySelector('#salesAdvisorSelf').click();assert.equal(w.QoriReferral.get(),null);
  w.document.querySelector('#signupForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await until(()=>calls.filter(c=>c.body).length===2);assert.equal(calls.filter(c=>c.body)[1].body.commercial_advisor_id,null);
 }finally{w.close();}
});
test('invalid referral cannot silently submit as an unattributed signup',async()=>{
 const {w,calls}=await checkout({invalid:true});try{w.document.querySelector('#signupForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(calls.some(c=>c.body),false);assert.equal(w.document.querySelector('#salesAdvisorSeller').checked,true);}finally{w.close();}
});
test('referral still works when browser storage is unavailable',()=>{
 const w=new JSDOM('',{url:'https://example.test/paquetes/?advisor='+id,runScripts:'outside-only'}).window;
 try{Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});w.eval(source('qori-web/js/seller-referral.js'));assert.equal(w.QoriReferral.get(),id);w.QoriReferral.clear();assert.equal(w.QoriReferral.get(),null);}finally{w.close();}
});

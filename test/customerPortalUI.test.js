const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const load=(w,file)=>w.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
async function settle(fn){for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');}
function setup(hash=''){
 const w=new JSDOM('<div id="app"></div><p id="announcement"></p><main id="page"></main>',{url:'http://localhost/customer/'+hash,runScripts:'outside-only'}).window;
 w.setInterval=()=>0;w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.remove();};
 load(w,'customer-web/portal.js');return w;
}
const account={full_name:'Andrea <QA>',email:'andrea@example.test',currency:'COP',timezone:'America/Bogota',preferences:{notifications:{purchases:true,benefits:true,budget:true,summary:false}}};
test('portal defaults to unified home with real private summary, every module and manual expense action',async()=>{
 const w=setup();let expense=0;try{
  w.document.querySelector('#page').remove();
  w.fetch=async url=>({ok:true,status:200,json:async()=>url.endsWith('/me')?{account}:url.endsWith('/relationships')?{relationships:[]}:url.includes('/purchases/overview')?{spent_minor:1500000,obligations_minor:0,planned_minor:0,projected_remaining_minor:null,currency:'COP'}:{cards:[{id:'t',status:'READY'}],pending_invitations:2,purchased_gifts:[]}});
  w.QoriFinance={editEntry(){expense++;}};
  load(w,'customer-web/wallet-model.js');load(w,'customer-web/app.js');await settle(()=>w.document.querySelector('.portal-total'));
  assert.equal(w.document.querySelector('nav [aria-current]').getAttribute('href'),'#home');
  for(const route of ['purchases','explore','directory','wallet','invitations','businesses','earned','history','planning','saved','following','requests','place-requests','profile','product-gifts'])assert.ok(w.document.querySelector('#page a[href="#'+route+'"]'),route);
  assert.match(w.document.querySelector('.portal-total').textContent,/15.000/);
  assert.match(w.document.querySelector('.portal-stats').textContent,/Invitaciones por revisar2/);
  w.document.querySelector('#portalAddExpense').click();assert.equal(expense,1);
 }finally{w.close();}
});
test('portal account edits currency, timezone and notification preferences through the existing API',async()=>{
 const w=setup('#profile');let payload;try{
  w.document.querySelector('#page').remove();
  w.fetch=async(url,options)=>({ok:true,status:200,json:async()=>{
   if(options.method==='PATCH'){payload=JSON.parse(options.body);return {account:{...account,...payload}};}
   if(url.endsWith('/me'))return {account};
   if(url.endsWith('/sessions'))return {sessions:[],current:'s'};
   if(url.endsWith('/relationships'))return {relationships:[]};
   return {cards:[],purchased_gifts:[],pending_invitations:0};
  }});
  load(w,'customer-web/wallet-model.js');load(w,'customer-web/app.js');await settle(()=>w.document.querySelector('#profileForm'));
  const f=w.document.querySelector('#profileForm');assert.equal(f.elements.full_name.value,'Andrea <QA>');assert.equal(w.document.querySelector('qa'),null);
  f.elements.currency.value='USD';f.elements.timezone.value='America/Lima';f.elements.notice_purchases.checked=false;f.elements.notice_summary.checked=true;
  f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settle(()=>payload||w.document.querySelector('#pageError')?.textContent);assert.equal(w.document.querySelector('#pageError').textContent,'');
  assert.equal(payload.currency,'USD');assert.equal(payload.timezone,'America/Lima');assert.deepEqual(payload.preferences.notifications,{purchases:false,benefits:true,budget:true,summary:true});
 }finally{w.close();}
});
test('directory requests location only on click, sorts available locations and falls back to city after denial',async()=>{
 const w=setup();try{
  let asked=0,deny=false;Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition(ok,error){asked++;if(deny)error();else ok({coords:{latitude:4.6,longitude:-74}});}}});
  const page=w.document.querySelector('#page'),calls=[],ctx={request:async url=>{calls.push(url);return {businesses:[{name:'Lejos',slug:'lejos',latitude:8,longitude:-74},{name:'Sin coordenadas',slug:'sin',latitude:null,longitude:null},{name:'Cerca',slug:'cerca',latitude:4.601,longitude:-74}],next_offset:null};}};
  await w.QoriPortal.directory(page,ctx);assert.equal(asked,0);
  page.querySelector('#portalNearMe').click();assert.equal(asked,1);assert.match(page.querySelector('#portalPlaces a').textContent,/Cerca/);assert.match(page.querySelector('#portalPlaces a:last-child').textContent,/Ubicación no publicada/);
  deny=true;page.querySelector('#portalNearMe').click();assert.match(page.querySelector('#portalDirectoryStatus').textContent,/por ciudad/);
  const form=page.querySelector('form');form.elements.city.value='Bogotá';await form.onsubmit({preventDefault(){},stopPropagation(){},target:form});
  assert.match(calls.at(-1),/city=Bogot%C3%A1/);assert.equal(calls.some(u=>/latitude|longitude/.test(u)),false);
 }finally{w.close();}
});
test('place requests persist to the account, escape names and refresh the owned history',async()=>{
 const w=setup();try{
  const calls=[],requests=[],page=w.document.querySelector('#page'),ctx={request:async(url,body)=>{calls.push({url,body});if(body){requests.push({...body,business_id:null});return {ok:true};}return {requests};}};
  await w.QoriPortal.placeRequests(page,ctx);const f=page.querySelector('form');f.elements.name.value='Mi <café>';f.elements.city.value='Bogotá';
  await f.onsubmit({preventDefault(){},stopPropagation(){},target:f});
  assert.equal(calls.find(c=>c.body).body.name,'Mi <café>');assert.match(page.querySelector('#portalRequestHistory').textContent,/Mi <café>/);assert.equal(page.querySelector('café'),null);assert.match(page.querySelector('#portalRequestStatus').textContent,/registrada/);
 }finally{w.close();}
});
test('home keeps shortcuts usable when finances fail and ignores stale responses after navigation',async()=>{
 const w=setup();try{
  const page=w.document.querySelector('#page');let resolve;
  const p=w.QoriPortal.home(page,{account,cards:[],request:()=>new Promise(r=>resolve=r)});
  page.innerHTML='<h1>Otra sección</h1>';resolve({currency:'COP',spent_minor:100,obligations_minor:0,planned_minor:0,projected_remaining_minor:null});await p;assert.equal(page.textContent,'Otra sección');
  await w.QoriPortal.home(page,{account,cards:[],request:async()=>{throw Error('Sin conexión');}});
  assert.match(page.querySelector('#portalFinancialSummary').textContent,/Sin conexión/);assert.ok(page.querySelector('a[href="#wallet"]'));
 }finally{w.close();}
});
test('activation requests preserve invitation identity and web session without changing public activation requests',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../activacion/activation.js'),'utf8'),apiSource=source.slice(source.indexOf('async function api('),source.indexOf('\nfunction apiErrorMessage'));
 const id='12345678-1234-1234-1234-123456789abc',w=setup(),calls=[];
 try{
  w.history.replaceState(null,'','/activacion/test?customer_invitation='+id);
  w.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,text:async()=>'{}'};};
  w.eval(apiSource+'\nwindow.activationRequest=api;');
  await w.activationRequest('/api/public/activations/test/complete',{method:'POST',body:'{}'});
  assert.equal(calls[0].url,'/api/customer/invitations/'+id+'/complete');assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.headers['X-Qori-Web'],'1');
  await w.activationRequest('/api/public/activations/test');assert.equal(calls[1].url,'/api/public/activations/test');
  w.history.replaceState(null,'','/activacion/test');
  await w.activationRequest('/api/public/activations/test/complete',{method:'POST'});assert.equal(calls[2].url,'/api/public/activations/test/complete');
 }finally{w.close();}
});

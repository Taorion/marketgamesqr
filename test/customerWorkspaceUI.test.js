const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const id='11111111-2222-3333-4444-555555555555';
const load=(w,name)=>w.eval(fs.readFileSync(path.join(__dirname,'../empresa/js',name),'utf8'));
async function settle(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setImmediate(r));}throw Error('UI did not settle');}
function setup(role='BUSINESS_OWNER'){
 const dom=new JSDOM('<div id="customerWorkspace"></div>',{url:'https://gosqori.com/empresa/',runScripts:'outside-only'}),w=dom.window,calls=[],actions=[];
 w.session={user:{role}};w.authHeaders=()=>({Authorization:'QA'});w.setInterval=()=>0;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.remove();this.onclose?.();};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.api=async(url,options)=>{calls.push({url,body:options.body&&JSON.parse(options.body)});return {buyer:{public_id:id,full_name:'Comprador nuevo',relationship_state:null}};};
 w.QoriCustomerInvitations={open:(...args)=>actions.push(['benefit',...args])};w.QoriCustomerBridge={legacy:(...args)=>actions.push(['connect',...args])};w.QoriCustomerFinance={openForCustomer:(...args)=>actions.push(['sale',...args])};
 load(w,'customer-workspace.js');w.QoriCustomerWorkspace.open();
 return {w,calls,actions};
}
async function search(w,query='nuevo@example.test'){const f=w.document.querySelector('#customerWorkspaceSearch');f.elements.query.value=query;await f.onsubmit({target:f,preventDefault(){},stopPropagation(){}});}
test('a registered buyer without a prior relationship can receive each benefit and an existing sale',async()=>{
 const {w,calls,actions}=setup();try{
  await search(w);assert.equal(calls[0].body.query,'nuevo@example.test');assert.match(w.document.querySelector('#customerWorkspaceResult').textContent,/antes de su primera compra/);
  for(const b of w.document.querySelectorAll('[data-customer-benefit]'))b.click();
  assert.deepEqual(actions.map(a=>[a[1],a[2].kind]),['STAMP','AFFILIATION','GIFT','TICKET','ACTIVITY'].map(kind=>[id,kind]));
  w.document.querySelector('#customerWorkspaceSale').click();assert.deepEqual(actions.at(-1),['sale',id]);
  w.document.querySelector('#customerWorkspaceConnect').click();assert.deepEqual(actions.at(-1),['connect',id]);
  w.document.querySelector('#customerWorkspaceHistory').click();assert.equal(actions.at(-1)[2].history,true);
  assert.equal(calls.length,1,'opening an action does not send benefits');
 }finally{w.close();}
});
test('changing the query clears recipient actions and late searches cannot restore the old account',async()=>{
 const {w}=setup();try{
  await search(w);const input=w.document.querySelector('input');input.value='new@example.test';input.dispatchEvent(new w.Event('input'));
  assert.equal(w.document.querySelector('[data-customer-benefit]'),null);
  let finish;w.api=()=>new Promise(r=>finish=r);const pending=search(w,'old@example.test');
  input.value='latest@example.test';input.dispatchEvent(new w.Event('input'));finish({buyer:{public_id:id,full_name:'Wrong recipient'}});await pending;
  assert.doesNotMatch(w.document.querySelector('#customerWorkspaceResult').textContent,/Wrong recipient/);
  assert.equal(w.document.querySelector('#customerWorkspaceSearch button').disabled,false);
 }finally{w.close();}
});
test('personal QR links are normalized while external URLs never trigger a lookup',async()=>{
 const {w,calls}=setup();try{
  await search(w,'https://gosqori.com/empresa/?customer='+id);assert.equal(calls[0].body.query,id);
  await search(w,'https://other.test/empresa/?customer='+id);assert.equal(calls.length,1);assert.match(w.document.querySelector('[role=status]').textContent,/QR de identificaci/);
 }finally{w.close();}
});
test('validators can find a buyer and connect identity without benefit-management actions',async()=>{
 const {w}=setup('VALIDATOR');try{await search(w);assert.ok(w.document.querySelector('#customerWorkspaceConnect'));assert.equal(w.document.querySelector('[data-customer-benefit]'),null);assert.equal(w.document.querySelector('#customerWorkspaceSale'),null);}finally{w.close();}
});
test('the benefit dialog loads the selected recipient and kind but waits for an explicit send',async()=>{
 const {w,calls}=setup();try{
  w.api=async(url,options)=>{calls.push({url,body:options.body&&JSON.parse(options.body)});if(url.endsWith('/lookup'))return {buyer:{public_id:id,full_name:'Comprador'}};if(url.includes('/catalog/'))return {programs:[],activities:[],tickets:[]};return {invitations:[]};};
  load(w,'customer-network.js');w.QoriCustomerInvitations.open(id,{kind:'GIFT'});await settle(()=>w.document.querySelector('#customerNetworkSend'));
  assert.equal(w.document.querySelector('[name=kind]').value,'GIFT');assert.ok(w.document.querySelector('[name=amount]'));assert.equal(calls[0].body.query,id);
  assert.equal(calls.some(c=>c.url.endsWith('/invitations')),false);
 }finally{w.close();}
});
test('sale selection retains the chosen Customer identity and requires verification before delivery',async()=>{
 const {w,calls}=setup();try{
  w.api=async(url,options)=>{calls.push({url,body:options.body&&JSON.parse(options.body)});if(url.endsWith('/lookup'))return {buyer:{public_id:id,full_name:'Comprador'}};return {sales:[{id:'canonical-sale',product_name:'Café',sale_amount:'12000',currency:'COP',sale_status:'PAID',created_at:'2026-11-03'}],next_offset:null};};
  load(w,'customer-finance.js');w.QoriCustomerFinance.openForCustomer(id);await settle(()=>w.document.querySelector('[data-select-sale]'));w.document.querySelector('[data-select-sale]').click();await settle(()=>w.document.querySelector('#sendFinanceSale'));
  assert.equal(w.document.querySelector('#findFinanceBuyer input').value,id);assert.equal(w.document.querySelector('#findFinanceBuyer input').readOnly,true);
  assert.equal(w.document.querySelector('[name=identity]').checked,false);assert.equal(calls.find(c=>c.url.endsWith('/lookup')).body.query,id);
  assert.equal(calls.some(c=>c.body?.sale_id),false);
 }finally{w.close();}
});

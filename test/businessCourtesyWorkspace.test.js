const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const wait=async f=>{for(let n=0;n<150;n++){if(f())return;await new Promise(r=>setTimeout(r,5));}throw Error('Workspace did not settle');};
function setup(){
 const w=new JSDOM('<style>section,header,button{width:20px!important;display:grid!important;word-break:break-all!important}</style><div id="courtesiesContent"></div>',{url:'https://example.test/empresa/',runScripts:'outside-only'}).window,calls=[];
 w.state={currentView:'courtesies'};w.authHeaders=()=>({Authorization:'test-session'});
 w.QoriBusinessGiftCreate={open:()=>calls.push('create')};w.QoriBusinessGifts={open:()=>calls.push('orders')};w.QoriCustomerPublishing={open:o=>calls.push(o)};w.setView=v=>calls.push(v);
 w.api=async path=>{calls.push(path);return {orders:[],branches:[]};};
 w.eval(fs.readFileSync('customer-web/courtesies.js','utf8'));w.eval(fs.readFileSync('empresa/js/courtesies.js','utf8'));w.QoriBusinessCourtesies.open();
 return {w,calls,ui:w.document.querySelector('#courtesiesContent').shadowRoot};
}
test('Empresa starts on sales and dispatch, isolates legacy CSS and opens canonical workflows',async()=>{
 const {w,calls,ui}=setup();try{
  await wait(()=>ui.querySelector('.qco-empty'));
  assert.equal(w.document.querySelector('[data-confirm]'),null);assert.equal(w.document.querySelector('.qco'),null);
  assert.equal(ui.querySelector('.qco').getRootNode(),ui);assert.equal(ui.querySelector('link').href,'https://example.test/customer/courtesies.css?v=courtesy-dispatch-20261109');
  assert.equal(ui.querySelector('[data-tab=incoming]').getAttribute('aria-pressed'),'true');assert.equal(calls[0],'/api/business/customer/courtesies/incoming');
  assert.match(ui.textContent,/Si te compraron un ticket con destinatario/);
  ui.querySelector('[data-action=createSale]').click();ui.querySelector('[data-action=orders]').click();ui.querySelector('[data-action=publish]').click();ui.querySelector('[data-action=validate]').click();
  assert.deepEqual(JSON.parse(JSON.stringify(calls.slice(1))),['create','orders',{kind:'PRODUCT'},'validator']);
  w.state.currentView='inventory';ui.querySelector('[data-action=createSale]').click();assert.equal(calls.filter(x=>x==='create').length,1);
 }finally{w.close();}
});
test('an old failed request cannot replace the newer tab with an error',async()=>{
 const {w,ui}=setup();try{
  await wait(()=>ui.querySelector('.qco-empty'));let reject;
  w.api=path=>path.endsWith('/catalog')?new Promise((_,r)=>reject=r):Promise.resolve({orders:[],branches:[]});
  ui.querySelector('[data-tab=buy]').click();await wait(()=>reject);ui.querySelector('[data-tab=incoming]').click();await wait(()=>ui.querySelector('.qco-empty'));
  reject(Error('stale catalog'));await new Promise(r=>setTimeout(r,10));assert.ok(ui.querySelector('.qco-empty'));assert.equal(ui.querySelector('[data-retry]'),null);assert.doesNotMatch(ui.textContent,/stale catalog/);
 }finally{w.close();}
});
test('confirmed packages explain buyer assignment and never offer a second payment',async()=>{
 const {w,ui}=setup();try{
  await wait(()=>ui.querySelector('.qco-empty'));
  w.api=async()=>({orders:[{id:'lot',state:'READY',quantity:20,assigned:4,available:16,total:'160000',snapshot:{product_name:'Café',buyer_name:'DeColeccion'}}],branches:[]});
  ui.querySelector('[data-refresh]').click();await wait(()=>ui.textContent.includes('16 por asignar'));
  assert.equal(ui.querySelector('[data-confirm]'),null);assert.match(ui.textContent,/Habilitado para el comprador/);assert.match(ui.textContent,/No crees otro ticket/);
 }finally{w.close();}
});

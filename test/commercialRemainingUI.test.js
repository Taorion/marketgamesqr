const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('UI did not settle');}
test('Clientes displays current remaining amounts, refreshes to zero and labels plan limits separately',async()=>{
 const w=new JSDOM('<div id="commercialWorkspace"></div>',{runScripts:'outside-only',url:'https://example.test/admin/'}).window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 let tickets=17,gifts=7,reads=0;
 const context={api:async path=>{
  if(path.includes('/bootstrap'))return {counts:{prospects:0,pending:0,approved:0,customers:1},user:{id:'u',role:'QORI_SUPERADMIN',name:'QA',permissions:[]},sellers:[],plans:[],policies:[],modules:{},limit_labels:{gift_cards_total:'Giftcards del plan'},descubre:{name:'Freemium'}};
  assert.ok(path.includes('/customers?'));reads++;
  return {has_more:false,rows:[{id:'b',name:'Negocio <img>',plan_code:'DESCUBRE',is_active:true,subscription:{access_status:'ACTIVE',features:{},limits:{gift_cards_total:10}},balances:{tickets:{available:tickets,used_total:25-tickets},giftcards:{available:gifts,issued_count:10-gifts,issued_month:10-gifts},access_allowed:true,as_of:new Date().toISOString()}}]};
 }};
 try{
  w.eval(fs.readFileSync('admin/js/commercial.js','utf8'));await w.QoriCommercial.load(context);
  w.document.querySelector('[data-action=tab][data-id=customers]').click();await until(()=>w.document.querySelector('.commercial-remaining'));
  let content=w.document.querySelector('#commercialContent');assert.match(content.textContent,/Le quedan 17 tickets/);assert.match(content.textContent,/Le quedan 7 giftcards/);assert.doesNotMatch(content.textContent,/25 tickets iniciales/);assert.equal(content.querySelector('img'),null);
  tickets=0;gifts=0;w.document.querySelector('[data-action=refresh-balances]').click();await until(()=>w.document.querySelector('.commercial-remaining')?.textContent.includes('Le quedan 0 tickets'));
  assert.equal(reads,2);assert.match(w.document.querySelector('#commercialContent').textContent,/Le quedan 0 giftcards/);
  w.document.querySelector('[data-action=view-customer]').click();await until(()=>w.document.querySelector('dialog'));
  assert.match(w.document.querySelector('dialog').textContent,/Le quedan 0 tickets/);assert.match(w.document.querySelector('dialog').textContent,/Límites del plan \(no son saldos restantes\)/);
 }finally{w.close();}
});


test('team removal uses the same written reconfirmation and explicit DELETE body',async()=>{
 const w=new JSDOM('<div id="commercialWorkspace"></div>',{runScripts:'outside-only',url:'https://example.test/admin/'}).window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const context={api:async(path,opts={})=>{calls.push({path,...opts});if(path.includes('/bootstrap'))return {counts:{},user:{id:'admin',role:'QORI_SUPERADMIN',can_see_team:true,permissions:['team.remove','team.edit']},sellers:[{id:'s1',full_name:'Embajador QA',email:'qa@example.test',is_active:true,admin_role:'QORI_SELLER'}],plans:[],policies:[],modules:{},limit_labels:{},default_permissions:[],descubre:{}};if(path.endsWith('/deletion-preview')){assert.equal(opts.method,'GET');return {name:'Embajador QA',confirmation:'qa@example.test',token:'bound-token'};}return {ok:true,rows:[]};}};
 try{
  w.eval(fs.readFileSync('admin/js/commercial.js','utf8'));await w.QoriCommercial.load(context);w.document.querySelector('[data-action=tab][data-id=team]').click();await until(()=>w.document.querySelector('[data-action=archive-seller]'));
  w.document.querySelector('[data-action=archive-seller]').click();await until(()=>w.document.querySelector('[name=confirmation]'));const f=w.document.querySelector('dialog form'),submit=f.querySelector('[type=submit]');assert.equal(submit.disabled,true);
  f.elements.confirmation.value='qa@example.test';f.elements.reason.value='Eliminación confirmada por administrador';f.elements.confirmed.checked=true;f.dispatchEvent(new w.Event('input'));assert.equal(submit.disabled,false);f.dispatchEvent(new w.Event('submit',{cancelable:true}));await until(()=>calls.some(c=>c.method==='DELETE'));
  assert.deepEqual(JSON.parse(calls.find(c=>c.method==='DELETE').body),{token:'bound-token',confirmation:'qa@example.test',confirmed:true,reason:'Eliminación confirmada por administrador'});
 }finally{w.close();}
});

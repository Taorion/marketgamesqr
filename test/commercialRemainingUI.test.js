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

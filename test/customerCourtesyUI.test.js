const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const wait=async f=>{for(let n=0;n<150;n++){if(f())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(business=false){
 const w=new JSDOM('<div id="host"></div>',{url:'https://example.test/customer/',runScripts:'outside-only'}).window,calls=[];
 const offer={id:'pub',product_name:'Café <script>bad</script>',merchant_name:'Café QA',price:'8000',stock_quantity:10,terms:'Un café, sin compra adicional.',valid_days:30,payment_instructions:'Paga en caja.'};
 const lot={id:'lot',merchant_name:'Café QA',quantity:2,assigned:0,available:2,state:'READY',source:'PURCHASE',total:'16000',snapshot:{product_name:offer.product_name,buyer_name:'Comprador',terms:offer.terms,valid_days:30}};
 let deliveries=[],failSend=true,alive=true;
 const ctx={business,current:()=>alive,request:async(path,body)=>{
  calls.push({path,body});
  if(path.startsWith('/catalog'))return {offers:[offer],own_products:[{id:'product',name:'Producto propio',stock_quantity:8}]};
  if(path==='/incoming')return {orders:[{...lot,state:'PENDING_PAYMENT'}],branches:[{id:'branch',name:'Principal'}]};
  if(path.endsWith('/confirm')){lot.state='READY';return {ok:true};}
  if(path===''&&body){lot.state=body.source==='OWN'?'READY':'PENDING_PAYMENT';lot.source=body.source;lot.available=body.source==='OWN'?body.quantity:0;return {lot};}
  if(path==='')return {lots:[lot]};
  if(path==='/lot/send'){if(failSend){failSend=false;throw Error('Conexión interrumpida');}lot.available--;lot.assigned++;deliveries=[{id:'gift',recipient_name:body.recipient_name,invitation_state:'PENDING',share_url:'https://example.test/customer/#invitations',receipt_url:'https://example.test/receipt'}];return {ok:true};}
  if(path==='/lot')return {lot,deliveries};throw Error('Unexpected '+path);
 }};
 w.eval(fs.readFileSync('customer-web/courtesies.js','utf8'));w.QoriCourtesies.render(w.document.querySelector('#host'),ctx);
 const submit=selector=>{const f=w.document.querySelector(selector);f.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true}));};
 return {w,calls,submit,lot,stop:()=>alive=false};
}
test('Customer buys quantity without a recipient, sees terms and pending-payment status',async()=>{
 const {w,calls,submit}=setup();try{
  await wait(()=>w.document.querySelector('[data-detail]'));assert.equal(w.document.querySelector('[data-tab=own]'),null);assert.equal(w.document.querySelector('script'),null);
  w.document.querySelector('[data-tab=buy]').click();await wait(()=>w.document.querySelector('[data-offer]'));w.document.querySelector('[data-offer]').click();
  assert.equal(w.document.querySelector('[name=recipient_email]'),null);w.document.querySelector('[name=quantity]').value='3';w.document.querySelector('[name=quantity]').dispatchEvent(new w.Event('input'));assert.match(w.document.querySelector('[data-total]').textContent,/24/);
  submit('[data-purchase]');assert.equal(calls.some(c=>c.body),false);w.document.querySelector('[type=checkbox]').checked=true;submit('[data-purchase]');await wait(()=>w.document.querySelector('[data-cancel]'));
  const d=calls.find(c=>c.body).body;assert.equal(d.quantity,3);assert.equal(d.expected_unit_price,'8000');assert.equal(d.recipient_email,undefined);assert.equal(w.document.querySelector('[data-send]'),null);assert.match(w.document.body.textContent,/todavía no acredita un pago/);
 }finally{w.close();}
});
test('explicit delivery retains fields and the same request on failure, prevents double submission',async()=>{
 const {w,calls,submit}=setup();try{
  await wait(()=>w.document.querySelector('[data-detail]'));w.document.querySelector('[data-detail]').click();await wait(()=>w.document.querySelector('[data-send]'));
  const f=w.document.querySelector('[data-send]');f.elements.recipient_name.value='Cliente';f.elements.recipient_email.value='cliente@example.test';
  submit('[data-send]');assert.equal(calls.some(c=>c.body),false);f.querySelector('[type=checkbox]').checked=true;submit('[data-send]');await wait(()=>w.document.querySelector('[data-status]').textContent.includes('interrumpida'));assert.equal(f.elements.recipient_email.value,'cliente@example.test');
  submit('[data-send]');submit('[data-send]');await wait(()=>w.document.querySelector('.qco-links'));const sends=calls.filter(c=>c.path.endsWith('/send'));assert.equal(sends.length,2);assert.equal(sends[0].body.request_id,sends[1].body.request_id);assert.match(w.document.body.textContent,/1 por entregar/);assert.ok(w.document.querySelector('a[rel=noopener]'));
 }finally{w.close();}
});
test('Empresa reserves own inventory and confirms incoming payment only with explicit receipt check',async()=>{
 const {w,calls,submit}=setup(true);try{
  await wait(()=>w.document.querySelector('[data-detail]'));w.document.querySelector('[data-tab=own]').click();await wait(()=>w.document.querySelector('[data-own]'));const f=w.document.querySelector('[data-own]');f.elements.product_id.value='product';f.elements.quantity.value='2';submit('[data-own]');assert.equal(calls.some(c=>c.body),false);f.querySelector('[type=checkbox]').checked=true;submit('[data-own]');await wait(()=>w.document.querySelector('[data-send]'));assert.equal(calls.find(c=>c.body).body.source,'OWN');
  w.document.querySelector('[data-tab=incoming]').click();await wait(()=>w.document.querySelector('[data-confirm]'));const c=w.document.querySelector('[data-confirm]');c.elements.payment_reference.value='CAJA-123';c.elements.payment_method.value='CASH';submit('[data-confirm]');assert.equal(calls.some(x=>x.path.endsWith('/confirm')),false);c.elements.received.checked=true;submit('[data-confirm]');await wait(()=>calls.some(x=>x.path.endsWith('/confirm')));assert.equal(calls.find(x=>x.path.endsWith('/confirm')).body.amount,'16000');
 }finally{w.close();}
});
test('changed business session prevents writes from a stale form',async()=>{
 const {w,calls,submit,stop}=setup(true);try{await wait(()=>w.document.querySelector('[data-detail]'));w.document.querySelector('[data-detail]').click();await wait(()=>w.document.querySelector('[data-send]'));const f=w.document.querySelector('[data-send]');f.elements.recipient_name.value='Cliente';f.elements.recipient_email.value='cliente@example.test';f.querySelector('[type=checkbox]').checked=true;stop();submit('[data-send]');await new Promise(r=>setTimeout(r,20));assert.equal(calls.some(x=>x.body),false);}finally{w.close();}
});

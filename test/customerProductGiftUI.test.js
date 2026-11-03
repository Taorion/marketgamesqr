// DOM component tests, not a browser or mobile visual test.
// Setup: npm install --prefix .local-customer/qa-tools jsdom@26.1.0 --no-audit --no-fund
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Normal checkouts use the dev dependency; this shared-node_modules worktree uses an isolated QA install.
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{({JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom'));}
const root=path.resolve(__dirname,'..');
const load=(w,file)=>w.eval(fs.readFileSync(path.join(root,file),'utf8'));
function setup(){
 const dom=new JSDOM('<main id="page"></main>',{url:'http://localhost/customer/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.onclose?.();};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 return dom;
}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setImmediate(r));}throw Error('DOM did not settle');}
const offer={id:'publication-qa',kind:'PRODUCT',benefit:'Café americano',title:'Un café de tu parte',business_name:'Café QA',product_price:'8000',product_valid_days:30,terms:'Un café sin compra adicional.',payment_instructions:'Paga en caja e indica el pedido.'};
test('Validator switches a previously selected purchase to delivery for a prepaid gift',()=>{
 const dom=setup(),w=dom.window;
 try{
  const code=fs.readFileSync(path.join(root,'empresa/js/app.js'),'utf8'),start=code.indexOf('function syncValidatorRedemptionMode('),end=code.indexOf('function renderValidatorCompletedCheckout(',start);
  w.state={validatorRedemptionMode:'PURCHASE',validatorLastValidation:{qr_code:{customer_product_gift:true}}};
  w.validatorKind=()=> 'qr';w.validatorIsPaidProductGift=()=>true;w.validatorBenefitDescriptor=()=>({purchase_required:false});
  w.calculateValidatorCheckoutPreview=()=>{};w.renderValidatorPurchaseItems=()=>{throw Error('Must not offer another purchase');};
  for(const key of ['validatorStandardSaleFields','validatorRedemptionModes','validatorStandaloneModeInput','validatorPurchaseModeInput','validatorStandaloneModeChoice','validatorPurchaseModeChoice','validatorPurchaseEditor','validatorRedeemButton']){w[key]=w.document.createElement('div');w.document.body.append(w[key]);}
  w.validatorRedeemButton.innerHTML='<span>→</span><span>Aplicar beneficio y cerrar compra</span>';
  w.eval(code.slice(start,end));w.syncValidatorRedemptionMode();
  assert.equal(w.state.validatorRedemptionMode,'STANDALONE');assert.equal(w.validatorPurchaseEditor.hidden,true);assert.equal(w.validatorRedemptionModes.hidden,true);assert.match(w.validatorRedeemButton.textContent,/Entregar regalo ya pagado/);
 }finally{w.close();}
});
test('Customer gift form keeps its request identity on retry and shows payment instructions without a usable ticket',async()=>{
 const dom=setup(),w=dom.window,page=w.document.querySelector('#page'),calls=[],errors=[];let fail=true;
 const ctx={showError:m=>errors.push(m),dialog(title,body){const d=w.document.createElement('dialog');d.innerHTML='<h2>'+title+'</h2>'+body+'<p id="dialogError"></p>';w.document.body.append(d);d.showModal();return d;},request:async(url,body)=>{
  calls.push({url,body});if(fail){fail=false;throw Error('Conexión interrumpida');}
  return {order:{id:'order-qa'},orders:[{id:'order-qa',state:'PENDING_PAYMENT',amount:'8000',product_name:'Café americano',business_name:'Café QA',recipient_name:'Camilo',terms:offer.terms,payment_instructions:offer.payment_instructions,message:'<img src=x onerror=alert(1)>'}]};
 }};
 try{
  load(w,'customer-web/product-gifts.js');w.QoriProductGifts.buy(offer,ctx);
  const f=w.document.querySelector('form');f.elements.recipient.value='camilo@example.test';f.elements.message.value='Para tu mañana';f.querySelector('[type=checkbox]').checked=true;
  const event={preventDefault(){},stopPropagation(){},target:f,submitter:f.querySelector('button')};
  await f.onsubmit(event);assert.equal(errors[0],'Conexión interrumpida');assert.equal(event.submitter.disabled,false);
  await f.onsubmit(event);
  assert.equal(calls[0].body.request_id,calls[1].body.request_id);assert.equal(calls[1].body.recipient,'camilo@example.test');assert.equal(calls[1].body.amount,undefined);assert.equal(calls[1].body.terms_accepted,true);assert.equal(w.location.hash,'#product-gifts');
  await w.QoriProductGifts.render(page,ctx);
  assert.match(page.textContent,/Pendiente de pago/);assert.match(page.textContent,/Paga en caja/);assert.match(page.textContent,/Camilo/);
  assert.equal(page.querySelector('img'),null);assert.equal(page.querySelector('[data-cancel-gift]').textContent,'Cancelar solicitud pendiente');
 }finally{w.close();}
});
test('Empresa product selection, editing and confirmed-payment form send the expected canonical request',async()=>{
 const dom=setup(),w=dom.window,calls=[];let issued=false;
 const publication={...offer,resource_id:'product-qa',status:'PUBLISHED',eligible:true,metrics:{},url:'http://localhost/customer/#publication/qa'};
 const catalog={directory:{published:true},activities:[],stamps:[],products:[{id:'product-qa',name:'Café americano',unit_price:'8000'}],publications:[publication]};
 w.authHeaders=()=>({});w.setInterval=()=>0;
 w.api=async(url,opts)=>{
  const body=opts.body?JSON.parse(opts.body):undefined;calls.push({url,body});
  if(url.endsWith('/confirm-payment')){issued=true;return {ok:true};}
  if(url.endsWith('/program-requests'))return {requests:[]};
  if(url.endsWith('/product-gifts'))return {orders:[{id:'order-qa',product_name:'Café americano',amount:'8000',buyer_name:'Andrea',recipient_name:'Camilo',state:issued?'ISSUED':'PENDING_PAYMENT',terms:offer.terms}]};
  return catalog;
 };
 try{
  load(w,'empresa/js/customer-publishing.js');w.QoriCustomerPublishing.open();
  await until(()=>w.document.querySelector('[data-gift-payment]'));
  const form=w.document.querySelector('#publishOffer');
  form.elements.kind.value='PRODUCT';form.elements.kind.onchange();
  form.elements.resource_id.value='product-qa';form.elements.resource_id.onchange();assert.equal(form.elements.product_price.value,'8000');assert.equal(form.elements.product_valid_days.value,'30');
  w.document.querySelector('[data-edit]').click();assert.equal(form.elements.product_terms.value,offer.terms);assert.equal(form.elements.payment_instructions.value,offer.payment_instructions);
  const f=w.document.querySelector('[data-gift-payment]');f.elements.payment_reference.value='BANK-QA-123';f.elements.payment_method.value='BANK_TRANSFER';f.elements.payment_received.checked=true;
  await f.onsubmit({preventDefault(){},submitter:f.querySelector('button')});
  const payment=calls.find(c=>c.url.endsWith('/confirm-payment'));
  assert.deepEqual(payment.body,{amount:'8000',payment_method:'BANK_TRANSFER',payment_reference:'BANK-QA-123',payment_received:true});
  assert.equal(w.document.querySelector('[data-gift-payment]'),null);assert.match(w.document.querySelector('#publishingMessage').textContent,/Pago confirmado/);
 }finally{w.close();}
});

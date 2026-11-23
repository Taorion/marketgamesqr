const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../empresa/js/stamp-cards.js'),'utf8');
const id='5832701d-3ce1-4dc7-a114-9b7f66d4298c';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
  const dom=new JSDOM('<body data-current-view="stamp-cards"><div id="stampCardsWorkspace"></div></body>',{url:'https://gosqori.com/empresa/',runScripts:'outside-only'}),w=dom.window,calls=[];
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  let scope='business-a';w.businessScopeKey=()=>scope;w.isCurrentBusinessScope=value=>value===scope;w.authHeaders=()=>({});
  const card={id,name:'Ana Cliente',document_id:'QA123',business_name:'Café QA',program_name:'Café de siempre',stamps:0,cycle_id:id,cycle_number:1,void_count:0,expires_at:'2030-01-01',rules:{stamps_required:8,benefit_value:{label:'Un café'},minimum_purchase:5000,purchase_product:{inventory_product_id:id},terms:'Solo café',one_per_day:false}};
  w.api=async(url,options)=>{calls.push({url,options});if(url.includes('/validator/'))return {card:{...card,stamps:options.method==='POST'?1:0},can_stamp:true,purchase:{products:[{id,name:'Café',unit_price:5000}],existing_sales:[]},sale:options.method==='POST'?{id,sale_amount:5000}:null};
    if(url.endsWith('/context'))return {programs:[],business:{name:'QA'},ticket_balance:5};
    if(url.includes('/dashboard'))return {metrics:{},trend:[]};if(url.includes('/members'))return {members:[]};return {events:[]};};
  w.ensureJsQrLoaded=async()=>true;w.extractStampCardQrId=raw=>raw===`qori:stamp-card:${id}`?id:'';
  w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
  w.Image=class {naturalWidth=400;naturalHeight=400;set src(value){queueMicrotask(()=>this.onload());}};
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData(){return {data:new Uint8ClampedArray(16),width:2,height:2};}});
  w.jsQR=()=>({data:`qori:stamp-card:${id}`});w.HTMLMediaElement.prototype.play=async()=>{};
  w.eval(source);return {w,dom,calls,setScope:()=>{scope='business-b';}};
}
async function upload(t,qr=true){t.w.document.querySelector('[data-action="scan-image"]').click();const input=t.w.document.querySelector('[data-qr-file]');Object.defineProperty(input,'files',{value:[new t.w.File(['qr'],'whatsapp.png',{type:'image/png'})],configurable:true});if(!qr)t.w.jsQR=()=>null;await input.onchange();}
test('WhatsApp image opens card read-only; explicit confirmation sends once and updates progress',async()=>{
  const t=setup();await tick();await upload(t);const d=t.w.document.querySelector('#scDialog');
  assert.match(d.textContent,/Ana Cliente/);assert.match(d.textContent,/Solo café/);assert.equal(t.calls.filter(c=>c.options.method==='POST').length,0);
  const button=d.querySelector('[data-scan-stamp]');button.click();button.click();await tick();
  assert.equal(t.calls.filter(c=>c.options.method==='POST').length,1);assert.match(d.textContent,/1 de 8 sellos/);assert.equal(d.querySelector('[data-scan-stamp]').disabled,true);
  assert.deepEqual(JSON.parse(t.calls.find(c=>c.options.method==='POST').options.body),{cycle_id:id,expected_stamps:0,expected_voids:0,purchase:{inventory_product_id:id,quantity:1,sale_amount:5000}});t.dom.window.close();
});
test('unreadable image and wrong QR are recoverable and do not stamp',async()=>{
  const t=setup();await tick();await upload(t,false);assert.match(t.w.document.querySelector('#scDialogMessage').textContent,/No encontramos/);
  const input=t.w.document.querySelector('[data-qr-file]');t.w.jsQR=()=>({data:'https://example.org'});await input.onchange();assert.match(t.w.document.querySelector('#scDialogMessage').textContent,/no identifica/);
  assert.equal(t.calls.filter(c=>c.url.includes('/validator/')).length,0);t.dom.window.close();
});
test('purchase quantity updates the total and users can confirm the actual paid amount',async()=>{
  const t=setup();await tick();await upload(t);const form=t.w.document.querySelector('[data-purchase-form]');
  form.elements.quantity.value='2';form.elements.quantity.dispatchEvent(new t.w.Event('input'));assert.equal(form.elements.sale_amount.value,'10000');
  form.elements.sale_amount.value='9000';t.w.document.querySelector('[data-scan-stamp]').click();await tick();
  const body=JSON.parse(t.calls.find(c=>c.options.method==='POST').options.body);assert.equal(body.purchase.quantity,2);assert.equal(body.purchase.sale_amount,9000);t.dom.window.close();
});
test('linking an existing sale sends only its identity and disables new-sale fields',async()=>{
  const t=setup();await tick();const previous=t.w.api;t.w.api=async(...args)=>{const result=await previous(...args);if(result.purchase)result.purchase.existing_sales=[{id,product_name:'Café registrado',sale_amount:5000,created_at:'2026-11-23'}];return result;};
  await upload(t);const form=t.w.document.querySelector('[data-purchase-form]');form.elements.mode.value='existing';form.elements.mode.dispatchEvent(new t.w.Event('change'));form.elements.existing_sale_id.value=id;
  assert.equal(form.elements.sale_amount.disabled,true);t.w.document.querySelector('[data-scan-stamp]').click();await tick();assert.deepEqual(JSON.parse(t.calls.find(c=>c.options.method==='POST').options.body).purchase,{existing_sale_id:id});t.dom.window.close();
});
test('real PNG QR pixels decode through the upload flow using the shipped jsQR decoder',async()=>{
  const t=setup();await tick();const QRCode=require('qrcode'),{PNG}=require('pngjs');
  const png=PNG.sync.read(await QRCode.toBuffer(`qori:stamp-card:${id}`,{width:320,margin:4}));
  t.w.jsQR=require('jsqr');t.w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},getImageData(){return {data:new Uint8ClampedArray(png.data),width:png.width,height:png.height};}});
  await upload(t);assert.match(t.w.document.querySelector('#scDialog').textContent,/Ana Cliente/);assert.equal(t.calls.filter(c=>c.options.method==='POST').length,0);t.dom.window.close();
});
test('camera stops its tracks when switching away from stamps',async()=>{
  const t=setup();await tick();let stopped=0;Object.defineProperty(t.w.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})}});
  t.w.document.querySelector('[data-action="scan-camera"]').click();await tick();t.w.document.body.dataset.currentView='dashboard';await tick();
  assert.equal(stopped,1);assert.equal(t.w.document.querySelector('#scDialog').open,false);t.dom.window.close();
});
test('camera denial offers image upload; late permission after close stops tracks',async()=>{
  const t=setup();await tick();Object.defineProperty(t.w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}},configurable:true});
  t.w.document.querySelector('[data-action="scan-camera"]').click();await tick();assert.match(t.w.document.querySelector('#scDialogMessage').textContent,/No se autorizó/);
  let resolve,stops=0;t.w.navigator.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);t.w.document.querySelector('[data-camera]').click();await tick();
  t.w.document.querySelector('#scDialog').close();resolve({getTracks:()=>[{stop:()=>stops++}]});await tick();assert.equal(stops,1);t.dom.window.close();
});
test('switching business while lookup is pending never exposes the previous card',async()=>{
  const t=setup();await tick();let resolve;t.w.api=()=>new Promise(r=>resolve=r);const pending=t.w.StampCards.openFromValidator(id);t.setScope();resolve({card:{name:'Private tenant'}});await pending;
  assert.doesNotMatch(t.w.document.querySelector('#scDialog').textContent,/Private tenant/);t.dom.window.close();
});

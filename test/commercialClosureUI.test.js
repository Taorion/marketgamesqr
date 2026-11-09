const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));async function until(fn){for(let i=0;i<100;i++){if(fn())return;await tick();}throw Error('UI did not settle');}
function setup(role='QORI_SUPERADMIN',eligible=true){
 const w=new JSDOM('<div id="commercialWorkspace"></div>',{runScripts:'outside-only',url:'https://example.test/admin/'}).window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const ctx={api:async(path,opts={})=>{
  calls.push({path,body:opts.body&&JSON.parse(opts.body)});
  if(opts.body)return {ok:true};
  if(path.includes('/bootstrap'))return {counts:{},user:{id:'u',role,name:'QA',permissions:['prospects.manage']},sellers:[],plans:[],policies:[],modules:{},limit_labels:{}};
  if(path.endsWith('/closure'))return {prospect:{id:'p',business_name:'Café <script>'},subscription:{plan_name:'Starter',active:eligible,current_period_ends_at:'2026-12-09T12:00:00Z'},payments:eligible?[{id:'pay',amount_cop:120000,paid_at:'2026-11-09T12:00:00Z',reference:'PAY-123'}]:[],can_close:eligible};
  if(path.includes('/prospects?'))return {has_more:false,rows:[{id:'p',business_id:'b',business_name:'Café',stage:'WON',seller_name:'Embajador'}]};
  throw Error(path);
 }};w.eval(fs.readFileSync('admin/js/commercial.js','utf8'));return {w,calls,ctx};
}
test('Admin validates payment and subscription in the close dialog; Seller has no close control',async()=>{
 for(const role of ['QORI_SELLER','QORI_SUPERADMIN']){
  const {w,calls,ctx}=setup(role);try{
   await w.QoriCommercial.load(ctx);w.document.querySelector('[data-action=tab][data-id=prospects]').click();await until(()=>w.document.querySelector('#commercialContent tbody'));
   const button=w.document.querySelector('[data-action=close-prospect]');
   if(role==='QORI_SELLER'){assert.equal(button,null);continue;}
   button.click();await until(()=>w.document.querySelector('dialog [name=payment_order_id]'));
   const dialog=w.document.querySelector('dialog'),f=dialog.querySelector('form');assert.equal(dialog.querySelector('script'),null);
   assert.equal(f.elements.payment_verified.required,true);assert.equal(f.elements.subscription_verified.required,true);
   assert.match(dialog.textContent,/PAY-123/);f.elements.reason.value='Pago y plan comprobados por administración.';f.elements.payment_verified.checked=true;f.elements.subscription_verified.checked=true;
   f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>calls.some(c=>c.body));
   assert.deepEqual(calls.find(c=>c.body).body,{payment_order_id:'pay',payment_verified:true,subscription_verified:true,reason:'Pago y plan comprobados por administración.'});
   await until(()=>!w.document.querySelector('dialog'));
  }finally{w.close();}
 }
});
test('Admin cannot submit closure when the live review has no active paid subscription',async()=>{
 const {w,calls,ctx}=setup('QORI_SUPERADMIN',false);try{await w.QoriCommercial.load(ctx);w.document.querySelector('[data-action=tab][data-id=prospects]').click();await until(()=>w.document.querySelector('[data-action=close-prospect]'));w.document.querySelector('[data-action=close-prospect]').click();await until(()=>w.document.querySelector('dialog'));assert.match(w.document.querySelector('dialog').textContent,/No se puede cerrar/);assert.equal(w.document.querySelector('dialog [type=submit]'),null);assert.equal(calls.some(c=>c.body),false);}finally{w.close();}
});


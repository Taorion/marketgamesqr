const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const {JSDOM}=require('../.local-customer/qa-tools/node_modules/jsdom');
const wait=async fn=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Not settled');};
function setup(){
 const w=new JSDOM('<main></main>',{url:'https://example.test/customer/',runScripts:'outside-only'}).window,calls=[];
 w.HTMLDialogElement.prototype.close=function(){this.remove();};
 for(const f of ['quick-receipt.js','daily-money.js'])w.eval(fs.readFileSync('customer-web/'+f,'utf8'));
 const ctx={book:{id:'private-book',name:'Casa',currency:'COP'},account:{timezone:'America/Bogota'},refresh:async()=>{},showError:(m,n)=>{n.textContent=m;},request:async(u,b)=>{calls.push({u,b});return {entry:{id:'private-entry'}};},dialog:(_,html)=>{const d=w.document.createElement('dialog');d.innerHTML=html;w.document.body.append(d);return d;}};
 w.QoriDailyMoney.open(ctx,'EXPENSE');const f=w.document.querySelector('form');f.elements.amount.value='12000';f.elements.merchant.value='Mercado';
 const submit=()=>f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));
 const file=async(name='recibo.pdf',type='application/pdf',content='%PDF-1.4 receipt')=>{const input=f.querySelector('[data-upload]');Object.defineProperty(input,'files',{configurable:true,value:[new w.File([content],name,{type})]});input.dispatchEvent(new w.Event('change'));await wait(()=>!f.querySelector('[type=submit]').disabled);};
 return {w,ctx,f,calls,submit,file};
}
test('optional camera and attachment controls preserve a one-step expense without a receipt',async()=>{
 const {w,f,calls,submit}=setup();try{
  assert.equal(f.querySelector('[data-camera]').getAttribute('capture'),'environment');
  assert.equal(f.querySelector('[data-camera]').required,false);assert.match(f.querySelector('[data-upload]').accept,/application\/pdf/);
  submit();await wait(()=>!f.isConnected);assert.equal(calls.length,1);assert.equal(calls[0].u,'/entries');
 }finally{w.close();}
});
test('PDF selection shows filename; an upload retry reuses the saved expense and retains attachment',async()=>{
 const {w,ctx,f,calls,submit,file}=setup();try{
  let attempts=0;ctx.request=async(u,b)=>{calls.push({u,b});if(u.endsWith('/receipts')&&!attempts++)throw Error('Sin conexión');return {entry:{id:'private-entry'}};};
  await file();assert.equal(f.querySelector('[data-filename]').textContent,'recibo.pdf');
  submit();await wait(()=>f.querySelector('#dialogError').textContent.includes('No pudimos adjuntar'));
  assert.equal(f.elements.amount.disabled,true);assert.match(f.querySelector('[type=submit]').textContent,/Reintentar/);
  submit();await wait(()=>!f.isConnected);assert.equal(calls.filter(c=>c.u==='/entries').length,1);assert.equal(calls.filter(c=>c.u==='/entries/private-entry/receipts').length,2);
  assert.equal(calls[1].b.base64,calls[2].b.base64);
 }finally{w.close();}
});
test('attachment can be removed and invalid files fail before any expense is submitted',async()=>{
 const {w,f,calls,file}=setup();try{
  await file();f.querySelector('[data-remove]').click();assert.equal(f.querySelector('[data-preview]').hidden,true);
  await file('script.html','text/html','<script>');assert.match(f.querySelector('#dialogError').textContent,/JPG o PNG/);assert.equal(calls.length,0);
  const large=new w.File([new Uint8Array(5242881)],'large.pdf',{type:'application/pdf'});
  await assert.rejects(w.QoriQuickReceipt.prepare(large),/5 MB/);
 }finally{w.close();}
});

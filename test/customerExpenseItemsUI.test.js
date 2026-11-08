const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const wait=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI did not settle');};
function setup(){
 const w=new JSDOM('<main></main>',{url:'https://example.test/customer/',runScripts:'outside-only'}).window,calls=[];w.HTMLDialogElement.prototype.close=function(){this.remove();};
 const css=w.document.createElement('style');css.textContent=fs.readFileSync('customer-web/styles.css','utf8')+'\n'+fs.readFileSync('customer-web/daily-money.css','utf8');w.document.head.append(css);
 for(const p of ['quick-receipt.js','expense-items.js','daily-money.js'])w.eval(fs.readFileSync('customer-web/'+p,'utf8'));
 const ctx={book:{id:'home',name:'Casa',currency:'COP'},account:{timezone:'America/Bogota'},refresh:async()=>{},showError:(m,n)=>{n.textContent=m;},request:async(u,b)=>{calls.push({u,b});return {entry:{id:'expense'}};},dialog:(_,html)=>{const d=w.document.createElement('dialog');d.innerHTML=html;w.document.body.append(d);return d;}};
 w.QoriDailyMoney.open(ctx,'EXPENSE');const f=w.document.querySelector('form');f.elements.merchant.value='Mercado de la casa';
 const change=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const mode=value=>f.querySelector('[name=expense_mode][value='+value+']').click();
 const row=(name,qty,price,index=0)=>{const r=f.querySelectorAll('.expense-item')[index];change(r.querySelector('[data-name]'),name);change(r.querySelector('[data-quantity]'),qty);change(r.querySelector('[data-price]'),price);};
 const submit=()=>f.dispatchEvent(new w.SubmitEvent('submit',{cancelable:true,submitter:f.querySelector('[type=submit]')}));
 return {w,ctx,calls,f,change,mode,row,submit};
}
test('total-only stays quick; item drafts survive mode changes but never leak into a simple expense',async()=>{
 const {w,f,calls,mode,row,change,submit}=setup();try{
  assert.equal(f.elements.expense_mode.value,'TOTAL');assert.equal(f.querySelector('[data-item-detail]').hidden,true);
  change(f.elements.amount,'18000');mode('ITEMS');row('Leche',2,4000);mode('TOTAL');assert.equal(f.querySelector('[data-name]').disabled,true);
  mode('ITEMS');assert.equal(f.querySelector('[data-name]').value,'Leche');mode('TOTAL');submit();await wait(()=>!f.isConnected);
  assert.equal(calls.length,1);assert.equal(calls[0].b.amount,'18000');assert.equal(calls[0].b.products.length,0);
 }finally{w.close();}
});
test('items save their calculated total without typing an amount; quantity is not charged twice',async()=>{
 const {w,f,calls,mode,row,change,submit}=setup();try{
  mode('ITEMS');assert.equal(f.elements.amount.required,false);assert.equal(f.elements.amount.closest('label').hidden,true);assert.equal(w.getComputedStyle(f.elements.amount.closest('label')).display,'none');row('Leche',2,4000);f.querySelector('[data-add-item]').click();row('Arroz',1,9000,1);
  assert.equal(f.elements.amount.value,'17000.00');assert.equal(f.querySelector('[data-use-items-total]'),null);
  row('Arroz',1,10000,1);assert.equal(f.elements.amount.value,'18000.00');assert.ok(f.checkValidity());submit();await wait(()=>!f.isConnected);
  assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].b.products)),[{name:'Leche',quantity:2,amount:'8000.00'},{name:'Arroz',quantity:1,amount:'10000.00'}]);
  assert.equal(calls[0].b.amount,'18000.00');
 }finally{w.close();}
});
test('decimal quantities round once per line and automatically fill the total',()=>{
 const {w,f,mode,row}=setup();try{
  assert.equal(w.QoriExpenseItems.lineTotal('0.10','3'),30n);assert.equal(w.QoriExpenseItems.lineTotal('1.01','0.5'),51n);
  mode('ITEMS');row('Fruta',1.25,12.34);assert.match(f.querySelector('output').textContent,/15,43/);assert.equal(f.elements.amount.value,'15.43');
  assert.throws(()=>w.QoriExpenseItems.lineTotal('1','0'),/cantidad/);assert.throws(()=>w.QoriExpenseItems.lineTotal('0','1'),/precio/);
 }finally{w.close();}
});
test('removing and invalidating items recalculates the amount and prevents partial submission',async()=>{
 const {w,f,calls,mode,row,submit}=setup();try{
  mode('ITEMS');row('Leche',2,4000);f.querySelector('[data-add-item]').click();row('Arroz',1,10000,1);assert.equal(f.elements.amount.value,'18000.00');
  f.querySelectorAll('[data-remove-item]')[1].click();assert.equal(f.elements.amount.value,'8000.00');row('Leche',0,4000);assert.equal(f.elements.amount.value,'');assert.equal(f.checkValidity(),false);submit();await wait(()=>f.querySelector('#dialogError').textContent);assert.equal(calls.length,0);
  mode('TOTAL');assert.equal(f.elements.amount.required,true);assert.equal(f.elements.amount.readOnly,false);assert.equal(f.elements.amount.closest('label').hidden,false);assert.equal(f.checkValidity(),false);
 }finally{w.close();}
});
test('failed receipt upload locks the saved breakdown and retries only the receipt',async()=>{
 const {w,ctx,f,calls,mode,row,change,submit}=setup();try{
  change(f.elements.amount,'8000');mode('ITEMS');row('Leche',2,4000);let attempt=0;
  ctx.request=async(u,b)=>{calls.push({u,b});if(u.endsWith('/receipts')&&!attempt++)throw Error('Sin conexión');return {entry:{id:'expense'}};};
  const input=f.querySelector('[data-upload]');Object.defineProperty(input,'files',{value:[new w.File(['%PDF-1.4'],'receipt.pdf',{type:'application/pdf'})]});input.dispatchEvent(new w.Event('change'));await wait(()=>!f.querySelector('[type=submit]').disabled);
  submit();await wait(()=>f.querySelector('#dialogError').textContent.includes('ya quedó guardado'));
  assert.equal(f.querySelector('[data-price]').disabled,true);assert.equal(f.querySelector('[name=expense_mode]').disabled,true);submit();await wait(()=>!f.isConnected);
  assert.equal(calls.filter(c=>c.u==='/entries').length,1);assert.equal(calls.filter(c=>c.u.endsWith('/receipts')).length,2);
 }finally{w.close();}
});

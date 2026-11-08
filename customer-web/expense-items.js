/* A breakdown belongs to one expense; amounts sent to the API are line totals. */
(()=>{'use strict';
 const cents=value=>{if(!/^\d{1,10}(\.\d{1,2})?$/.test(value))throw Error('Escribe un valor válido, con hasta dos decimales.');const [a,b='']=value.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));};
 const decimal=n=>(n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');
 function lineTotal(price,quantity){
  if(!/^\d{1,6}(\.\d{1,3})?$/.test(quantity)||Number(quantity)<=0||Number(quantity)>100000)throw Error('La cantidad debe ser mayor que cero, con hasta tres decimales.');
  const [a,b='']=quantity.split('.'),q=BigInt(a)*1000n+BigInt(b.padEnd(3,'0')),p=cents(price),n=(p*q+500n)/1000n;
  if(p<=0n||n<=0n||n>999999999999n)throw Error('Revisa el precio y la cantidad del artículo.');return n;
 }
 function mount(form,currency){
  const host=form.querySelector('#dailyItems'),amount=form.elements.amount;
  host.innerHTML='<fieldset class="expense-mode"><legend>¿Cómo quieres registrar este gasto?</legend><label><input type="radio" name="expense_mode" value="TOTAL" checked> Solo total y motivo</label><label><input type="radio" name="expense_mode" value="ITEMS"> Artículo por artículo</label></fieldset><div data-item-detail hidden><p class="small muted">Escribe el nombre, la cantidad y el precio por unidad. El total se calcula automáticamente. Puedes incluir conceptos como transporte o propina. Qori guardará un solo gasto.</p><div data-item-rows></div><button type="button" class="secondary" data-add-item>+ Agregar artículo</button><div class="expense-reconciliation" role="status" aria-live="polite"><p>Total calculado <strong data-items-total></strong></p><p data-items-difference></p></div></div>';
  const rows=host.querySelector('[data-item-rows]'),detail=host.querySelector('[data-item-detail]'),add=host.querySelector('[data-add-item]');let frozen=false,sequence=0,wasDetailed=false,manualAmount=amount.value;
  const detailed=()=>form.elements.expense_mode.value==='ITEMS';
  const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency,minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)/100);
  const all=()=>[...rows.querySelectorAll('.expense-item')];
  function total(){return all().reduce((sum,r)=>sum+lineTotal(r.querySelector('[data-price]').value,r.querySelector('[data-quantity]').value),0n);}
  function update(){
   let sum=0n,complete=true;
   for(const r of all()){try{const n=lineTotal(r.querySelector('[data-price]').value,r.querySelector('[data-quantity]').value);sum+=n;r.querySelector('output').textContent=money(n);}catch{complete=false;r.querySelector('output').textContent='Por completar';}}
   const withinLimit=sum<=999999999999n;
   if(detailed())amount.value=complete&&withinLimit?decimal(sum):'';
   host.querySelector('[data-items-total]').textContent=money(sum)+(complete?'':' · parcial');
   const diff=host.querySelector('[data-items-difference]');diff.className=complete&&withinLimit?'expense-balanced':'expense-unbalanced';
   diff.textContent=!complete?'Completa los precios y cantidades.':!withinLimit?'El total supera el importe máximo permitido.':'Este total se guardará automáticamente como un solo gasto.';
   add.disabled=frozen||all().length>=100;
  }
  function addRow(){
   if(frozen||all().length>=100)return;const r=document.createElement('div');r.className='expense-item';r.dataset.item=++sequence;
   r.innerHTML='<label class="field expense-item-name">Artículo o concepto<input data-name maxlength="160" placeholder="Ej. Leche" required></label><label class="field">Cantidad<input data-quantity type="number" inputmode="decimal" min=".001" max="100000" step=".001" value="1" required></label><label class="field">Precio por unidad<input data-price type="number" inputmode="decimal" min=".01" max="9999999999.99" step=".01" placeholder="0" required></label><p class="expense-line-total">Subtotal <output>Por completar</output></p><button type="button" class="quiet" data-remove-item>Quitar artículo</button>';
   rows.append(r);r.oninput=update;r.querySelector('[data-remove-item]').onclick=()=>{r.remove();if(!all().length)addRow();update();};update();return r;
  }
  function disable(value){frozen=value;host.querySelectorAll('input,button').forEach(c=>c.disabled=value||(!detailed()&&detail.contains(c)));update();}
  function mode(){const active=detailed();if(active&&!wasDetailed)manualAmount=amount.value;if(!active&&wasDetailed)amount.value=manualAmount;wasDetailed=active;amount.required=!active;amount.readOnly=active;amount.closest('label').hidden=active;detail.hidden=!active;if(active&&!all().length)addRow();disable(frozen);}
  host.querySelectorAll('[name=expense_mode]').forEach(r=>r.onchange=mode);
  add.onclick=()=>{const r=addRow();r?.querySelector('[data-name]').focus();};amount.addEventListener('input',update);
  mode();
  return {disable,products(){
   if(!detailed())return [];
   const products=all().map((r,i)=>{const name=r.querySelector('[data-name]').value.trim();if(!name)throw Error('Escribe el nombre del artículo '+(i+1)+'.');return {name,quantity:Number(r.querySelector('[data-quantity]').value),amount:decimal(lineTotal(r.querySelector('[data-price]').value,r.querySelector('[data-quantity]').value))};});
   if(!products.length)throw Error('Agrega al menos un artículo.');
   const sum=total();if(sum>999999999999n)throw Error('El total supera el importe máximo permitido.');amount.value=decimal(sum);
   return products;
  }};
 }
 window.QoriExpenseItems={mount,lineTotal,decimal};
})();

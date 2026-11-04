(()=>{'use strict';
const M=window.QoriGroceryMath,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(v,c)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(v));
async function open(ctx,existing,onAdd){
 const d=ctx.dialog('Productos frecuentes','<p role="status">Buscando artículos de tus listas…</p>'),used=new Set(existing.map(i=>M.productKey(i.name,i.unit)));
 async function load(){
 try{
  const data=await ctx.request('/groceries/catalog');if(!d.isConnected)return;
  const products=data.products;
  d.querySelector('.dialog-body').innerHTML='<form id="groceryCatalogForm" class="stack"><p>Selecciona lo que hace falta en '+esc(ctx.book.name)+'. Cada producto se agrega una sola vez; después puedes ajustar su cantidad.</p><label class="field">Cómo estimar los precios<select name="pricing"><option value="last">Usar el último precio real pagado</option><option value="manual">Escribir mis precios estimados</option></select></label><p class="small muted">El último precio es una referencia histórica por unidad en '+esc(data.currency)+', no el precio actual de la tienda. Si no hay una compra confirmada, puedes dejarlo pendiente.</p><label class="field">Buscar producto<input name="search" type="search" placeholder="Arroz, jabón, leche…" autocomplete="off"></label><div class="grocery-catalog-items">'+products.map((p,index)=>{
   const already=used.has(p.key);return '<article class="grocery-catalog-item" data-product="'+index+'"><label class="check"><input type="checkbox" data-pick '+(already?'disabled':'')+'><span><strong>'+esc(p.name)+'</strong> · '+esc(p.unit)+(already?'<small>Ya está en esta lista</small>':'')+'</span></label><p class="small muted">'+(p.last_price!=null?'Último precio pagado: '+money(p.last_price,data.currency)+' por '+esc(p.unit)+' · '+esc(p.last_bought_on):'Sin precio pagado registrado')+'</p><div class="grocery-fields" data-product-fields hidden><label class="field">Cantidad<input data-quantity type="number" min=".001" max="10000" step=".001" value="'+p.suggested_quantity+'"></label><label class="field">Precio estimado por '+esc(p.unit)+'<input data-estimate type="number" min="0" max="999999999.99" step=".01" value="'+esc(p.last_price??'')+'" placeholder="Opcional"></label></div></article>';
  }).join('')+'</div><p id="catalogEmpty" class="muted" '+(products.length?'hidden':'')+'>Todavía no hay productos anteriores en este bolsillo. Guarda tu primera lista y aparecerán aquí.</p><p id="catalogNoMatches" hidden>No encontramos productos con esa búsqueda.</p><p id="dialogError" role="alert" class="error"></p><div class="grocery-catalog-footer"><span id="catalogCount" role="status">0 seleccionados</span><button class="primary" type="submit">Agregar a mi lista</button></div></form>';
  const f=d.querySelector('form'),rows=[...f.querySelectorAll('[data-product]')];
  rows.forEach(row=>{row.querySelectorAll('[data-product-fields] input').forEach(i=>i.disabled=true);row.querySelector('[data-pick]').onchange=()=>{const checked=row.querySelector('[data-pick]').checked;row.querySelector('[data-product-fields]').hidden=!checked;row.querySelectorAll('[data-product-fields] input').forEach(i=>i.disabled=!checked);d.querySelector('#catalogCount').textContent=rows.filter(r=>r.querySelector('[data-pick]').checked).length+' seleccionados';};});
  f.elements.pricing.onchange=()=>rows.forEach(row=>row.querySelector('[data-estimate]').value=f.elements.pricing.value==='last'?(products[Number(row.dataset.product)].last_price??''):'');
  f.elements.search.oninput=()=>{const q=M.productText(f.elements.search.value);rows.forEach(row=>{const p=products[Number(row.dataset.product)];row.hidden=!M.productText(p.name+' '+p.unit).includes(q);});d.querySelector('#catalogNoMatches').hidden=!products.length||rows.some(r=>!r.hidden);};
  f.onsubmit=e=>{e.preventDefault();e.stopPropagation();try{
   const chosen=rows.filter(row=>row.querySelector('[data-pick]').checked).map(row=>{const p=products[Number(row.dataset.product)];return {id:crypto.randomUUID(),name:p.name,unit:p.unit,quantity:M.qty(row.querySelector('[data-quantity]').value),estimated_price:row.querySelector('[data-estimate]').value||null,in_cart:false,actual_price:null,actual_quantity:null};});
   if(!chosen.length)throw Error('Selecciona al menos un producto.');M.normalize(chosen);onAdd(chosen);d.close();
  }catch(e){ctx.showError(e.message,d.querySelector('#dialogError'));}};
 }catch(e){if(d.isConnected){d.querySelector('.dialog-body').innerHTML='<p role="alert">'+esc(e.message)+'</p><button class="secondary">Reintentar</button>';d.querySelector('.dialog-body button').onclick=load;}}
 }
 await load();
}
window.QoriGroceryCatalog={open};
})();

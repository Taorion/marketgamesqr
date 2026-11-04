(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QoriGroceryMath=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const fail=m=>{const e=new Error(m);e.code='GROCERY_INPUT';throw e;};
 function price(v){if(v==null||v==='')return null;if(!/^\d{1,9}(\.\d{1,2})?$/.test(String(v)))fail('Usa precios positivos con hasta dos decimales.');return Math.round(Number(v)*100);}
 function qty(v){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>10000||Math.abs(n*1000-Math.round(n*1000))>.00001)fail('Usa cantidades mayores que cero con hasta tres decimales.');return n;}
 function amount(q,p){return p==null?null:Math.round(q*p);}
 function normalize(items){
  if(!Array.isArray(items)||items.length>200)fail('La lista admite hasta 200 artículos.');const ids=new Set();
  return items.map(i=>{if(!i||typeof i.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(i.id)||ids.has(i.id))fail('Cada artículo debe tener una identidad única.');ids.add(i.id);
   const name=String(i.name||'').trim(),unit=String(i.unit||'unidad').trim();if(!name||name.length>120||!unit||unit.length>30)fail('Indica el nombre y la unidad del artículo.');
   price(i.estimated_price);price(i.actual_price);
   return {id:i.id,name,unit,quantity:qty(i.quantity),estimated_price:i.estimated_price==null||i.estimated_price===''?null:String(i.estimated_price),in_cart:i.in_cart===true,actual_quantity:i.actual_quantity==null||i.actual_quantity===''?null:qty(i.actual_quantity),actual_price:i.actual_price==null||i.actual_price===''?null:String(i.actual_price)};
  });
 }
 function summary(items){
  items=normalize(items);let estimated=0,actual=0,selectedBudget=0,unknown=0,unknownSelected=0,missingActual=0;
  const rows=items.map(i=>{const p=price(i.estimated_price),ap=price(i.actual_price),q=i.actual_quantity??i.quantity,estimate=amount(i.quantity,p),spent=i.in_cart?amount(q,ap):null;
   if(estimate==null)unknown++;else estimated+=estimate;
   const comparison=i.in_cart?amount(Math.min(q,i.quantity),p):null;
   if(i.in_cart){if(p==null)unknownSelected++;else selectedBudget+=comparison;if(spent==null)missingActual++;else actual+=spent;}
   return {...i,estimated_minor:estimate,actual_minor:spent,comparison_minor:comparison,difference_minor:comparison==null||spent==null?null:comparison-spent};
  });
  for(const n of [estimated,actual,selectedBudget])if(!Number.isSafeInteger(n)||n>999999999999)fail('El importe total supera el rango de la lista.');
  return {estimated_minor:estimated,actual_minor:actual,selected_budget_minor:selectedBudget,unknown_prices:unknown,unknown_selected:unknownSelected,missing_actual:missingActual,selected_count:items.filter(i=>i.in_cart).length,difference_minor:unknownSelected||missingActual?null:selectedBudget-actual,rows};
 }
 function remaining(items){return normalize(items).flatMap(i=>{const left=i.in_cart?Math.max(0,Math.round((i.quantity-(i.actual_quantity??i.quantity))*1000)/1000):i.quantity;return left?[{...i,quantity:left,in_cart:false,actual_quantity:null,actual_price:null}]:[];});}
 return {price,qty,amount,normalize,summary,remaining};
});

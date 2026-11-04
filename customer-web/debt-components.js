(()=>{'use strict';const M=window.QoriDebtMath,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(items,value)=>Object.entries(items).map(([k,v])=>'<option value="'+k+'" '+(k===value?'selected':'')+'>'+v+'</option>').join('');
const money=(n,c)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:c,maximumFractionDigits:2}).format(n/100);
function breakdown(row,currency,title='Composición de la cuota'){
 if(!row)return '';const parts=row.breakdown||M.breakdown(row);
 return '<section class="debt-composition"><h3>'+esc(title)+'</h3><div class="debt-composition-bar" aria-hidden="true">'+parts.map(p=>'<i class="'+p.key+'" style="width:'+p.percent+'%"></i>').join('')+'</div><dl>'+parts.map(p=>'<div><dt>'+p.label+'</dt><dd>'+money(p.amount_minor,currency)+' <b>'+p.percent.toFixed(2)+' %</b></dd></div>').join('')+'</dl><p class="small muted">Porcentajes sobre el pago total, incluidos seguros y cargos. Cambian en cada cuota.</p>'+((row.charge_items||[]).map(c=>'<p class="small">'+esc(c.name)+' · '+money(c.amount_minor,currency)+'</p>').join(''))+'</section>';
}
function editor(root,initial=[],changed=()=>{}){
 const host=root.querySelector('[data-charge-editor]');if(!host)return {read:()=>[],set:()=>{}};
 const modes={FIXED:'Valor fijo mensual',BALANCE_PERCENT:'% mensual del capital pendiente',SPREAD:'Importe pendiente repartido en cuotas',FINANCED:'Ya incluido en el capital'};
 host.innerHTML='<h3>Seguros y otros cargos</h3><p class="small muted">Desglosa lo que aparece en el extracto. Los cargos que ya están en el capital no se suman otra vez.</p><div data-charge-rows></div><button type="button" class="secondary" data-charge-add>+ Agregar seguro o cargo</button>';
 const rows=host.querySelector('[data-charge-rows]');
 function add(c={}){
  if(rows.children.length>=20)return;
  const el=document.createElement('fieldset');el.className='debt-charge-row';el.dataset.id=c.id||crypto.randomUUID();
  el.innerHTML='<legend>Seguro o cargo</legend><label class="field">Concepto<input data-c="name" required maxlength="120" placeholder="Ej. vida deudor, incendio, manejo" value="'+esc(c.name||'')+'"></label><div class="debt-fields"><label class="field">Categoría<select data-c="category">'+options({INSURANCE:'Seguro',OTHER:'Otro cargo'},c.category||'INSURANCE')+'</select></label><label class="field">Cómo se cobra<select data-c="mode">'+options(modes,c.mode||'FIXED')+'</select></label><label class="field" data-c-wrap="amount"><span data-amount-label>Valor mensual</span><input data-c="amount" type="number" min="0" step=".01" required value="'+esc(c.amount||'0')+'"></label><label class="field" data-c-wrap="percent">% mensual sobre saldo<input data-c="percent" type="number" min="0" max="100" step=".000001" value="'+esc(c.percent||0)+'"></label><label class="field" data-c-wrap="months">Cuotas pendientes del cargo<input data-c="months" type="number" min="1" max="600" step="1" value="'+(c.months||1)+'"></label><label class="field" data-c-wrap="on_payoff">Si liquido antes<select data-c="on_payoff">'+options({DUE:'Pagar el saldo pendiente del cargo',WAIVE:'Deja de cobrarse (confirmado en contrato)'},c.on_payoff||'DUE')+'</select></label></div><p class="small muted" data-charge-note></p><button type="button" class="quiet" data-charge-remove>Quitar cargo</button>';
  rows.append(el);
  function visibility(){const mode=el.querySelector('[data-c=mode]').value;for(const k of ['amount','percent','months','on_payoff']){const show=k==='amount'?mode!=='BALANCE_PERCENT':k==='percent'?mode==='BALANCE_PERCENT':mode==='SPREAD';const wrap=el.querySelector('[data-c-wrap='+k+']');wrap.hidden=!show;wrap.querySelector('input,select').disabled=!show;}
   el.querySelector('[data-amount-label]').textContent=mode==='SPREAD'?'Importe que falta por pagar del cargo':mode==='FINANCED'?'Importe ya incluido en el capital':'Valor mensual';
   el.querySelector('[data-charge-note]').textContent=mode==='FINANCED'?'Informativo: ya forma parte del capital y de sus intereses; no es un cobro adicional.':mode==='SPREAD'?'Reparte solo el importe pendiente de esta prima o cargo, sin intereses adicionales. Si se renueva, actualiza el registro.':mode==='BALANCE_PERCENT'?'Se calcula sobre el capital pendiente antes de cada cuota. Usa el porcentaje de tu contrato.':'Se suma en cada cuota mientras el crédito siga vigente.';
  }visibility();el.querySelector('[data-c=mode]').addEventListener('change',()=>{visibility();changed();});el.querySelector('[data-charge-remove]').onclick=()=>{el.remove();changed();};
 }
 host.querySelector('[data-charge-add]').onclick=()=>{add();changed();};
 const read=()=>M.normalizeCharges([...rows.children].map(el=>Object.fromEntries([['id',el.dataset.id],...['name','category','mode','amount','percent','months','on_payoff'].map(k=>[k,['percent','months'].includes(k)?Number(el.querySelector('[data-c='+k+']').value):el.querySelector('[data-c='+k+']').value])])));
 const set=items=>{rows.innerHTML='';items.forEach(add);};set(initial);return {read,set};
}
window.QoriDebtComponents={editor,breakdown};})();

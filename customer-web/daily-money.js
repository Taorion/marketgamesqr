(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function open(ctx,kind){
 const income=kind==='INCOME',id=crypto.randomUUID(),today=new Intl.DateTimeFormat('en-CA',{timeZone:ctx.account.timezone||'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const d=ctx.dialog(income?'Entró dinero':'Gasté dinero','<form id="dailyMoneyForm" class="stack"><p class="daily-pocket">Bolsillo: <strong>'+esc(ctx.book.name)+'</strong> · '+esc(ctx.book.currency)+'</p><label class="field daily-amount">'+(income?'¿Cuánto recibiste?':'¿Cuánto pagaste?')+'<input name="amount" type="number" inputmode="decimal" min=".01" step=".01" required autofocus placeholder="0"></label><label class="field">'+(income?'¿De dónde vino?':'¿En qué gastaste?')+'<input name="merchant" required maxlength="160" placeholder="'+(income?'Salario, venta, arriendo…':'Almuerzo, transporte, mercado…')+'"></label>'+(!income?'<section id="dailyItems"></section>':'')+'<label class="field">Fecha<input name="occurred_at" type="date" value="'+today+'" min="2000-01-01" max="'+today+'" required></label>'+(!income?'<section class="quick-receipt" id="dailyReceipt"></section>':'')+'<details><summary>Agregar detalles (opcional)</summary><label class="field">Categoría<select name="category">'+Object.entries({otros:'Sin clasificar todavía',alimentacion:'Alimentación',supermercado:'Supermercado',transporte:'Transporte',hogar:'Hogar',salud:'Salud',educacion:'Educación',entretenimiento:'Entretenimiento',cuidado_personal:'Cuidado personal',servicios:'Servicios'}).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><label class="field">Nota<textarea name="note" maxlength="2000"></textarea></label></details><p class="small muted">Si ya estaba programado o registrado, confírmalo en su registro para contarlo una sola vez.</p><div class="row"><button class="quiet" type="button" id="dailyAgenda">'+(income?'Ver ingresos previstos':'Ver agenda de pagos')+'</button><button class="quiet" type="button" id="dailyHistory">Ver movimientos registrados</button></div><p id="dialogError" class="error" role="alert"></p><button class="primary '+(income?'daily-income':'daily-expense')+'" type="submit">'+(income?'Guardar ingreso':'Guardar gasto')+'</button></form>');
 const f=d.querySelector('form'),save=f.querySelector('[type=submit]');f.elements.amount.focus();
 const cash=window.QoriCashBoxes?.entryPicker(f,ctx,kind);
 const items=!income?window.QoriExpenseItems.mount(f,ctx.book.currency):null;
 let attachment=null,savedEntry=null,busy=false;
 const receipt=!income?window.QoriQuickReceipt.mount(d.querySelector('#dailyReceipt'),{onBusy:value=>{busy=value;save.disabled=value;},onChange:value=>{attachment=value;save.textContent=savedEntry?(value?'Reintentar comprobante':'Terminar sin comprobante'):'Guardar gasto';},onError:message=>ctx.showError(message,d.querySelector('#dialogError'))}):null;
 d.querySelector('#dailyAgenda').onclick=()=>{d.close();location.hash=income?'income':'payments';};d.querySelector('#dailyHistory').onclick=()=>{d.close();location.hash='history';};
 f.onsubmit=async e=>{
  e.preventDefault();e.stopPropagation();if(busy)return;busy=true;save.disabled=true;receipt?.disable(true);ctx.showError('',d.querySelector('#dialogError'));
  try{
   if(!savedEntry){const products=items?.products()||[],cash_box_id=cash?.value();cash?.disable(true);items?.disable(true);const result=await ctx.request('/entries',{request_id:id,kind,cash_box_id,amount:f.elements.amount.value,merchant:f.elements.merchant.value,occurred_at:f.elements.occurred_at.value,currency:ctx.book.currency,category:f.elements.category.value,note:f.elements.note.value,products});savedEntry=result.entry||{id:null};
    for(const name of ['amount','merchant','occurred_at','category','note'])f.elements[name].disabled=true;
   }
   if(attachment){save.textContent='Guardando comprobante…';await ctx.request('/entries/'+savedEntry.id+'/receipts',attachment);}
   d.close();await (ctx.refreshFinance||ctx.refresh)();
  }catch(error){ctx.showError((savedEntry?'El gasto ya quedó guardado. No se duplicará. '+(attachment?'No pudimos adjuntar el comprobante: ':''):'')+error.message,d.querySelector('#dialogError'));}
  finally{cash?.disable(!!savedEntry);items?.disable(!!savedEntry);busy=false;save.disabled=false;receipt?.disable(false);save.textContent=savedEntry?(attachment?'Reintentar comprobante':'Terminar'):(income?'Guardar ingreso':'Guardar gasto');}
 };
}
window.QoriDailyMoney={open};
})();

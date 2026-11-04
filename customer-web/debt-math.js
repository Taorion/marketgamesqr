/* Shared monthly fixed-rate amortization engine. Amounts are integer hundredths. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QoriDebtMath=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const MAX_MONTHS=600;
 function fail(message){const e=new Error(message);e.code='DEBT_INPUT';throw e;}
 function safe(n){if(!Number.isSafeInteger(n)||Math.abs(n)>Number.MAX_SAFE_INTEGER/4)fail('Importe fuera del rango de cálculo.');return n;}
 function minor(value){const text=String(value??'0');if(!/^\d{1,10}(\.\d{1,2})?$/.test(text))fail('Usa importes positivos con hasta dos decimales.');const [whole,cents='']=text.split('.');return safe(Number(whole)*100+Number(cents.padEnd(2,'0')));}
 function rate(percent,type){const n=Number(percent);if(!Number.isFinite(n)||n<0||n>1000)fail('Revisa la tasa de interés.');const r=n/100;if(type==='EA')return Math.expm1(Math.log1p(r)/12);if(type==='EM')return r;if(type==='NAMV')return r/12;fail('Indica si la tasa es efectiva anual, efectiva mensual o nominal anual mes vencido.');}
 function quota(principal,r,months){
  if(!Number.isInteger(months)||months<1||months>MAX_MONTHS)fail('El plazo debe estar entre 1 y 600 meses.');
  const raw=r===0?principal/months:principal*r/(-Math.expm1(-months*Math.log1p(r)));
  const initial=safe(Math.max(1,Math.ceil(raw-1e-9),Math.round(principal*r)+1));
  // Per-period cent rounding can leave a residual even with the analytic annuity.
  // Find the smallest upward adjustment that clears the balance within the term.
  const clears=p=>{let b=principal;for(let i=0;i<months&&b>0;i++)b=Math.max(0,b+Math.round(b*r)-p);return b===0;};
  if(clears(initial))return initial;
  let low=initial,high=initial+1;while(!clears(high))high=safe(initial+(high-initial)*2);
  while(high-low>1){const mid=Math.floor((low+high)/2);if(clears(mid))high=mid;else low=mid;}return high;
 }
const creditTypes={FREE_INVESTMENT:'Libre inversión / consumo',MORTGAGE:'Vivienda / hipoteca',VEHICLE:'Vehículo / moto',CREDIT_CARD:'Tarjeta de crédito',PAYROLL:'Libranza',EDUCATION:'Educativo / estudios',MICROCREDIT:'Microcrédito',BUSINESS:'Negocio / actividad productiva',PERSONAL:'Préstamo personal o familiar',BNPL:'Compra a cuotas',DEBT_CONSOLIDATION:'Compra de cartera / consolidación',OTHER:'Otro crédito'};
 function normalizeCharges(input=[]){
  if(!Array.isArray(input)||input.length>20)fail('Puedes desglosar hasta 20 seguros o cargos.');
  const seen=new Set();return input.map(c=>{
   if(!c||typeof c.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(c.id)||seen.has(c.id))fail('Cada cargo debe tener una identidad única.');seen.add(c.id);
   if(typeof c.name!=='string'||!c.name.trim()||c.name.length>120)fail('Indica el nombre de cada seguro o cargo.');
   if(!['INSURANCE','OTHER'].includes(c.category)||!['FIXED','BALANCE_PERCENT','SPREAD','FINANCED'].includes(c.mode))fail('Revisa el tipo de seguro o cargo.');
   const amount=String(c.amount??'0');minor(amount);
   const percent=Number(c.percent??0);if(!Number.isFinite(percent)||percent<0||percent>100)fail('El porcentaje mensual del cargo debe estar entre 0 y 100.');
   const months=Number(c.months??1);if(!Number.isInteger(months)||months<1||months>600)fail('Indica entre 1 y 600 cuotas para repartir el cargo.');
   const on_payoff=c.on_payoff||'DUE';if(!['DUE','WAIVE'].includes(on_payoff))fail('Indica qué pasa con el cargo pendiente al liquidar.');
   return {id:c.id,name:c.name.trim(),category:c.category,mode:c.mode,amount,percent,months,on_payoff};
  });
 }
 function percentages(parts){
  const total=parts.reduce((a,b)=>a+b,0);if(!total)return parts.map(()=>0);
  const raw=parts.map(v=>v/total*10000),units=raw.map(Math.floor),order=raw.map((v,i)=>({i,remainder:v-units[i]})).sort((a,b)=>b.remainder-a.remainder);
  for(let left=10000-units.reduce((a,b)=>a+b,0),i=0;i<left;i++)units[order[i%order.length].i]++;
  return units.map(v=>v/100);
 }
 function breakdown(row){
  const capital=row.principal_minor||0,interest=row.interest_minor||0,insurance=row.insurance_minor||0,other=(row.fee_minor||0)-insurance;
  const p=percentages([capital,interest,insurance,other]);
  return [{key:'principal',label:'Capital',amount_minor:capital,percent:p[0]},{key:'interest',label:'Intereses',amount_minor:interest,percent:p[1]},{key:'insurance',label:'Seguros',amount_minor:insurance,percent:p[2]},{key:'other',label:'Otros cargos',amount_minor:other,percent:p[3]}];
 }
 function settlementCharges(charges){return charges.filter(c=>c.mode==='SPREAD'&&c.on_payoff==='DUE').map(c=>({id:c.id,name:c.name,category:c.category,amount_minor:minor(c.amount)}));}
 function chargePlan(charges,balance,month,last){
  return charges.filter(c=>c.mode!=='FINANCED').map(c=>{
   let amount=0;if(c.mode==='FIXED')amount=minor(c.amount);
   if(c.mode==='BALANCE_PERCENT')amount=safe(Math.round(balance*c.percent/100));
   if(c.mode==='SPREAD'){
    const total=minor(c.amount),part=Math.ceil(total/c.months),paid=Math.min(total,(month-1)*part),left=total-paid;
    amount=last&&c.on_payoff==='DUE'?left:Math.min(left,part);
   }
   return {id:c.id,name:c.name,category:c.category,amount_minor:amount};
  });
 }
 function schedule(principal,r,payment,fee,extra=0,charges=[]){
  let balance=principal,totalInterest=0,totalFees=0,totalInsurance=0,totalPaid=0;const rows=[];
  for(let m=1;balance>0&&m<=MAX_MONTHS;m++){
   const interest=safe(Math.round(balance*r)),due=safe(balance+interest);
   const paymentPI=Math.min(safe(payment+extra),due);
   if(paymentPI<=interest)fail('La cuota no cubre el interés mensual. Aumenta la cuota o revisa la tasa.');
   const capital=paymentPI-interest,items=chargePlan(charges,balance,m,capital===balance);balance=safe(balance-capital);
   const fees=safe(fee+items.reduce((n,c)=>n+c.amount_minor,0)),insurance=safe(items.filter(c=>c.category==='INSURANCE').reduce((n,c)=>n+c.amount_minor,0));
   const amount=safe(paymentPI+fees);totalInterest=safe(totalInterest+interest);totalFees=safe(totalFees+fees);totalInsurance=safe(totalInsurance+insurance);totalPaid=safe(totalPaid+amount);
   const row={month:m,interest_minor:interest,principal_minor:capital,fee_minor:fees,insurance_minor:insurance,other_fee_minor:fees-insurance,charge_items:items,payment_minor:amount,balance_minor:balance};row.breakdown=breakdown(row);rows.push(row);
  }
  if(balance>0)fail('Con esa cuota la deuda no se paga en 600 meses. Revisa la cuota y la tasa.');
  return {rows,first_payment:rows[0]||null,months:rows.length,interest_minor:totalInterest,fees_minor:totalFees,insurance_minor:totalInsurance,total_minor:totalPaid,payment_minor:rows[0]?.payment_minor||0,principal_payment_minor:payment};
 }
 function compare(input){
  const principal=minor(input.principal);if(principal<=0)fail('Indica el capital pendiente, mayor que cero.');
  const months=Number(input.months);if(!Number.isInteger(months)||months<1||months>MAX_MONTHS)fail('El plazo debe estar entre 1 y 600 meses.');
  const r=rate(input.rate_percent,input.rate_type),fee=minor(input.monthly_fee||'0'),accrued=minor(input.accrued_interest||'0'),penalty=minor(input.prepayment_fee||'0');
  const payment=input.installment?minor(input.installment):quota(principal,r,months);
  const lump=minor(input.lump_sum||'0'),extra=minor(input.extra_monthly||'0');
  if(lump>principal)fail('El abono a capital no puede superar el capital pendiente.');
  const charges=normalizeCharges(input.charges||[]);
  const base=schedule(principal,r,payment,fee,0,charges),remaining=principal-lump;
  const term=schedule(remaining,r,payment,fee,extra,charges);
  const reduced=remaining?quota(remaining,r,base.months):0;
  const installment=schedule(remaining,r,reduced,fee,extra,charges);
  const enrich=(plan,upfront,extraCost)=>{const due=upfront===principal?settlementCharges(charges):[],settlement=safe(due.reduce((n,c)=>n+c.amount_minor,0));return {...plan,settlement_charges:due,settlement_charges_minor:settlement,upfront_minor:safe(upfront+accrued+extraCost+settlement),total_minor:safe(plan.total_minor+upfront+accrued+extraCost+settlement)};};
  const baseline=enrich(base,0,0),shorter=enrich(term,lump,lump>0?penalty:0),lower=enrich(installment,lump,lump>0?penalty:0);
  const payoff=enrich({rows:[],months:0,interest_minor:0,fees_minor:0,total_minor:0,payment_minor:0,principal_payment_minor:0},principal,penalty);
  for(const s of [shorter,lower,payoff]){s.interest_saved_minor=safe(baseline.interest_minor-s.interest_minor);s.net_saved_minor=safe(baseline.total_minor-s.total_minor);s.months_saved=baseline.months-s.months;}
  return {principal_minor:principal,charges,monthly_rate:r,effective_annual_percent:Math.expm1(12*Math.log1p(r))*100,declared_months:months,baseline,shorter,lower,payoff,
   assumptions:['Tasa fija y cuotas mensuales vencidas; no incluye compras nuevas ni mora.','El abono se aplica hoy a capital, antes del siguiente periodo completo de interés.','Los cargos mensuales terminan al liquidar; los importes repartidos pendientes se liquidan o se dejan de cobrar según la condición que indiques. Confírmala con tu entidad.','Los cargos ya incluidos en capital no se suman de nuevo. Las primas renovables requieren actualizar su importe al renovarlas.','La reducción de cuota requiere que el acreedor recalcule el plan.','Los intereses ya causados se pagan ahora en todos los escenarios; los cargos de prepago se aplican una vez al abonar o liquidar.']};
 }
 return {minor,rate,quota,schedule,compare,creditTypes,normalizeCharges,percentages,breakdown,settlementCharges};
});

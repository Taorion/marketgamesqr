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
 function schedule(principal,r,payment,fee,extra=0){
  let balance=principal,totalInterest=0,totalFees=0,totalPaid=0;const rows=[];
  for(let m=1;balance>0&&m<=MAX_MONTHS;m++){
   const interest=safe(Math.round(balance*r)),due=safe(balance+interest);
   const paymentPI=Math.min(safe(payment+extra),due);
   if(paymentPI<=interest)fail('La cuota no cubre el interés mensual. Aumenta la cuota o revisa la tasa.');
   const capital=paymentPI-interest;balance=safe(balance-capital);
   const amount=safe(paymentPI+fee);totalInterest=safe(totalInterest+interest);totalFees=safe(totalFees+fee);totalPaid=safe(totalPaid+amount);
   rows.push({month:m,interest_minor:interest,principal_minor:capital,fee_minor:fee,payment_minor:amount,balance_minor:balance});
  }
  if(balance>0)fail('Con esa cuota la deuda no se paga en 600 meses. Revisa la cuota y la tasa.');
  return {rows,months:rows.length,interest_minor:totalInterest,fees_minor:totalFees,total_minor:totalPaid,payment_minor:rows[0]?.payment_minor||0,principal_payment_minor:payment};
 }
 function compare(input){
  const principal=minor(input.principal);if(principal<=0)fail('Indica el capital pendiente, mayor que cero.');
  const months=Number(input.months);if(!Number.isInteger(months)||months<1||months>MAX_MONTHS)fail('El plazo debe estar entre 1 y 600 meses.');
  const r=rate(input.rate_percent,input.rate_type),fee=minor(input.monthly_fee||'0'),accrued=minor(input.accrued_interest||'0'),penalty=minor(input.prepayment_fee||'0');
  const payment=input.installment?minor(input.installment):quota(principal,r,months);
  const lump=minor(input.lump_sum||'0'),extra=minor(input.extra_monthly||'0');
  if(lump>principal)fail('El abono a capital no puede superar el capital pendiente.');
  const base=schedule(principal,r,payment,fee),remaining=principal-lump;
  const term=schedule(remaining,r,payment,fee,extra);
  const reduced=remaining?quota(remaining,r,base.months):0;
  const installment=schedule(remaining,r,reduced,fee,extra);
  const enrich=(plan,upfront,extraCost)=>({...plan,upfront_minor:safe(upfront+accrued+extraCost),total_minor:safe(plan.total_minor+upfront+accrued+extraCost)});
  const baseline=enrich(base,0,0),shorter=enrich(term,lump,lump>0?penalty:0),lower=enrich(installment,lump,lump>0?penalty:0);
  const payoff=enrich({rows:[],months:0,interest_minor:0,fees_minor:0,total_minor:0,payment_minor:0,principal_payment_minor:0},principal,penalty);
  for(const s of [shorter,lower,payoff]){s.interest_saved_minor=safe(baseline.interest_minor-s.interest_minor);s.net_saved_minor=safe(baseline.total_minor-s.total_minor);s.months_saved=baseline.months-s.months;}
  return {principal_minor:principal,monthly_rate:r,effective_annual_percent:Math.expm1(12*Math.log1p(r))*100,declared_months:months,baseline,shorter,lower,payoff,
   assumptions:['Tasa fija y cuotas mensuales vencidas; no incluye compras nuevas ni mora.','El abono se aplica hoy a capital, antes del siguiente periodo completo de interés.','Los cargos mensuales indicados terminan al liquidar. Confirma si tu contrato lo permite.','La reducción de cuota requiere que el acreedor recalcule el plan.','Los intereses ya causados se pagan ahora en todos los escenarios; los cargos de prepago se aplican una vez al abonar o liquidar.']};
 }
 return {minor,rate,quota,schedule,compare};
});

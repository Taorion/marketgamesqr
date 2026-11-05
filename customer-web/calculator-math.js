(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QoriCalculatorMath=api;})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const finite=n=>{if(!Number.isFinite(n)||Math.abs(n)>1e15)throw Error('El resultado supera el rango de cálculo.');return n;};
 function number(v,label,min=0,max=1e12){const n=Number(v);if(String(v).trim()===''||!Number.isFinite(n)||n<min||n>max)throw Error('Revisa '+label+'.');return n;}
 function months(v){const n=number(v,'el plazo',1,1200);if(!Number.isInteger(n))throw Error('El plazo debe ser un número entero de meses.');return n;}
 function monthly(v,type='EA'){const r=number(v,'la tasa',0,1000)/100;if(!['EA','MONTHLY','NOMINAL'].includes(type))throw Error('Selecciona el tipo de tasa.');return type==='MONTHLY'?r:type==='NOMINAL'?r/12:Math.expm1(Math.log1p(r)/12);}
 function evaluate(expression){
  const s=String(expression).replace(/×/g,'*').replace(/[÷]/g,'/').replace(/−/g,'-').replace(/,/g,'.');if(s.length>500)throw Error('La operación es demasiado larga.');
  const tokens=s.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/^%]/g)||[];
  if(tokens.join('')!==s.replace(/\s/g,''))throw Error('Usa números y operaciones válidas.');if(!tokens.length)throw Error('Escribe una operación.');let pos=0;
  function atom(){const t=tokens[pos++];let n;if(t==='('){n=sum();if(tokens[pos++]!==')')throw Error('Falta cerrar un paréntesis.');}else if(t&&/^(?:\d|\.)/.test(t))n=Number(t);else throw Error('La operación está incompleta.');while(tokens[pos]==='%'){pos++;n/=100;}return finite(n);}
  function power(){let n=atom();if(tokens[pos]==='^'){pos++;n=finite(n**unary());}return n;}
  function unary(){if(tokens[pos]==='+'){pos++;return unary();}if(tokens[pos]==='-'){pos++;return -unary();}return power();}
  function product(){let n=unary();while(['*','/'].includes(tokens[pos])){const op=tokens[pos++],b=unary();if(op==='/'&&b===0)throw Error('No se puede dividir entre cero.');n=finite(op==='*'?n*b:n/b);}return n;}
  function sum(){let n=product();while(['+','-'].includes(tokens[pos])){const op=tokens[pos++],b=product();n=finite(op==='+'?n+b:n-b);}return n;}
  const result=sum();if(pos!==tokens.length)throw Error('Revisa los paréntesis y operadores.');return finite(Number(result.toPrecision(14)));
 }
 function loan(d){
  const p=number(d.principal,'el monto',0.01),n=months(d.months),r=monthly(d.rate,d.rate_type),insurance=number(d.insurance||0,'el seguro'),extras=number(d.extras||0,'los gastos mensuales'),upfront=number(d.upfront||0,'los gastos iniciales');
  const base=r===0?p/n:p*r/(-Math.expm1(-n*Math.log1p(r))),round=n=>Math.round((n+Number.EPSILON)*100)/100,rows=[];let balance=round(p),interestTotal=0,paymentTotal=0;
  for(let i=1;i<=n;i++){const interest=round(balance*r),principal=i===n?balance:Math.min(balance,Math.max(0,round(base-interest))),payment=round(principal+interest+insurance+extras);balance=round(balance-principal);interestTotal=round(interestTotal+interest);paymentTotal=round(paymentTotal+payment);rows.push({month:i,principal,interest,insurance,extras,payment,balance});}
  return {monthly_rate:r,base_payment:round(base),payment:rows[0].payment,total:finite(round(paymentTotal+upfront)),interest:interestTotal,fees:round(n*(insurance+extras)+upfront),rows};
 }
 function future(initial,contribution,n,r){const growth=Math.exp(n*Math.log1p(r)),factor=r===0?n:Math.expm1(n*Math.log1p(r))/r;return finite(initial*growth+contribution*factor);}
 function savings(d){const initial=number(d.initial,'el ahorro inicial'),contribution=number(d.contribution,'el ahorro mensual'),n=months(d.months),r=monthly(d.rate,d.rate_type),target=number(d.target,'la meta');const projected=future(initial,contribution,n,r),factor=r===0?n:Math.expm1(n*Math.log1p(r))/r,required=Math.max(0,(target-initial*Math.exp(n*Math.log1p(r)))/factor);let when=initial>=target?0:null;
  if(when===null&&(contribution>0||initial>0&&r>0)){for(let i=1;i<=1200;i++){if(future(initial,contribution,i,r)>=target){when=i;break;}}}
  return {projected,required:finite(required),months_to_goal:when,contributed:finite(initial+contribution*n),yield:finite(projected-initial-contribution*n)};
 }
 function percentages(d){const base=number(d.amount,'el valor'),rate=number(d.percent,'el porcentaje',0,d.operation==='discount'?100:1000),part=base*rate/100;return {part,total:finite(d.operation==='discount'?base-part:base+part)};}
 function rates(d){const r=monthly(d.rate,d.rate_type);return {monthly:r*100,effective_annual:finite(Math.expm1(12*Math.log1p(r))*100),nominal_annual:r*1200};}
 function split(d){const amount=number(d.amount,'la cuenta'),people=number(d.people,'las personas',1,100000),tip=number(d.tip,'la propina',0,100);if(!Number.isInteger(people))throw Error('La cantidad de personas debe ser entera.');const cents=Math.round(amount*100*(1+tip/100)),each=Math.floor(cents/people);return {total:cents/100,each:each/100,extra_people:cents-each*people,extra_amount:(each+1)/100};}
 return {evaluate,monthly,loan,savings,percentages,rates,split,future};
});

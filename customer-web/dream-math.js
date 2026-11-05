(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QoriDreamMath=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const fail=m=>{const e=new Error(m);e.code='DREAM_INPUT';throw e;},safe=n=>{if(!Number.isSafeInteger(n)||n<0||n>99999999999999)fail('El presupuesto supera el rango permitido.');return n;};
 function minor(v){const s=String(v??'0');if(!/^\d{1,12}(\.\d{1,2})?$/.test(s))fail('Usa importes positivos con hasta dos decimales.');const [a,b='']=s.split('.');return safe(Number(a)*100+Number(b.padEnd(2,'0')));}
 const integer=(v,min,max,label)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail('Revisa '+label+'.');return n;};
 function date(v){const d=new Date(v+'T12:00:00Z');if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v||v<'2000-01-01'||v>'2200-12-31')fail('Revisa la fecha de tu meta.');return v;}
 function addMonths(day,n){date(day);integer(n,0,1200,'los meses');const [y,m,d]=day.split('-').map(Number),first=new Date(Date.UTC(y,m-1+n,1,12)),end=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0,12)).getUTCDate();first.setUTCDate(Math.min(d,end));return first.toISOString().slice(0,10);}
 function budget(type,p={}){
  if(!['TRIP','CAR','HOME','OTHER'].includes(type))fail('Elige el tipo de meta.');
  const people=integer(p.people??1,1,100,'las personas'),nights=integer(p.nights??0,0,3650,'las noches'),rooms=integer(p.rooms??1,1,100,'las habitaciones'),days=integer(p.food_days??nights+1,1,3651,'los días de comida');
  const basis=p.lodging_basis||'ROOM_NIGHT';if(!['ROOM_NIGHT','PERSON_NIGHT','TOTAL'].includes(basis))fail('Revisa cómo se cobra el alojamiento.');
  const lines=[];
  if(type==='TRIP'){
   lines.push({name:'Estadía',minor:safe(minor(p.lodging_price)*(basis==='TOTAL'?1:nights*(basis==='PERSON_NIGHT'?people:rooms)))});
   lines.push({name:'Comida',minor:safe(minor(p.food_daily)*people*days)});
   lines.push({name:'Confites y gastos libres',minor:minor(p.free_total)});
  }else lines.push({name:'Precio de la compra',minor:minor(p.base_amount)});
  if(!Array.isArray(p.items||[])||(p.items||[]).length>100)fail('Puedes agregar hasta 100 planes o gastos.');
  const ids=new Set();
  for(const i of p.items||[]){
   if(!i.id||ids.has(i.id))fail('Cada gasto necesita una identidad única.');ids.add(i.id);
   if(typeof i.name!=='string'||!i.name.trim()||i.name.length>120)fail('Escribe el nombre de cada gasto.');
   const q=Number(i.quantity??1);if(!Number.isFinite(q)||q<=0||q>10000||Math.abs(q*1000-Math.round(q*1000))>.00001)fail('Revisa las cantidades de los gastos.');
   const factors={TOTAL:1,PERSON:people,PERSON_DAY:people*days,NIGHT:nights,ROOM_NIGHT:rooms*nights};
   if(!(i.basis in factors))fail('Revisa el cálculo de cada gasto.');
   lines.push({id:i.id,name:i.name.trim(),minor:safe(Math.round(minor(i.price)*q*factors[i.basis]))});
  }
  const subtotal=lines.reduce((n,l)=>safe(n+l.minor),0),percent=Number(p.contingency_percent??0);
  if(!Number.isFinite(percent)||percent<0||percent>100||Math.abs(percent*100-Math.round(percent*100))>.00001)fail('El margen de imprevistos debe estar entre 0 y 100 %.');
  const contingency=safe(Math.round(subtotal*percent/100)),total=safe(subtotal+contingency);
  return {lines,subtotal_minor:subtotal,contingency_minor:contingency,total_minor:total,per_person_minor:Math.round(total/people)};
 }
 function projection(target,saved,monthly,today,targetDate){
  date(today);const remaining=Math.max(0,safe(target)-safe(saved));safe(monthly);
  let slots=null;if(targetDate){date(targetDate);slots=0;while(slots<1200&&addMonths(today,slots+1)<=targetDate)slots++;}
  const months=remaining===0?0:monthly>0?Math.ceil(remaining/monthly):null;
  return {remaining_minor:remaining,installments:slots,monthly_required_minor:slots>0?Math.ceil(remaining/slots):remaining===0?0:null,upfront_required_minor:slots===0?remaining:0,months_needed:months,projected_date:months!=null&&months<=1200?addMonths(today,months):null,over_horizon:months>1200};
 }
 function portfolio(goals,monthly,today){
  safe(monthly);date(today);const active=goals.filter(g=>!g.paused),remaining=new Map(active.map(g=>[g.id,Math.max(0,minor(g.target)-minor(g.recorded_amount))])),dates=new Map();
  for(const [id,amount] of remaining)if(!amount)dates.set(id,today);
  if(monthly>0)for(let month=1;month<=1200&&dates.size<active.length;month++){let available=monthly;for(const g of active){const left=remaining.get(g.id);if(!left)continue;const payment=Math.min(left,available);remaining.set(g.id,left-payment);available-=payment;if(left===payment)dates.set(g.id,addMonths(today,month));if(!available)break;}}
  return goals.map(g=>({id:g.id,projected_date:g.paused?null:dates.get(g.id)||null,paused:!!g.paused,late:!g.paused&&!!g.target_date&&(!dates.has(g.id)||dates.get(g.id)>g.target_date)}));
 }
 return {minor,budget,projection,portfolio,addMonths,date};
});

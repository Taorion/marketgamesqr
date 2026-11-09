const finance=require('./customerFinance'),{badRequest}=require('../utils/http');
const safe=n=>{if(!Number.isSafeInteger(n))throw badRequest('El importe acumulado supera el rango permitido.');return n;};
const sum=(rs,key)=>rs.reduce((s,r)=>safe(s+r[key]),0);
function rounded(n,m=1,d=1){const a=BigInt(n)*BigInt(m),b=BigInt(d);return safe(Number((a+b/2n)/b));}
function build(rows,{today,year,currency}){
 const currentMonth=today.slice(0,7),currentYear=Number(today.slice(0,4)),monthNumber=Number(today.slice(5,7)),day=Number(today.slice(8,10));
 const paid=rows.filter(r=>r.status==='PAID'&&r.kind==='EXPENSE'&&r.date<=today&&r.currency===currency),months=new Map();
 for(const r of paid){const key=r.date.slice(0,7),m=months.get(key)||{month:key,total_minor:0,flexible_minor:0,ant_minor:0,unclassified_minor:0,count:0,first_date:r.date};m.total_minor=safe(m.total_minor+r.amount_minor);m.count++;if(r.date<m.first_date)m.first_date=r.date;
  if(r.priority==='FLEXIBLE'){m.flexible_minor=safe(m.flexible_minor+r.amount_minor);if(r.is_ant_expense)m.ant_minor=safe(m.ant_minor+r.amount_minor);}else if(r.priority!=='ESSENTIAL')m.unclassified_minor=safe(m.unclassified_minor+r.amount_minor);months.set(key,m);
 }
 const all=[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)),empty=month=>({month,total_minor:0,flexible_minor:0,ant_minor:0,unclassified_minor:0,count:0}),current=months.get(currentMonth)||empty(currentMonth);
 const earliestBase=new Date(Date.UTC(currentYear,monthNumber-4,1,12)).toISOString().slice(0,7),base=all.filter(m=>m.month>=earliestBase&&m.month<currentMonth);
 const daysInMonth=new Date(Date.UTC(currentYear,monthNumber,0,12)).getUTCDate(),remainingDays=daysInMonth-day;
 let numerator=null,antNumerator=null,denominator=1,method='NO_DATA',observedDays=0;
 if(base.length){numerator=sum(base,'flexible_minor');antNumerator=sum(base,'ant_minor');denominator=base.length;method='COMPLETED_MONTHS';}
 else if(current.count){observedDays=day-Number(current.first_date.slice(8,10))+1;numerator=safe(current.flexible_minor*daysInMonth);antNumerator=safe(current.ant_minor*daysInMonth);denominator=observedDays;method='CURRENT_DAYS';}
 const estimate=(n,m=1,d=1)=>n==null?null:rounded(n,m,denominator*d),remaining=estimate(numerator,remainingDays,daysInMonth),remainingAnt=estimate(antNumerator,remainingDays,daysInMonth);
 const years=[...new Set(all.map(m=>Number(m.month.slice(0,4))))].sort((a,b)=>b-a).map(y=>{const ms=all.filter(m=>m.month.startsWith(y+'-'));return {year:y,flexible_minor:sum(ms,'flexible_minor'),ant_minor:sum(ms,'ant_minor'),unclassified_minor:sum(ms,'unclassified_minor'),recorded_months:ms.length};});
 let accumulated=0;const history=Array.from({length:12},(_,i)=>{const key=year+'-'+String(i+1).padStart(2,'0'),m=months.get(key)||empty(key);accumulated=safe(accumulated+m.flexible_minor);return {...m,has_records:months.has(key),future:key>currentMonth,cumulative_minor:accumulated};});
 const annual=years.find(y=>y.year===year)||{year,flexible_minor:0,ant_minor:0,unclassified_minor:0,recorded_months:0},thisYear=years.find(y=>y.year===currentYear)?.flexible_minor||0;
 return {today,currency,year,current,annual,history,years,lifetime:{from:all[0]?.month||null,flexible_minor:sum(all,'flexible_minor'),ant_minor:sum(all,'ant_minor'),unclassified_minor:sum(all,'unclassified_minor')},projection:{method,base_months:base.map(m=>m.month),observed_days:observedDays,remaining_days:remainingDays,limited_sample:base.length<3,monthly_average_minor:estimate(numerator),ant_monthly_average_minor:estimate(antNumerator),remaining_month_minor:remaining,remaining_ant_month_minor:remainingAnt,month_end_minor:remaining==null?null:safe(current.flexible_minor+remaining),ant_month_end_minor:remainingAnt==null?null:safe(current.ant_minor+remainingAnt),year_end_minor:remaining==null?null:safe(thisYear+remaining+estimate(numerator,12-monthNumber)),next_12_months_minor:estimate(numerator,12),ant_next_12_months_minor:estimate(antNumerator,12),next_60_months_minor:estimate(numerator,60)},excluded_currency_count:rows.filter(r=>r.status==='PAID'&&r.kind==='EXPENSE'&&r.date<=today&&r.currency!==currency).length};
}
async function overview(account,year){
 const {withTransaction}=require('../config/db'),today=finance.dateKey(new Date(),account.timezone||'America/Bogota'),currentYear=Number(today.slice(0,4));year=year||currentYear;if(year>currentYear)throw badRequest('Elige el año actual o un año anterior.');
 return withTransaction(async db=>{await db.query('set transaction isolation level repeatable read read only');const book=await require('./customerFinanceBooks').own(account,account.finance_book.id,db);const rows=await require('./customerService').movements({...account,finance_book:book},'2000-01-01',today,db);return {book,...build(rows,{today,year,currency:book.currency})};});
}
module.exports={build,overview};

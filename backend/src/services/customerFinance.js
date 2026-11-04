const { badRequest } = require('../utils/http');
const CATEGORIES = ['alimentacion','supermercado','transporte','hogar','salud','educacion','entretenimiento','cuidado_personal','servicios','otros'];
function minor(value) {
  const text = String(value ?? '0');
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw badRequest('Importe monetario inválido.');
  const negative = text.startsWith('-'), [whole, cents=''] = text.replace('-','').split('.');
  const result = Number(whole) * 100 + Number(cents.padEnd(2,'0'));
  if (!Number.isSafeInteger(result)) throw badRequest('Importe fuera de rango.');
  return negative ? -result : result;
}
const dateKey = (value, timezone) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(value));
const shiftDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n*86400000).toISOString().slice(0,10);
const monthEnd = (year, month) => new Date(Date.UTC(year,month,0,12)).getUTCDate();
function periodRange(options, timezone, now = new Date()) {
  const today = dateKey(now,timezone), anchor = options.anchor || today, type = options.period || 'month';
  const [y,m] = anchor.split('-').map(Number);
  let from, fullTo, prevFrom, prevTo;
  if(type==='day') { from=anchor;fullTo=anchor;prevFrom=shiftDays(anchor,-1);prevTo=prevFrom; }
  else if(type==='week') {
    const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
    from=shiftDays(anchor,-((weekday+6)%7));fullTo=shiftDays(from,6);prevFrom=shiftDays(from,-7);prevTo=shiftDays(from,-1);
  } else if(type==='month') {
    from=`${anchor.slice(0,7)}-01`;fullTo=`${anchor.slice(0,7)}-${monthEnd(y,m)}`;
    prevTo=shiftDays(from,-1);prevFrom=`${prevTo.slice(0,7)}-01`;
  } else if(type==='year') { from=`${y}-01-01`;fullTo=`${y}-12-31`;prevFrom=`${y-1}-01-01`;prevTo=`${y-1}-12-31`; }
  else {
    from=options.from;fullTo=options.to;
    if(!from||!fullTo||from>fullTo) throw badRequest('Selecciona un rango válido.');
    const days=Math.round((Date.parse(fullTo)-Date.parse(from))/86400000)+1;
    if(days>1096) throw badRequest('Selecciona un rango de hasta tres años.');
    prevTo=shiftDays(from,-1);prevFrom=shiftDays(from,-days);
  }
  const to = from<=today && fullTo>today ? today : fullTo;
  if(to<fullTo && type!=='custom') {
    if(type==='year') { const [,tm,td]=to.split('-').map(Number);prevTo=`${y-1}-${String(tm).padStart(2,'0')}-${String(Math.min(td,monthEnd(y-1,tm))).padStart(2,'0')}`; }
    else { const candidate=shiftDays(prevFrom, Math.round((Date.parse(to)-Date.parse(from))/86400000));prevTo=candidate<prevTo?candidate:prevTo; }
  }
  return { type,from,to,full_to:fullTo,previous_from:prevFrom,previous_to:prevTo,timezone,week_starts:'monday',partial:to!==fullTo };
}
function productsForSale(sale) {
  const list = sale.metadata?.products || sale.metadata?.line_items || [];
  return Array.isArray(list) ? list.filter(p => (p.name||p.product_name) && Number(p.quantity)>0 && p.line_total!=null).map((p,index) => ({
    key: p.inventory_product_id ? `${sale.business_id}:${p.inventory_product_id}` : `${sale.business_id}:unmatched:${sale.id}:${index}`,
    name:p.name||p.product_name, quantity:Number(p.quantity), amount_minor:minor(p.line_total),
    matched:Boolean(p.inventory_product_id)
  })) : [];
}
function salesMovement(row, timezone) {
  const paid=row.sale_status==='PAID', refunded=minor(row.refunded||0), amount=minor(row.sale_amount);
  const rawProducts=productsForSale(row);
  // Do not falsely allocate a basket discount or refund to individual products.
  const allocationExact=refunded===0 && rawProducts.reduce((n,p)=>n+p.amount_minor,0)===amount;
  return { id:`sale:${row.id}`,sale_id:row.id,source:'QORI',kind:'EXPENSE',business_id:row.business_id,merchant:row.business_name,
    amount_minor:paid?amount:0,purchase_minor:amount+refunded,refunded_minor:refunded,pending_minor:paid||row.sale_status==='VOIDED'?0:amount,
    currency:row.currency,status:row.sale_status,occurred_at:row.paid_at||row.created_at,date:dateKey(row.paid_at||row.created_at,timezone),
    category:row.category||'otros',priority:row.priority||'UNSET',expense_pattern:row.expense_pattern||'UNSET',note:row.personal_note||'',payment_method:row.payment_method,
    products:rawProducts.map(p=>({...p,amount_minor:allocationExact?p.amount_minor:null})),products_exact:allocationExact,
    discount_minor:minor(row.metadata?.benefit_application?.discount_amount||0),reported_at:row.reported_at,
    relationship_id:row.relationship_id,branch_id:row.branch_id };
}
function giftPurchaseMovement(row,timezone) {
  return {id:`gift:${row.id}`,gift_order_id:row.id,source:'QORI',kind:'EXPENSE',business_id:row.business_id,merchant:row.business_name,
    amount_minor:minor(row.amount),purchase_minor:minor(row.amount),pending_minor:0,refunded_minor:0,currency:'COP',status:'PAID',
    occurred_at:row.paid_at,date:dateKey(row.paid_at,timezone),category:'otros',priority:'UNSET',note:`Giftcard para ${row.recipient_name}`,
    payment_method:row.payment_method,products:[],products_exact:false};
}
function manualMovement(row,timezone) {
  return { id:`manual:${row.id}`,entry_id:row.id,source:'MANUAL',kind:row.kind,merchant:row.merchant,amount_minor:minor(row.amount),
    purchase_minor:minor(row.amount),pending_minor:0,refunded_minor:0,currency:row.currency,status:'PAID',occurred_at:row.occurred_at,
    date:dateKey(row.occurred_at,timezone),category:row.category,priority:row.priority,expense_pattern:row.expense_pattern||'UNSET',note:row.note,payment_method:row.payment_method,
    tags:row.tags,receipts:row.receipts||[],splits:(row.splits||[]).map(s=>({...s,amount_minor:minor(s.amount)})),
    products:(row.products||[]).map((p,i)=>({key:`manual:${row.id}:${i}`,name:p.name,quantity:p.quantity,amount_minor:minor(p.amount),matched:false})),products_exact:true };
}
const inRange = (r,from,to) => r.date>=from && r.date<=to;
function summarize(movements, range, currency, budgets=[], dismissals=[]) {
  const all=movements.filter(m=>m.currency===currency), current=all.filter(r=>inRange(r,range.from,range.to));
  const paid=current.filter(r=>r.status==='PAID' && r.kind==='EXPENSE');
  const previous=all.filter(r=>r.status==='PAID' && r.kind==='EXPENSE' && inRange(r,range.previous_from,range.previous_to));
  const sum=rows=>rows.reduce((n,r)=>n+r.amount_minor,0), total=sum(paid), prior=sum(previous);
  const categories=new Map(),merchants=new Map(),products=new Map(),timeline=new Map(),weekdays=new Map();
  for(const row of paid) {
    for(const split of row.splits?.length ? row.splits : [{category:row.category,amount_minor:row.amount_minor}]) {
      const value=categories.get(split.category)||{key:split.category,amount_minor:0,count:0};value.amount_minor+=split.amount_minor;value.count++;categories.set(split.category,value);
    }
    const merchantKey=row.business_id||`manual:${row.merchant.trim().toLowerCase()}`;
    const merchant=merchants.get(merchantKey)||{key:merchantKey,name:row.merchant,count:0,amount_minor:0,last_date:row.date};
    merchant.count++;merchant.amount_minor+=row.amount_minor;merchant.last_date=merchant.last_date>row.date?merchant.last_date:row.date;merchants.set(merchantKey,merchant);
    timeline.set(row.date,(timeline.get(row.date)||0)+row.amount_minor);
    const weekday=new Date(`${row.date}T12:00:00Z`).getUTCDay();weekdays.set(weekday,(weekdays.get(weekday)||0)+row.amount_minor);
    const seen=new Set();
    for(const p of row.products) {
      const product=products.get(p.key)||{key:p.key,name:p.name,merchant:row.merchant,occasions:0,quantity:0,amount_minor:0,amount_known:true,matched:p.matched};
      product.quantity+=p.quantity;if(!seen.has(p.key))product.occasions++;
      if(p.amount_minor===null)product.amount_known=false;else product.amount_minor+=p.amount_minor;
      seen.add(p.key);products.set(p.key,product);
    }
  }
  const budgetProgress=budgets.filter(b=>b.currency===currency).map(b=>{
    const period=periodRange({period:b.period,anchor:range.to},range.timezone);
    const applicable=all.filter(r=>r.status==='PAID'&&r.kind==='EXPENSE'&&inRange(r,period.from,period.to));
    const spent=applicable.reduce((n,r)=>n+(b.category==='ALL'?r.amount_minor:(r.splits?.length?r.splits.filter(s=>s.category===b.category).reduce((t,s)=>t+s.amount_minor,0):r.category===b.category?r.amount_minor:0)),0);
    const limit=minor(b.amount);return {...b,amount_minor:limit,spent_minor:spent,remaining_minor:limit-spent,percent:Math.round(spent/limit*100),range:period};
  });
  const insights=[];
  const add=(key,title,description,filter)=>{const id=`${range.from}:${range.to}:${currency}:${key}`;if(!dismissals.includes(id))insights.push({id,title,description,filter,from:range.from,to:range.to});};
  if(prior>0) add('change','Tu gasto frente al periodo anterior',`${total<prior?'Disminuyó':'Aumentó'} ${Math.abs(Math.round((total-prior)/prior*100))} %. Comparación de gastos registrados.`,{});
  const frequent=[...merchants.values()].sort((a,b)=>b.count-a.count)[0];
  if(frequent?.count>=2) add('frequent',`Has comprado ${frequent.count} veces en ${frequent.name}`,'Son compras registradas; no necesariamente visitas distintas.',{merchant:frequent.name});
  for(const b of budgetProgress.filter(b=>b.percent>=b.threshold)) add(`budget:${b.id}`,`Has utilizado ${b.percent} % de tu presupuesto`,`Presupuesto de ${b.range.from} a ${b.range.to}. Revisa los movimientos de ese periodo.`,{category:b.category==='ALL'?undefined:b.category,from:b.range.from,to:b.range.to});
  // An amount alone cannot determine whether a purchase is discretionary.
  const flexible=paid.filter(r=>r.priority==='FLEXIBLE');
  if(flexible.length>=3) add('flexible','Revisa tus gastos flexibles',`${flexible.length} compras clasificadas por ti como flexibles. Puedes elegir cuáles reducir.`,{priority:'FLEXIBLE'});
  return {range,currency,total_minor:total,previous_minor:prior,change_minor:total-prior,change_percent:prior?Math.round((total-prior)/prior*100):null,
    purchases:paid.length,average_minor:paid.length?Math.round(total/paid.length):0,income_minor:sum(current.filter(r=>r.kind==='INCOME')),
    pending_minor:current.reduce((n,r)=>n+r.pending_minor,0),refunded_minor:current.reduce((n,r)=>n+r.refunded_minor,0),
    discount_minor:paid.reduce((n,r)=>n+(r.discount_minor||0),0),
    sources:['QORI','MANUAL'].map(source=>({source,count:paid.filter(r=>r.source===source).length,amount_minor:sum(paid.filter(r=>r.source===source))})),
    categories:[...categories.values()].sort((a,b)=>b.amount_minor-a.amount_minor).map(c=>({...c,share:total?Math.round(c.amount_minor/total*100):0})),
    merchants:[...merchants.values()].sort((a,b)=>b.amount_minor-a.amount_minor).map(m=>({...m,average_minor:Math.round(m.amount_minor/m.count)})),
    products:[...products.values()].sort((a,b)=>b.occasions-a.occasions),product_coverage:{with_detail:paid.filter(r=>r.products.length).length,total:paid.length},
    timeline:[...timeline].sort(([a],[b])=>a.localeCompare(b)).map(([date,amount_minor])=>({date,amount_minor})),
    weekdays:[...weekdays].map(([day,amount_minor])=>({day,amount_minor})),budgets:budgetProgress,insights,
    movements:current.sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at)),disclaimer:'Gastos registrados. No representa tu saldo bancario.'};
}
module.exports={CATEGORIES,minor,dateKey,periodRange,salesMovement,manualMovement,giftPurchaseMovement,summarize};

const {badRequest}=require('../utils/http');
const finance=require('./customerFinance'),svc=require('./customerService');
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const amount=r=>r.status==='PAID'?r.amount_minor:r.pending_minor||r.purchase_minor||0;
function filterSort(rows,d){
 if(d.from&&d.to&&d.from>d.to)throw badRequest('La fecha inicial debe ser anterior a la final.');
 const min=d.min_amount?finance.minor(d.min_amount):null,max=d.max_amount?finance.minor(d.max_amount):null;
 if(min!=null&&max!=null&&min>max)throw badRequest('El importe mínimo no puede superar al máximo.');
 const term=normalize(d.search).trim();
 const filtered=rows.filter(r=>(!d.currency||r.currency===d.currency)&&(!d.from||r.date>=d.from)&&(!d.to||r.date<=d.to)
  &&(!term||normalize([r.merchant,r.note,r.payment_method,...(r.products||[]).map(p=>p.name)].join(' ')).includes(term))
  &&['source','kind','status','priority','expense_pattern','payment_method'].every(k=>!d[k]||(r[k]||'UNSET')===d[k])
  &&(!d.category||r.category===d.category||r.splits?.some(s=>s.category===d.category))&&(min==null||amount(r)>=min)&&(max==null||amount(r)<=max));
 const comparators={date_desc:(a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at),date_asc:(a,b)=>new Date(a.occurred_at)-new Date(b.occurred_at),name_asc:(a,b)=>a.merchant.localeCompare(b.merchant,'es',{sensitivity:'base'}),name_desc:(a,b)=>b.merchant.localeCompare(a.merchant,'es',{sensitivity:'base'}),amount_asc:(a,b)=>amount(a)-amount(b),amount_desc:(a,b)=>amount(b)-amount(a)};
 return filtered.sort((a,b)=>(comparators[d.sort]||comparators.date_desc)(a,b)||a.id.localeCompare(b.id));
}
async function list(a,d){
 const rows=await svc.movements(a,d.from||'1900-01-01',d.to||'9999-12-31');
 const filtered=filterSort(rows,d),totals={income_minor:0,expense_minor:0,pending_minor:0};
 for(const r of filtered){if(r.status==='PAID')totals[r.kind==='INCOME'?'income_minor':'expense_minor']+=r.amount_minor;else if(r.status==='PENDING')totals.pending_minor+=r.pending_minor||0;}
 for(const v of Object.values(totals))if(!Number.isSafeInteger(v))throw badRequest('El total supera el rango de cálculo.');
 return {movements:filtered.slice(d.offset,d.offset+d.limit),total:filtered.length,offset:d.offset,next_offset:d.offset+d.limit<filtered.length?d.offset+d.limit:null,
  currency:d.currency,totals,payment_methods:[...new Set(rows.filter(r=>r.currency===d.currency).map(r=>r.payment_method).filter(Boolean))].sort(),book_id:a.finance_book.id};
}
module.exports={list,filterSort,amount};

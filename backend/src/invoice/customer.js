const {query,withTransaction}=require('../config/db'),{seal,unseal,hash,fault}=require('./config');
const svc=require('./service'),{CATEGORIES,minor}=require('../services/customerFinance');
const rows=async(db,sql,args=[])=> (await db.query(sql,args)).rows;
async function verified(account,db={query}) {
 const valid=(await rows(db,`select i.id from invoice_identity_attestations i join customer_accounts a on a.id=i.customer_id
 where i.customer_id=$1 and i.revoked_at is null and i.expires_at>now() and a.is_active and not a.document_review_required limit 1`,[account.id]))[0];
 if(!valid)throw fault(403,'VERIFIED_IDENTITY_REQUIRED');
}
async function identityState(account) {
 return {verification_available:false,mode:'SANDBOX_FIXTURES_ONLY',identifiers:await rows({query},
  'select id,country,document_type,method,verified_at,expires_at,revoked_at from invoice_identity_attestations where customer_id=$1 order by verified_at desc',[account.id]),
  requests:await rows({query},"select id,kind,state,created_at from invoice_requests where customer_id=$1 and kind in ('IDENTITY_REVIEW','IDENTITY_CHANGE') order by created_at desc limit 20",[account.id])};
}
async function requestReview(account,data) {
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  if(data.document_id)await svc.document(account,data.document_id,db);
  if((await rows(db,"select count(*)::int n from invoice_requests where customer_id=$1 and state in ('PENDING','REVIEW')",[account.id]))[0].n>=5)throw fault(429,'REQUEST_LIMIT');
  const id=require('node:crypto').randomUUID();
  await db.query('insert into invoice_requests(id,customer_id,kind,document_id,payload_box) values($1,$2,$3,$4,$5)',[id,account.id,data.kind,data.document_id||null,seal(data,id)]);
  if(data.kind==='IDENTITY_CHANGE')await db.query('update invoice_consents set revoked_at=coalesce(revoked_at,now()) where customer_id=$1',[account.id]);
  await db.query("insert into invoice_events(event_type,actor_customer_id,object_id) values('PRIVACY_REQUESTED',$1,$2)",[account.id,id]);
  return {request_id:id,state:'PENDING',verification_granted:false};
 });
}
async function privateDocument(account,id,db={query}) {
 await verified(account,db);
 const d=await svc.document(account,id,db);
 const proof=(await rows(db,`select i.id from invoice_consents c join invoice_identity_attestations i on i.id=c.identity_id
 where c.id=$1 and i.customer_id=$2 and i.revoked_at is null and i.expires_at>now()`,[d.consent_id,account.id]))[0];
 if(!proof)throw fault(403,'VERIFIED_IDENTITY_REQUIRED');return d;
}
async function detail(account,id) {
 const row=await privateDocument(account,id),d=svc.readable(row);
 const overrides=await rows({query},'select line_id,original_value,normalized_value,user_override,extraction_method,confidence,revision from invoice_overrides where document_id=$1 and customer_id=$2',[id,account.id]);
 for(const line of d.lines){const o=overrides.find(o=>o.line_id===line.id);if(o){line.category=o.user_override;line.category_trace=o;}}
 await query("insert into invoice_events(event_type,actor_customer_id,object_id) values('DOCUMENT_READ',$1,$2)",[account.id,id]);
 return {document:d};
}
async function override(account,id,lineId,data) {
 if(!CATEGORIES.includes(data.category))throw fault(400,'INVALID_CATEGORY');
 return withTransaction(async db=>{
  await db.query('select id from customer_accounts where id=$1 for update',[account.id]);
  const row=await privateDocument(account,id,db),doc=svc.readable(row),line=doc.lines.find(l=>l.id===lineId);
  if(!line)throw fault(404,'NOT_FOUND');
  const old=(await rows(db,'select * from invoice_overrides where document_id=$1 and line_id=$2 for update',[id,lineId]))[0];
  if((old?.revision||0)!==data.revision)throw fault(409,'REVISION_CONFLICT');
  await db.query(`insert into invoice_overrides(customer_id,document_id,line_id,original_value,normalized_value,user_override)
  values($1,$2,$3,null,$4,$5) on conflict(document_id,line_id) do update set user_override=excluded.user_override,revision=invoice_overrides.revision+1,updated_at=now()`,
  [account.id,id,lineId,line.category,data.category]);
  await db.query(`insert into invoice_events(event_type,actor_customer_id,object_id,details) values('CATEGORY_OVERRIDDEN',$1,$2,$3::jsonb)`,
  [account.id,id,JSON.stringify({line_id:lineId,old_category:old?.user_override||line.category,new_category:data.category,revision:data.revision+1})]);
  return {ok:true,revision:data.revision+1};
 });
}
// Largest remainder allocation: exact integer minor units; never mutates fiscal values.
function allocate(total,weights) {
 if(!weights.length)return [];
 const sum=weights.reduce((a,n)=>a+BigInt(n),0n);
 if(sum===0n)return weights.map((_,i)=>i===0?total:0);
 const parts=weights.map((w,i)=>({i,n:BigInt(total)*BigInt(w)/sum,rest:BigInt(total)*BigInt(w)%sum}));
 let left=BigInt(total)-parts.reduce((a,p)=>a+p.n,0n);
 for(const p of [...parts].sort((a,b)=>a.rest===b.rest?a.i-b.i:a.rest>b.rest?-1:1)){if(left--<=0n)break;p.n++;}
 return parts.map(p=>Number(p.n));
}
async function source(account,filters={}) {
 await verified(account);
 const list=await rows({query},`select d.*,r.entry_id,e.amount linked_amount,e.currency linked_currency,e.book_id linked_book,e.deleted_at entry_deleted
 from invoice_documents d join invoice_consents c on c.id=d.consent_id
 join invoice_identity_attestations i on i.id=c.identity_id
 left join invoice_reconciliations r on r.document_id=d.id left join customer_entries e on e.id=r.entry_id
 where d.customer_id=$1 and d.content_box is not null and i.revoked_at is null and i.expires_at>now()
 and ($2::date is null or d.issued_on>=$2::date) and ($3::date is null or d.issued_on<=$3::date)
 and ($4::uuid is null or d.book_id=$4) order by d.created_at desc,d.id limit 5001`,
 [account.id,filters.from||null,filters.to||null,filters.book_id||null]);
 if(list.length>5000)throw fault(422,'NARROW_DATE_RANGE');
 const overrides=await rows({query},'select * from invoice_overrides where customer_id=$1 and document_id=any($2::uuid[])',[account.id,list.map(r=>r.id)]);
 let docs=list.map(r=>{
  const d=svc.readable(r);for(const line of d.lines){const o=overrides.find(o=>o.document_id===d.id&&o.line_id===line.id);if(o){line.category=o.user_override;line.category_trace={...o,document_id:undefined,customer_id:undefined};}}
  d.linked_payment_minor=r.entry_id&&!r.entry_deleted&&r.linked_currency===d.currency&&r.linked_book===d.book_id&&minor(r.linked_amount)===d.totals.payable_minor?minor(r.linked_amount):0;
  return d;
 });
 const q=(filters.search||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(q)docs=docs.filter(d=>(d.number+' '+d.uuid+' '+d.seller.name+' '+d.lines.map(l=>l.name+' '+(l.sku||'')).join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
 if(filters.type)docs=docs.filter(d=>d.type===filters.type);
 return docs;
}
async function list(account,filters) {
 const docs=await source(account,filters),offset=filters.offset||0;
 return {documents:docs.slice(offset,offset+30),total:docs.length,next_offset:offset+30<docs.length?offset+30:null};
}
async function summary(account,filters={}) {
 const docs=await source(account,filters),currencies={};
 for(const d of docs) {
  const c=currencies[d.currency]||={currency:d.currency,purchases_minor:0,credit_purchases_minor:0,linked_payments_minor:0,tax_minor:0,discount_minor:0,unmatched_notes:0,periods:{},merchants:{},categories:{},products:{}};
  if(d.type!=='Invoice'&&!d.related_document_id){c.unmatched_notes++;continue;}
  const sign=d.type==='CreditNote'?-1:1,total=sign*d.totals.inclusive_minor;
  c.purchases_minor+=total;c.linked_payments_minor+=d.linked_payment_minor;
  if(d.type==='Invoice'&&d.credit_declared)c.credit_purchases_minor+=total;
  c.tax_minor+=sign*d.totals.tax_minor;
  const lineDiscounts=d.lines.reduce((n,l)=>n+l.adjustments.filter(a=>!a.charge).reduce((s,a)=>s+a.amount_minor,0),0);
  c.discount_minor+=sign*(d.totals.discount_minor+lineDiscounts);
  const period=d.issued_on.slice(0,filters.period==='year'?4:filters.period==='day'?10:7);
  c.periods[period]=(c.periods[period]||0)+total;
  c.merchants[d.seller.id]||={name:d.seller.name,amount_minor:0};c.merchants[d.seller.id].amount_minor+=total;
  const weights=d.lines.map(l=>l.net_minor),discount=allocate(d.totals.discount_minor,weights),charge=allocate(d.totals.charge_minor,weights);
  const explicitTax=d.lines.reduce((n,l)=>n+l.taxes.reduce((s,t)=>s+t.amount_minor,0),0);
  const tax=explicitTax===d.totals.tax_minor?d.lines.map(l=>l.taxes.reduce((s,t)=>s+t.amount_minor,0)):allocate(d.totals.tax_minor,weights);
  d.lines.forEach((l,i)=>{
   const amount=sign*(l.net_minor-discount[i]+charge[i]+tax[i]),category=l.category||'sin_clasificar';
   c.categories[category]=(c.categories[category]||0)+amount;
   if(l.sku&&l.unit&&d.type==='Invoice'){
    const k=[d.seller.id,l.sku,l.unit,l.base_quantity].join('|');
    c.products[k]||={sku:l.sku,name:l.name,unit:l.unit,base_quantity:l.base_quantity,observations:[]};
    c.products[k].observations.push({date:d.issued_on,unit_price:l.unit_price});
   }
  });
 }
 return {currencies:Object.values(currencies),payment_label:'Pagos vinculados a gastos registrados; no verificación bancaria',
  category_allocation:'Distribución analítica de descuentos, cargos e impuestos documentales; no altera XML',
  note_policy:'Las notas sin factura relacionada no ajustan totales; fechas corresponden al documento',
  total_documents:docs.length};
}
async function notices(account) {await verified(account);return {items:await rows({query},`select n.id,n.document_id,n.created_at,n.read_at
 from invoice_notices n join invoice_documents d on d.id=n.document_id join invoice_consents c on c.id=d.consent_id join invoice_identity_attestations i on i.id=c.identity_id
 where n.customer_id=$1 and i.revoked_at is null and i.expires_at>now() order by n.created_at desc limit 100`,[account.id])};}
async function markNotice(account,id) {
 const n=(await rows({query},'select document_id from invoice_notices where id=$1 and customer_id=$2',[id,account.id]))[0];
 if(!n)throw fault(404,'NOT_FOUND');await privateDocument(account,n.document_id);
 await query('update invoice_notices set read_at=coalesce(read_at,now()) where id=$1 and customer_id=$2',[id,account.id]);return {ok:true};
}
async function preference(account,enabled) {
 await query("update customer_accounts set preferences=jsonb_set(preferences,'{notifications}',coalesce(preferences->'notifications','{}'::jsonb)||jsonb_build_object('invoices', $2::boolean)) where id=$1",[account.id,enabled]);
 return {in_app:true,push_enabled:false,push_requested:enabled,reason:'PUSH_TRANSPORT_NOT_ENABLED_IN_SANDBOX'};
}
module.exports={verified,identityState,requestReview,privateDocument,detail,override,allocate,list,summary,notices,markNotice,preference};

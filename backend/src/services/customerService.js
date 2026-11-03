const QRCode = require('qrcode');
const { query, withTransaction } = require('../config/db');
const { badRequest, notFound, forbidden } = require('../utils/http');
const { env } = require('../config/env');
const finance = require('./customerFinance');
const stamps = require('./stampCardService');
const normalizeDocument = stamps.normalizeDocument;
const saleSql = `select s.*,b.name business_name,r.id relationship_id,n.category,n.priority,n.note personal_note,n.reported_at,
  coalesce((select sum(a.amount) from customer_sale_adjustments a where a.sale_id=s.id),0) refunded
  from business_sales s left join customer_relationships r on r.business_id=s.business_id and r.customer_id=$1
    and r.document_key=regexp_replace(lower(s.customer_document_id),'[^a-z0-9]','','g')
    and r.state='ACCEPTED' and (r.include_history or s.created_at>=r.accepted_at)
  join businesses b on b.id=s.business_id
  left join customer_sale_notes n on n.customer_id=$1 and n.sale_id=s.id
  where ((r.customer_id=$1 and not exists(select 1 from customer_sale_deliveries exclusive where exclusive.sale_id=s.id and exclusive.customer_id<>$1)) or exists(select 1 from customer_sale_deliveries sd join customer_invitations si on si.id=sd.invitation_id and si.state='ACCEPTED' where sd.sale_id=s.id and sd.customer_id=$1) or exists(select 1 from customer_product_gift_orders pg where pg.sale_id=s.id and pg.buyer_id=$1 and pg.state='ISSUED'))`;
async function ownSale(customerId,saleId,db={query}) {
  const row=(await db.query(`${saleSql} and s.id=$2`,[customerId,saleId])).rows[0];
  if(!row) throw notFound('Compra no encontrada.');return row;
}
async function movements(account,from,to,db={query}) {
  const sales=await db.query(`${saleSql} and (coalesce(s.paid_at,s.created_at) at time zone $2)::date between $3::date and $4::date`,[account.id,account.timezone,from,to]);
  const manual=await db.query(`select e.*,
    coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'filename',r.filename,'mime_type',r.mime_type)) from customer_receipts r where r.entry_id=e.id and r.customer_id=$1),'[]') receipts
    from customer_entries e where e.customer_id=$1 and e.deleted_at is null
    and (e.occurred_at at time zone $2)::date between $3::date and $4::date
    and (e.linked_sale_id is null or not exists(${saleSql} and s.id=e.linked_sale_id))`,[account.id,account.timezone,from,to]);
  const gifts=await db.query(`select o.*,b.name business_name from customer_gift_orders o join businesses b on b.id=o.business_id
    where o.buyer_id=$1 and o.state='ISSUED' and (o.paid_at at time zone $2)::date between $3::date and $4::date`,[account.id,account.timezone,from,to]);
  return [...sales.rows.map(r=>finance.salesMovement(r,account.timezone)),...manual.rows.map(r=>finance.manualMovement(r,account.timezone)),...gifts.rows.map(r=>finance.giftPurchaseMovement(r,account.timezone))];
}
async function dashboard(account,options) {
  const range=finance.periodRange(options,account.timezone);
  const earliest=[range.previous_from,`${range.to.slice(0,7)}-01`,finance.periodRange({period:'week',anchor:range.to},account.timezone).from].sort()[0];
  return withTransaction(async db=>{
    await db.query('set transaction isolation level repeatable read read only');
    const rows=await movements(account,earliest,range.to,db);
    const budgets=(await db.query('select * from customer_budgets where customer_id=$1',[account.id])).rows;
    const dismissals=(await db.query('select insight_key from customer_insight_dismissals where customer_id=$1',[account.id])).rows.map(r=>r.insight_key);
    return finance.summarize(rows,range,options.currency||account.currency,budgets,dismissals);
  });
}
async function relationships(customerId) {
  return {relationships:(await query(`select r.id,r.state,r.include_history,r.accepted_at,r.expires_at,r.created_at,b.id business_id,b.name,
    right(r.document_key,4) document_suffix,
    (select count(*)::int from business_sales s where s.business_id=r.business_id and regexp_replace(lower(s.customer_document_id),'[^a-z0-9]','','g')=r.document_key) history_count
    from customer_relationships r join businesses b on b.id=r.business_id where r.customer_id=$1 order by r.created_at desc`,[customerId])).rows};
}
async function proposeRelationship(user,data,{client}={}) {
  if(!user.business_id) throw forbidden('Selecciona una cuenta empresarial.');
  const document=normalizeDocument(data.document_id);
  if(document.length<3) throw badRequest('Documento inválido.');
  return (client?fn=>fn(client):withTransaction)(async db=>{
    const buyer=(await db.query('select id,full_name from customer_accounts where public_id=$1',[data.public_id])).rows[0];
    if(!buyer) throw notFound('Identificación Qori no encontrada.');
    if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[buyer.id,user.business_id])).rowCount)throw forbidden('Este comprador no recibe solicitudes de este negocio.');
    // The operator verifies the document in person; the buyer must separately consent.
    // A Qori identity can connect before the first purchase or local enrollment.
    // Verifying the document and the buyer's explicit acceptance still apply.
    const result=await db.query(`insert into customer_relationships(customer_id,business_id,document_key,proposed_by)
      values($1,$2,$3,$4) on conflict(customer_id,business_id,document_key) do update
      set state=case when customer_relationships.state='ACCEPTED' then 'ACCEPTED' else 'PENDING' end,
      proposed_by=excluded.proposed_by,expires_at=now()+interval '1 day' returning id,state`,[buyer.id,user.business_id,document,user.id]);
    return {relationship:result.rows[0],buyer_name:buyer.full_name||'Comprador Qori'};
  });
}
async function decideRelationship(customerId,id,data,{client}={}) {
  return (client?fn=>fn(client):withTransaction)(async db=>{
    const r=(await db.query('select * from customer_relationships where id=$1 and customer_id=$2 for update',[id,customerId])).rows[0];
    if(!r) throw notFound();
    if(data.action==='REVOKE') {
      await db.query("update customer_relationships set state='REVOKED' where id=$1",[id]);return {ok:true};
    }
    if(r.state!=='PENDING'||new Date(r.expires_at)<=new Date()) throw badRequest('La solicitud ya no está pendiente o venció.');
    if(data.action==='ACCEPT') {
      await db.query('select pg_advisory_xact_lock(hashtext($1))',[`relationship:${r.business_id}:${r.document_key}`]);
      const collision=await db.query("select id from customer_relationships where business_id=$1 and document_key=$2 and state='ACCEPTED'",[r.business_id,r.document_key]);
      if(collision.rowCount) throw badRequest('Esta relación ya tiene una cuenta vinculada. Solicita revisión al negocio.');
    }
    await db.query('update customer_relationships set state=$2,accepted_at=case when $2=\'ACCEPTED\' then now() else null end,include_history=$3 where id=$1',[id,data.action==='ACCEPT'?'ACCEPTED':'REJECTED',data.include_history]);
    return {ok:true};
  });
}
async function saveEntry(customerId,data,id) {
  if(data.occurred_at.length===10) data={...data,occurred_at:(await query("select $1::date::timestamp at time zone timezone as at from customer_accounts where id=$2",[data.occurred_at,customerId])).rows[0].at.toISOString()};
  const values=[customerId,data.kind,data.amount,data.currency,data.occurred_at,data.merchant,data.category,data.priority,data.note,data.payment_method,JSON.stringify(data.products),JSON.stringify(data.splits),JSON.stringify(data.tags)];
  if(data.splits.length && data.splits.reduce((n,s)=>n+finance.minor(s.amount),0)!==finance.minor(data.amount)) throw badRequest('La distribución no suma el total.');
  if(data.products.length && data.products.reduce((n,p)=>n+finance.minor(p.amount),0)!==finance.minor(data.amount)) throw badRequest('Los productos no suman el total.');
  let result;
  if(id) result=await query(`update customer_entries set kind=$2,amount=$3,currency=$4,occurred_at=$5,merchant=$6,category=$7,priority=$8,note=$9,payment_method=$10,
    products=$11::jsonb,splits=$12::jsonb,tags=$13::jsonb,updated_at=now() where customer_id=$1 and id=$14 and deleted_at is null and linked_sale_id is null returning *`,[...values,id]);
  else result=await query(`insert into customer_entries(customer_id,kind,amount,currency,occurred_at,merchant,category,priority,note,payment_method,products,splits,tags,request_id)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14)
    on conflict(customer_id,request_id) do update set request_id=excluded.request_id returning *`,[...values,data.request_id]);
  if(!result.rowCount) throw notFound('Gasto no editable o no encontrado.');return {entry:result.rows[0]};
}
async function mergeEntry(customerId,entryId,saleId) {
  return withTransaction(async db=>{
    const sale=await ownSale(customerId,saleId,db);
    const entry=(await db.query('select * from customer_entries where id=$1 and customer_id=$2 and deleted_at is null for update',[entryId,customerId])).rows[0];
    if(!entry||entry.kind!=='EXPENSE')throw notFound('Gasto no encontrado.');
    if(entry.currency!==sale.currency)throw badRequest('Las monedas no coinciden.');
    if(entry.linked_sale_id===saleId)return {ok:true,already_linked:true};
    if(entry.linked_sale_id&&entry.linked_sale_id!==saleId)throw badRequest('El gasto ya está vinculado.');
    await db.query('update customer_entries set linked_sale_id=$3,updated_at=now() where id=$1 and customer_id=$2',[entryId,customerId,saleId]);
    await db.query(`insert into customer_sale_notes(customer_id,sale_id,category,priority,note) values($1,$2,$3,$4,$5)
      on conflict(customer_id,sale_id) do update set category=excluded.category,priority=excluded.priority,
      note=case when customer_sale_notes.note='' then excluded.note else customer_sale_notes.note || E'\n' || excluded.note end`,[customerId,saleId,entry.category,entry.priority,entry.note]);
    return {ok:true};
  });
}
async function wallet(customerId) {
  const members=(await query(`select m.id,m.public_token,b.name business_name,p.name program_name from stamp_members m
    join customer_relationships r on r.business_id=m.business_id and r.document_key=m.document_key and r.state='ACCEPTED'
    join businesses b on b.id=m.business_id join stamp_programs p on p.id=m.program_id
    where r.customer_id=$1 and (r.include_history or m.created_at>=r.accepted_at or exists(select 1 from customer_invitations i where i.customer_id=r.customer_id and i.kind='STAMP' and i.state='ACCEPTED' and i.result_id=m.id)) order by m.created_at desc`,[customerId])).rows;
  const affiliations=(await query(`select a.id,a.full_name,a.points_total,a.status,a.business_id,b.name business_name
    from affiliates a join businesses b on b.id=a.business_id join customer_relationships r on r.business_id=a.business_id
    and r.document_key=regexp_replace(lower(a.document_id),'[^a-z0-9]','','g') and r.state='ACCEPTED'
    where r.customer_id=$1 and a.status<>'DELETED' and (r.include_history or a.created_at>=r.accepted_at or exists(select 1 from customer_invitations i where i.customer_id=r.customer_id and i.kind='AFFILIATION' and i.state='ACCEPTED' and i.result_id=a.id))`,[customerId])).rows;
  return {cards:await Promise.all(members.map(async m=>({id:m.id,...await stamps.publicCard(m.public_token)}))),affiliations};
}
async function ownCard(customerId,id) {
  const row=(await query(`select m.public_token from stamp_members m join customer_relationships r
    on r.business_id=m.business_id and r.document_key=m.document_key and r.state='ACCEPTED'
    where m.id=$1 and r.customer_id=$2 and (r.include_history or m.created_at>=r.accepted_at or exists(select 1 from customer_invitations i where i.customer_id=r.customer_id and i.kind='STAMP' and i.state='ACCEPTED' and i.result_id=m.id))`,[id,customerId])).rows[0];
  if(!row) throw notFound('Tarjeta no encontrada.');return row.public_token;
}
async function identification(account) {
  const url=new URL('/empresa/',env.publicAppUrl);url.searchParams.set('customer',account.public_id);
  return {public_id:account.public_id,qr_image:await QRCode.toDataURL(url.toString()),url:url.toString()};
}
async function exportData(account) {
  const tables=['customer_finance_connections','customer_sale_deliveries','customer_entries','customer_sale_notes','customer_relationships','customer_budgets','customer_goals','customer_recurring','customer_favorites','customer_place_requests','customer_invitations','customer_business_blocks','customer_saved_publications','customer_program_requests','customer_publication_events','customer_activation_participations'];
  const output={account:{...account,session_id:undefined},purchases:(await query(saleSql,[account.id])).rows.map(r=>finance.salesMovement(r,account.timezone))};
  for(const table of tables) output[table]=(await query(`select * from ${table} where customer_id=$1`,[account.id])).rows;
  output.receipts=(await query("select id,entry_id,filename,mime_type,encode(bytes,'base64') base64 from customer_receipts where customer_id=$1",[account.id])).rows;
  output.product_gift_orders=(await query("select * from customer_product_gift_orders where buyer_id=$1 or recipient_id=$1",[account.id])).rows;
  output.giftcards=await require('./customerWalletService').giftWallet(account);
  return output;
}
module.exports={dashboard,movements,ownSale,relationships,proposeRelationship,decideRelationship,saveEntry,mergeEntry,wallet,ownCard,identification,exportData,normalizeDocument};

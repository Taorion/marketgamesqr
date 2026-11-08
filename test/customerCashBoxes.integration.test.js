const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='cash-boxes-local-test';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),finance=require('../backend/src/services/customerFinance');
const uuid=()=>crypto.randomUUID(),ids=[],businessIds=[];let server,base,a,b,personal,second,cash,bank,expense;
const today=()=>finance.dateKey(new Date(),'America/Bogota');
async function account(){const a=(await query("insert into customer_accounts(email,full_name,declared_document_key,currency,timezone) values($1,'Cash QA',$2,'COP','America/Bogota') returning *",[uuid()+'@example.test',uuid().replaceAll('-','')])).rows[0],token=crypto.randomBytes(32).toString('base64url');ids.push(a.id);await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function api(path,body,book=personal?.id,user=a,method=body?'POST':'GET'){const r=await fetch(base+'/api/customer'+path,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',...(book?{'X-Qori-Book':book}:{})},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,...await r.json()};}
function ok(r){assert.equal(r.http,200,JSON.stringify(r));return r;}
const entry=(kind,amount,cash_box_id)=>({request_id:uuid(),kind,amount,cash_box_id,currency:'COP',occurred_at:today(),merchant:'Movimiento QA',category:'otros'});
test('cash boxes partition canonical money with private ownership and atomic writes',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;a=await account();b=await account();personal=ok(await api('/finance-books')).books[0];
 await t.test('unknown opening remains unknown; boxes are idempotent and owned',async()=>{
  await require('../backend/src/services/customerCashBoxService').overview({...a,finance_book:personal});
  assert.equal(ok(await api('/cash-boxes')).total_minor,null);const d={request_id:uuid(),name:'Efectivo'};const rs=await Promise.all([api('/cash-boxes',d),api('/cash-boxes',d)]);cash=ok(rs[0]).box;assert.equal(ok(rs[1]).box.id,cash.id);bank=ok(await api('/cash-boxes',{request_id:uuid(),name:'Banco'})).box;
  assert.equal((await api('/cash-boxes',{request_id:uuid(),name:' efectivo '})).http,400);assert.equal((await api('/cash-boxes',null,personal.id,b)).http,404);
  second=ok(await api('/finance-books',{request_id:uuid(),name:'Negocio',currency:'COP',opening_amount:'500',opening_date:today()})).book;
  const foreign=ok(await api('/cash-boxes',{request_id:uuid(),name:'Nequi'},second.id)).box;
  assert.equal((await api('/entries',entry('EXPENSE','10',foreign.id))).http,404);assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n,0);
 });
 await t.test('opening sums all boxes exactly once and rejects stale or partial setup',async()=>{
  const d=ok(await api('/cash-boxes')),data={revision:d.book.revision,opening_date:today(),unassigned_amount:'0',boxes:[{id:cash.id,amount:'100'},{id:bank.id,amount:'900'}],confirmed:true};
  assert.equal((await api('/cash-boxes/opening',{...data,boxes:data.boxes.slice(1)},personal.id,a,'PUT')).http,400);ok(await api('/cash-boxes/opening',data,personal.id,a,'PUT'));assert.equal((await api('/cash-boxes/opening',data,personal.id,a,'PUT')).http,400);
  const x=ok(await api('/cash-boxes'));assert.equal(x.total_minor,100000);assert.equal(x.unassigned_minor,0);assert.equal(x.boxes.find(c=>c.id===bank.id).balance_minor,90000);
 });
 await t.test('expenses and income update the selected box, duplicate retries cannot change it',async()=>{
  const d=entry('EXPENSE','50',cash.id);expense=ok(await api('/entries',d)).entry;assert.equal(ok(await api('/entries',{...d,cash_box_id:bank.id})).entry.id,expense.id);ok(await api('/entries',entry('INCOME','200',bank.id)));
  const x=ok(await api('/cash-boxes'));assert.equal(x.total_minor,115000);assert.equal(x.boxes.find(c=>c.id===cash.id).balance_minor,5000);assert.equal(x.boxes.find(c=>c.id===bank.id).balance_minor,110000);assert.equal(x.unassigned_minor,0);assert.equal(ok(await api('/entries/'+expense.id)).entry.cash_box_id,cash.id);
  assert.equal((await api('/entries',{...entry('EXPENSE','10',cash.id),currency:'USD'})).http,400);assert.equal((await api('/entries',entry('EXPENSE','10',cash.id),second.id)).http,404);
 });
 await t.test('box transfers are idempotent, reversible and never income or expenses',async()=>{
  const data={request_id:uuid(),from_box_id:bank.id,to_box_id:cash.id,amount:'25',occurred_on:today(),note:'Retiro'};const rs=await Promise.all([api('/cash-boxes/transfers',data),api('/cash-boxes/transfers',data)]);const move=ok(rs[0]).transfer;assert.equal(ok(rs[1]).transfer.id,move.id);
  let x=ok(await api('/cash-boxes'));assert.equal(x.total_minor,115000);assert.equal(x.boxes.find(c=>c.id===cash.id).balance_minor,7500);assert.equal(x.movement_count,2);ok(await api('/cash-boxes/transfers/'+move.id,null,personal.id,a,'DELETE'));ok(await api('/cash-boxes/transfers/'+move.id,null,personal.id,a,'DELETE'));x=ok(await api('/cash-boxes'));assert.equal(x.boxes.find(c=>c.id===cash.id).balance_minor,5000);assert.ok(x.transfers[0].voided_at);
  assert.equal((await api('/cash-boxes/transfers',{...data,request_id:uuid(),to_box_id:bank.id})).http,400);assert.equal((await api('/cash-boxes/transfers',{...data,request_id:uuid(),occurred_on:'2100-01-01'})).http,400);
 });
 await t.test('unassigned historical expenses can be classified, revised and deleted',async()=>{
  const d=entry('EXPENSE','20'),e=ok(await api('/entries',d)).entry;let x=ok(await api('/cash-boxes'));assert.equal(x.total_minor,113000);assert.equal(x.unassigned_minor,-2000);
  ok(await api('/cash-boxes/assignment',{kind:'ENTRY',id:e.id,cash_box_id:bank.id,revision:0},personal.id,a,'PUT'));assert.equal((await api('/cash-boxes/assignment',{kind:'ENTRY',id:e.id,cash_box_id:cash.id,revision:0},personal.id,a,'PUT')).http,400);
  ok(await api('/entries/'+e.id,{...d,amount:'30',cash_box_id:bank.id},personal.id,a,'PUT'));x=ok(await api('/cash-boxes'));assert.equal(x.unassigned_minor,0);assert.equal(x.total_minor,112000);assert.equal(x.boxes.find(c=>c.id===bank.id).balance_minor,107000);ok(await api('/entries/'+e.id,null,personal.id,a,'DELETE'));assert.equal(ok(await api('/cash-boxes')).total_minor,115000);
 });
 await t.test('moving an entry to another pocket releases its old box',async()=>{
  ok(await api('/finance-books/reassign',{kind:'ENTRY',id:expense.id,book_id:second.id}));assert.equal(ok(await api('/cash-boxes')).total_minor,120000);const x=ok(await api('/cash-boxes',null,second.id));assert.equal(x.total_minor,45000);assert.equal(x.movements.find(m=>m.source_id===expense.id).cash_box_id,null);assert.equal((await query("select count(*)::int n from customer_cash_allocations where kind='ENTRY' and source_id=$1",[expense.id])).rows[0].n,0);
 });
 await t.test('canonical Qori sales inherit the linked expense box, can be unassigned and reflect voided sales',async()=>{
  const svc=require('../backend/src/services/customerService');const shop=(await query("insert into businesses(name,slug) values('Cash QA',$1) returning *",[uuid()])).rows[0];
  businessIds.push(shop.id);const owner=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'test','QA','BUSINESS_OWNER') returning *",[shop.id,uuid()+'@example.test'])).rows[0];
  try{const p=await svc.proposeRelationship(owner,{public_id:a.public_id,document_id:a.declared_document_key,identity_checked:true});ok(await api('/relationships/'+p.relationship.id+'/decision',{action:'ACCEPT',document_id:a.declared_document_key,document_confirmation:a.declared_document_key,include_history:true,capture_purchases:true}));
   const sale=(await query("insert into business_sales(business_id,customer_name,customer_document_id,sale_amount,currency,sale_status,paid_at,product_name) values($1,'Cash QA',$2,10,'COP','PAID',now(),'Cafe') returning *",[shop.id,a.declared_document_key])).rows[0];
   const manual=ok(await api('/entries',entry('EXPENSE','10',cash.id))).entry;await svc.mergeEntry(a.id,manual.id,sale.id);let x=ok(await api('/cash-boxes'));assert.equal(x.total_minor,119000);assert.equal(x.boxes.find(c=>c.id===cash.id).balance_minor,9000);assert.equal(x.movements.filter(r=>r.source_id===manual.id).length,0);assert.equal(x.movements.find(r=>r.source_id===sale.id).cash_box_id,cash.id);
   ok(await api('/cash-boxes/assignment',{kind:'SALE',id:sale.id,cash_box_id:null,revision:0},personal.id,a,'PUT'));x=ok(await api('/cash-boxes'));assert.equal(x.movements.find(r=>r.source_id===sale.id).cash_box_id,null);assert.equal(x.unassigned_minor,-1000);
   ok(await api('/cash-boxes/assignment',{kind:'SALE',id:sale.id,cash_box_id:bank.id,revision:0},personal.id,a,'PUT'));x=ok(await api('/cash-boxes'));assert.equal(x.unassigned_minor,0);assert.equal(x.boxes.find(c=>c.id===bank.id).balance_minor,109000);
   await query("update business_sales set sale_status='VOIDED' where id=$1",[sale.id]);x=ok(await api('/cash-boxes'));assert.equal(x.total_minor,120000);assert.equal(x.boxes.find(c=>c.id===bank.id).balance_minor,110000);
  }finally{await query('delete from customer_entries where customer_id=$1 and linked_sale_id in(select id from business_sales where business_id=$2)',[a.id,shop.id]);}
 });
 await t.test('database ownership, RLS and exported audit history',async()=>{
  for(const table of ['customer_cash_boxes','customer_cash_allocations','customer_cash_transfers','customer_cash_events']){assert.equal((await query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity,true);assert.equal((await query("select count(*)::int n from information_schema.role_table_grants where table_name=$1 and grantee in ('PUBLIC','anon','authenticated')",[table])).rows[0].n,0);}
  await assert.rejects(query("insert into customer_cash_allocations(customer_id,book_id,kind,source_id,cash_box_id) values($1,$2,'ENTRY',$3,$4)",[b.id,personal.id,uuid(),cash.id]),e=>e.code==='23503');
  const data=ok(await api('/export'));assert.equal(data.customer_cash_boxes.length,3);assert.equal(data.customer_cash_transfers.length,1);assert.ok(data.customer_cash_events.length>=8);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await query('delete from customer_accounts where id=any($1::uuid[])',[ids]);await query('delete from businesses where id=any($1::uuid[])',[businessIds]);await pool.end();});

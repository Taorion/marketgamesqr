const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='automatic-purchases-test';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),svc=require('../backend/src/services/customerService');
const ids=[],businesses=[],uuid=()=>crypto.randomUUID();let server,base;
async function account(){const a=(await query("insert into customer_accounts(email,full_name) values($1,'Purchase QA') returning *",[uuid()+'@example.test'])).rows[0],token=crypto.randomBytes(32).toString('base64url');ids.push(a.id);await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function business(){const b=(await query("insert into businesses(name,slug) values('Same business name',$1) returning *",[uuid()])).rows[0];businesses.push(b.id);const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','QA','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0];return {b,u};}
async function api(a,path,body,book,method=body?'POST':'GET'){const r=await fetch(base+'/api/customer'+path,{method,headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json',...(book?{'X-Qori-Book':book}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
test('verified business purchases require consent, keep original products and use the selected private pocket once',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const a=await account(),b=await account(),shop=await business(),foreign=await business(),doc='AUTO'+uuid().replaceAll('-','');
 const personal=(await api(a,'/finance-books')).books[0],otherBook=(await api(b,'/finance-books')).books[0],home=(await api(a,'/finance-books',{request_id:uuid(),name:'Casa',currency:'COP'})).book;
 const proposal=await svc.proposeRelationship(shop.u,{public_id:a.public_id,document_id:doc,identity_checked:true});
 assert.equal((await api(a,'/relationships/'+proposal.relationship.id+'/decision',{action:'ACCEPT',document_id:doc,document_confirmation:doc,include_history:true,capture_purchases:false})).status,200);
 const sale=async(status='PAID',biz=shop.b.id)=>(await query("insert into business_sales(business_id,customer_name,customer_document_id,sale_amount,currency,sale_status,paid_at,metadata,product_name) values($1,'Purchase QA',$2,15000,'COP',$3,case when $3='PAID' then now() end,$4::jsonb,'Cafe y pan') returning *",[biz,doc,status,JSON.stringify({products:[{name:'Cafe',quantity:2,line_total:10000},{name:'Pan',quantity:1,line_total:5000}]})])).rows[0];
 const config=(enabled,book=home.id)=>api(a,'/finance-connections/'+shop.b.id+'/capture',{enabled,book_id:book,confirmed:true},null,'PUT');
 let first,second;
 await t.test('accepting benefits without financial consent does not expose purchases',async()=>{
  const hidden=await sale();assert.equal((await api(a,'/purchase-receipts/'+hidden.id)).status,404);
  assert.equal((await api(a,'/dashboard',null,personal.id)).total_minor,0);
  assert.equal((await config(true,otherBook.id)).status,404);
  assert.equal((await api(b,'/finance-connections/'+shop.b.id+'/capture',{enabled:true,book_id:otherBook.id,confirmed:true},null,'PUT')).status,400);
 });
 await t.test('new paid baskets appear automatically with product quantities and one original sale',async()=>{
  assert.equal((await config(true)).status,200);first=await sale();
  const h=await api(a,'/dashboard',null,home.id);assert.equal(h.total_minor,1500000);assert.equal(h.movements.length,1);
  assert.equal(h.movements[0].source,'QORI');assert.equal(h.movements[0].products.length,2);assert.equal(h.movements[0].products[0].quantity,2);assert.equal(h.movements[0].products_exact,true);
  assert.equal((await api(a,'/dashboard',null,personal.id)).total_minor,0);
  await query("update business_sales set sale_status='PAID' where id=$1",[first.id]);
  assert.equal((await query('select count(*)::int n from customer_sale_captures where sale_id=$1',[first.id])).rows[0].n,1);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n,0);
  const notices=await api(a,'/notifications');assert.equal(notices.items.filter(n=>n.resource_id===first.id&&n.kind==='SALE').length,1);
  assert.equal((await api(b,'/purchase-receipts/'+first.id)).status,404);
  const receipt=await api(a,'/purchase-receipts/'+first.id);assert.equal(receipt.receipt.products.length,2);assert.equal(receipt.receipt.automatic,true);
  const delivery=require('../backend/src/services/customerFinanceDeliveryService');const listed=(await delivery.businessSales(shop.u)).sales.find(s=>s.id===first.id);assert.equal(listed.automatically_recorded,true);assert.equal(listed.recipient_name,a.full_name);assert.equal((await delivery.businessSales(foreign.u)).sales.some(s=>s.id===first.id),false);
  await assert.rejects(delivery.send(shop.u,{sale_id:first.id,public_id:b.public_id,request_id:uuid()}),/otra cuenta/);
  const foreignSale=await sale('PAID',foreign.b.id);assert.equal((await api(a,'/purchase-receipts/'+foreignSale.id)).status,404);
 });
 await t.test('pending sales count only after payment; changing destination never moves old purchases',async()=>{
  second=await sale('PENDING');assert.equal((await api(a,'/dashboard',null,home.id)).total_minor,1500000);
  assert.equal((await config(true,personal.id)).status,200);
  await query("update business_sales set sale_status='PAID',paid_at=now() where id=$1",[second.id]);
  assert.equal((await api(a,'/dashboard',null,personal.id)).total_minor,1500000);assert.equal((await api(a,'/dashboard',null,home.id)).total_minor,1500000);
 });
 await t.test('revoking automatic consent preserves previous purchases and excludes the disabled period',async()=>{
  assert.equal((await config(false)).status,200);const skipped=await sale();assert.equal((await api(a,'/purchase-receipts/'+skipped.id)).status,404);
  assert.equal((await api(a,'/purchase-receipts/'+first.id)).status,200);
  await config(true);assert.equal((await api(a,'/purchase-receipts/'+skipped.id)).status,404);
  await config(false);assert.equal((await api(a,'/purchase-receipts/'+skipped.id)).status,404);
  await config(true);assert.equal((await api(a,'/purchase-receipts/'+skipped.id)).status,404);
  await query("update business_sales set sale_status='VOIDED' where id=$1",[first.id]);assert.equal((await api(a,'/dashboard',null,home.id)).total_minor,0);
  await assert.rejects(query('update business_sales set customer_document_id=$2 where id=$1',[first.id,'DIFFERENT']),e=>e.code==='23514');
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(ids.length)await query('delete from customer_accounts where id=any($1::uuid[])',[ids]);await pool.end();});

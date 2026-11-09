const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='courtesy-isolated-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),qr=require('../backend/src/services/qrService');
const uuid=()=>crypto.randomUUID();let server,base,buyer,recipient,stranger,shop,company,product,publication,lot;
const ok=r=>{assert.equal(r.http,200,JSON.stringify(r));return r;};
async function api(a,path,body){const r=await fetch(base+(a.business_id?'/api/business/customer':'/api/customer')+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+a.token},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,...await r.json()};}
async function account(email){const a=(await query("insert into customer_accounts(email,full_name,declared_document_key,finance_setup_state) values($1,'Cliente QA',$2,'LEGACY') returning *",[email||uuid()+'@example.test',uuid()])).rows[0],token=crypto.randomBytes(32).toString('base64url');await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,crypto.createHash('sha256').update(token).digest('hex')]);return {...a,token};}
async function business(name){
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values($1,$2,'PRO','ACTIVE',$3::jsonb) returning *",[name,uuid(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'test','Dueño QA','BUSINESS_OWNER') returning *",[b.id,uuid()+'@example.test'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,30,30)',[b.id]);await query("insert into branches(business_id,name,slug) values($1,'Sede QA','qa')",[b.id]);
 return {...u,token:jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET)};
}
const request=(qty=2)=>({source:'PURCHASE',request_id:uuid(),publication_id:publication.id,quantity:qty,expected_unit_price:'8000',terms_accepted:true});
const sendData=email=>({request_id:uuid(),recipient_email:email||recipient.email,recipient_name:'Cliente beneficiario',message:'Gracias por tu compra',confirmed:true});
const pay=(id,amount='16000',actor=shop)=>api(actor,'/courtesies/'+id+'/confirm',{amount,payment_received:true,payment_method:'CASH',payment_reference:'CAJA-QA-1'});
async function balance(){return Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[shop.business_id])).rows[0].qr_balance);}
async function stock(){return Number((await query('select stock_quantity from business_inventory_products where id=$1',[product.id])).rows[0].stock_quantity);}
test('courtesy inventory supports Customer, cross-business and own-product gifts without duplicate payments',async t=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 buyer=await account();recipient=await account();stranger=await account();shop=await business('Café cortesías QA');company=await business('DeColeccion QA');
 product=(await query("insert into business_inventory_products(business_id,internal_id,name,status,stock_quantity,unit_price,cost_price,currency) values($1,'COURTESY-COFFEE','Café de cortesía','ACTIVE',30,8000,2000,'COP') returning *",[shop.business_id])).rows[0];
 await query("insert into customer_directory(business_id,published,category,city,address,description) values($1,true,'Café','Bogotá','QA','QA')",[shop.business_id]);
 publication=ok(await api(shop,'/publications',{kind:'PRODUCT',resource_id:product.id,title:'Un café de cortesía',description:'Regala después',product_price:'8000',product_terms:'Un café. Canje único sin pago adicional.',payment_instructions:'Pago directo en caja.',product_valid_days:30})).publication;
 await t.test('unassigned orders are private and cannot consume or send until merchant payment',async()=>{
  assert.equal((await fetch(base+'/api/customer/courtesies')).status,401);
  assert.ok(ok(await api(buyer,'/courtesies/catalog?search='+encodeURIComponent('Café cortesías QA'))).offers.some(p=>p.id===publication.id));
  const d=request();lot=ok(await api(buyer,'/courtesies',d)).lot;assert.equal(lot.state,'PENDING_PAYMENT');assert.equal(lot.available,0);assert.equal(lot.snapshot.recipient_email,undefined);
  assert.equal(ok(await api(buyer,'/courtesies',d)).lot.id,lot.id);assert.equal((await api(buyer,'/courtesies',{...d,quantity:3})).http,400);
  assert.equal((await api(stranger,'/courtesies/'+lot.id)).http,404);assert.equal((await api(buyer,'/courtesies/'+lot.id+'/send',sendData())).http,400);
  assert.equal((await pay(lot.id,'1')).http,400);assert.equal((await pay(lot.id,'16000',company)).http,404);
  assert.equal(await balance(),30);assert.equal(await stock(),30);
  assert.equal((await api(buyer,'/courtesies',{...request(),expected_unit_price:'1'})).http,400);
 });
 await t.test('payment reserves all inventory and credits once; sale enters only the buyer finances',async()=>{
  const r=await Promise.all([pay(lot.id),pay(lot.id)]);r.forEach(ok);lot=ok(await api(buyer,'/courtesies/'+lot.id)).lot;assert.equal(lot.available,2);assert.equal(await balance(),28);assert.equal(await stock(),28);
  assert.equal((await query('select count(*)::int n from qr_codes where business_id=$1',[shop.business_id])).rows[0].n,0);
  assert.equal((await query('select sale_amount from business_sales where id=$1',[lot.sale_id])).rows[0].sale_amount,'16000.00');
  const svc=require('../backend/src/services/customerService');assert.equal((await svc.ownSale(buyer.id,lot.sale_id)).id,lot.sale_id);await assert.rejects(svc.ownSale(recipient.id,lot.sale_id),/Compra no encontrada/);
 });
 let issued;
 await t.test('concurrent delivery uses one reserved unit; invitation and ticket belong to recipient',async()=>{
  const d=sendData(),r=await Promise.all([api(buyer,'/courtesies/'+lot.id+'/send',d),api(buyer,'/courtesies/'+lot.id+'/send',d)]);r.forEach(ok);assert.equal(r[0].order_id,r[1].order_id);
  assert.equal((await api(buyer,'/courtesies/'+lot.id+'/send',{...d,recipient_email:stranger.email})).http,400);
  issued=(await query('select * from customer_product_gift_orders where id=$1',[r[0].order_id])).rows[0];assert.equal(issued.sale_id,lot.sale_id);assert.equal(issued.recipient_id,recipient.id);
  assert.equal(await balance(),28);assert.equal(await stock(),28);assert.equal(ok(await api(buyer,'/courtesies/'+lot.id)).lot.available,1);
  const ticket=(await query('select * from qr_codes where id=$1',[issued.qr_code_id])).rows[0];assert.ok(new Date(ticket.expires_at)>Date.now()+29*86400000);
  const payload={mode:'STANDALONE',idempotency_key:uuid(),beneficiary:{name:recipient.full_name,email:recipient.email,data_use_confirmed:true}};
  await assert.rejects(qr.redeemQr(ticket.token,shop,{...payload,beneficiary:{...payload.beneficiary,email:'wrong@example.test'}}),/correo/);
  assert.equal((await api(stranger,'/invitations/'+issued.invitation_id+'/decision',{action:'ACCEPT',terms_accepted:true})).http,404);
  ok(await api(recipient,'/invitations/'+issued.invitation_id+'/decision',{action:'ACCEPT',terms_accepted:true}));
  assert.equal((await qr.redeemQr(ticket.token,shop,payload)).status,'REDEEMED');assert.equal((await qr.redeemQr(ticket.token,shop,payload)).idempotent_replay,true);assert.equal(await stock(),28);
  assert.equal((await query('select count(*)::int n from business_sales where business_id=$1',[shop.business_id])).rows[0].n,1);
 });
 await t.test('last-unit races cannot oversend; unknown recipient can register and accept later',async()=>{
  const email=uuid()+'@example.test',r=await Promise.all([api(buyer,'/courtesies/'+lot.id+'/send',sendData(email)),api(buyer,'/courtesies/'+lot.id+'/send',sendData(email))]);assert.equal(r.filter(x=>x.http===200).length,1);assert.equal(r.filter(x=>x.http===400).length,1);
  const guest=await account(email);ok(await api(guest,'/invitations'));const o=(await query('select * from customer_product_gift_orders where id=$1',[r.find(x=>x.http===200).order_id])).rows[0];assert.equal(o.recipient_id,guest.id);assert.ok(o.invitation_id);ok(await api(guest,'/invitations/'+o.invitation_id+'/decision',{action:'ACCEPT',terms_accepted:true}));
  assert.equal(ok(await api(buyer,'/courtesies/'+lot.id)).lot.available,0);assert.equal((await query('select count(*)::int n from qori_gift_mail_outbox where order_id=$1',[o.id])).rows[0].n,2);
 });
 await t.test('Empresa buys from another merchant and own product gifts have zero cash revenue',async()=>{
  const purchased=ok(await api(company,'/courtesies',request(1))).lot;ok(await pay(purchased.id,'8000'));const r=ok(await api(company,'/courtesies/'+purchased.id+'/send',sendData()));assert.ok(r.share_url);assert.equal((await api(shop,'/courtesies/'+purchased.id)).http,404);
  const d={source:'OWN',request_id:uuid(),product_id:product.id,quantity:2,terms:'Cortesía por comprar en nuestro negocio.',valid_days:60,confirmed:true};
  const before=await balance(),beforeStock=await stock(),own=ok(await api(shop,'/courtesies',d)).lot;assert.equal(own.available,2);assert.equal(own.total,'0.00');assert.equal(await balance(),before-2);assert.equal(await stock(),beforeStock-2);assert.equal(ok(await api(shop,'/courtesies',d)).lot.id,own.id);
  assert.equal((await api(company,'/courtesies',{...d,request_id:uuid()})).http,400);assert.equal((await api(buyer,'/courtesies',d)).http,400);
  const ownSent=ok(await api(shop,'/courtesies/'+own.id+'/send',sendData()));assert.equal((await query('select sale_amount from business_sales where id=$1',[own.sale_id])).rows[0].sale_amount,'0.00');
  for(const orderId of [r.order_id,ownSent.order_id]){
   const o=(await query('select * from customer_product_gift_orders where id=$1',[orderId])).rows[0];ok(await api(recipient,'/invitations/'+o.invitation_id+'/decision',{action:'ACCEPT',terms_accepted:true}));
   const ticket=(await query('select token from qr_codes where id=$1',[o.qr_code_id])).rows[0];
   assert.equal((await qr.redeemQr(ticket.token,shop,{mode:'STANDALONE',idempotency_key:uuid(),beneficiary:{name:recipient.full_name,email:recipient.email,document_id:recipient.declared_document_key,data_use_confirmed:true}})).status,'REDEEMED');
  }
  assert.equal(await stock(),beforeStock-2);assert.equal((await query('select count(*)::int n from players where business_id=$1 and lower(email)=$2',[shop.business_id,recipient.email])).rows[0].n,1);
 });
 await t.test('insufficient credits roll back stock and pending state; cancellation and RLS remain safe',async()=>{
  const pending=ok(await api(buyer,'/courtesies',request(1))).lot;const beforeStock=await stock(),beforeBalance=await balance();await query('update business_qr_credit_accounts set qr_balance=0,included_balance=0 where business_id=$1',[shop.business_id]);
  assert.equal((await pay(pending.id,'8000')).http,400);assert.equal(await stock(),beforeStock);assert.equal(ok(await api(buyer,'/courtesies/'+pending.id)).lot.state,'PENDING_PAYMENT');
  await query('update business_qr_credit_accounts set qr_balance=$2 where business_id=$1',[shop.business_id,beforeBalance]);ok(await api(buyer,'/courtesies/'+pending.id+'/cancel',{}));assert.equal((await pay(pending.id,'8000')).http,400);
  assert.equal((await query("select relrowsecurity from pg_class where oid='customer_courtesy_lots'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await query("select count(*)::int n from information_schema.role_table_grants where table_name='customer_courtesy_lots' and grantee in ('PUBLIC','anon','authenticated')")).rows[0].n,0);
 });
});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});

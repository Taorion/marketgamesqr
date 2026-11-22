const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55489/qori_invoice_qa';
process.env.NODE_ENV='test';process.env.DB_SSL='false';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
process.env.QORI_INVOICE_SANDBOX_ENABLED='true';
process.env.QORI_INVOICE_IDENTITY_KEY=crypto.randomBytes(32).toString('hex');
process.env.QORI_INVOICE_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),svc=require('../backend/src/invoice/service');
const cfg=require('../backend/src/invoice/config'),{fixture}=require('./fixtures/qoriInvoice');
let server,base;
const uuid=()=>crypto.randomUUID();
async function account(verified=true) {
 const document='SBX'+uuid().replaceAll('-','').slice(0,22).toUpperCase();
 const a=(await query("insert into customer_accounts(email,full_name,declared_document_key,document_locked_at,finance_setup_state) values($1,'Persona sintética',$2,now(),'LEGACY') returning *",[uuid()+'@example.invalid',document.toLowerCase()])).rows[0];
 const token=crypto.randomBytes(32).toString('base64url');
 await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '1 day')",[a.id,cfg.hash(token)]);
 const book=(await query("insert into customer_finance_books(customer_id,name,currency,is_default) values($1,'Pruebas','COP',true) returning *",[a.id])).rows[0];
 if(verified)await query("insert into invoice_identity_attestations(customer_id,identity_hmac,method,evidence_reference,expires_at) values($1,$2,'SANDBOX_FIXTURE','AUTOMATED_TEST',now()+interval '1 day')",[a.id,cfg.identity('13',document)]);
 return {...a,document,token,book};
}
async function request(path,{account:a,token,body,method=body?'POST':'GET',key,headers={}}={}) {
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(a?{Authorization:'Bearer '+a.token,'X-Qori-Account':a.id}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,headers:r.headers,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};
}
async function integration() {
 const owner=await account(false);
 const partner=(await svc.register(owner,'Integrador sintético')).partner;
 const application=(await svc.createApp(owner,partner.id,'POS sintético')).app;
 await svc.authorizeFixture(owner,application.id);
 const key=await svc.createKey(owner,application.id);
 return {owner,app:application,key};
}
async function grant(a,app) {
 const r=await request('/api/customer/invoices/consents',{account:a,body:{app_id:app.id,book_id:a.book.id,accepted:true,text_version:svc.CONSENT.version}});
 assert.equal(r.status,200,JSON.stringify(r.data));return r.data.consent;
}
async function send(i,xml=fixture(),key=uuid()) {
 return request('/api/invoice/v1/invoices',{token:i.key.secret,key,body:{issuer_nit:'900000000',xml}});
}
async function drain() {for(let i=0;i<100&&await svc.processOne();i++);}
before(async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_invoice_qa');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 require('../backend/src/config/env').env.corsOrigins.push(base);
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});
test('disabled routes return 404 without changing existing health and auth',async()=>{
 process.env.QORI_INVOICE_SANDBOX_ENABLED='false';
 for(const path of ['/developers/','/api/invoice/v1/invoices','/api/customer/invoices/','/api/developers/v1/overview'])assert.equal((await request(path)).status,404,path);
 assert.equal((await request('/api/health')).status,200);assert.equal((await request('/api/customer/me')).status,401);
 process.env.QORI_INVOICE_SANDBOX_ENABLED='true';
});
test('developer membership, key expiry/revocation, merchant authorization and bearer type',async()=>{
 const a=await integration(),b=await integration();
 assert.equal((await request('/api/developers/v1/apps/'+a.app.id+'/keys',{account:b.owner,body:{}})).status,404);
 assert.equal((await request('/api/invoice/v1/invoices',{account:a.owner,body:{}})).status,401);
 assert.equal((await request('/api/customer/invoices/',{token:a.key.secret})).status,401);
 await svc.authorizeFixture(a.owner,a.app.id,true);assert.equal((await send(a)).status,403);
 await svc.authorizeFixture(a.owner,a.app.id);
 await query("update invoice_keys set expires_at=now()-interval '1 second' where id=$1",[a.key.key.id]);assert.equal((await send(a)).status,401);
 a.key=await svc.createKey(a.owner,a.app.id);await svc.revokeKey(a.owner,a.app.id,a.key.key.id);assert.equal((await send(a)).status,401);
 const read=await svc.overview(b.owner);assert.ok(!JSON.stringify(read).includes(b.key.secret));assert.ok(read.apps.every(x=>x.id===b.app.id));
});
test('concurrent idempotency creates exactly one job and conflict cannot replace XML',async()=>{
 const i=await integration(),xml=fixture({id:uuid()}),key=uuid();
 const attempts=await Promise.all(Array.from({length:8},()=>send(i,xml,key)));
 attempts.forEach(r=>assert.equal(r.status,202,JSON.stringify(r.data)));
 assert.equal(new Set(attempts.map(r=>r.data.id)).size,1);
 assert.equal((await query('select count(*)::int n from invoice_submissions where app_id=$1 and idempotency_key=$2',[i.app.id,key])).rows[0].n,1);
 assert.equal((await send(i,fixture({id:uuid()}),key)).status,409);
 const b=await integration();assert.equal((await request('/api/invoice/v1/receipts/'+attempts[0].data.id,{token:b.key.secret})).status,404);
 await drain();assert.equal((await request('/api/invoice/v1/receipts/'+attempts[0].data.id,{token:i.key.secret})).data.status,'PROCESSED');
});
test('verified identity plus current application consent delivers original and detail without recording a payment',async()=>{
 const i=await integration(),a=await account(),b=await account();await grant(a,i.app);
 const before=(await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n;
 const xml=fixture({id:uuid(),buyer:a.document}),received=await send(i,xml);assert.equal(received.status,202);await drain();
 const result=await request('/api/customer/invoices/',{account:a});assert.equal(result.status,200);
 assert.equal(result.data.documents.length,1);const doc=result.data.documents[0];assert.equal(doc.totals.payable_minor,2380000);assert.equal(doc.buyer,undefined);
 assert.equal(doc.payment_state,'NOT_EVIDENCED');assert.equal(doc.dian_state,'DIAN_NOT_VERIFIED');
 const original=await request('/api/customer/invoices/'+doc.id+'/xml',{account:a});assert.equal(original.status,200);assert.equal(original.data,xml);assert.match(original.headers.get('content-disposition'),/attachment/);
 assert.equal((await request('/api/customer/invoices/'+doc.id,{account:b})).status,404);
 assert.equal((await request('/api/customer/invoices/'+doc.id+'/xml',{account:b})).status,404);
 assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n,before);
 const stored=(await query('select content_box from invoice_documents where id=$1',[doc.id])).rows[0];
 assert.ok(!stored.content_box.includes(a.document));assert.ok(!stored.content_box.includes('Café'));
 assert.equal((await query('select payload_box from invoice_submissions where id=$1',[received.data.id])).rows[0].payload_box,null);
 // Repeat through a different authorized connector; global document dedupe preserves original.
 const other=await integration();await grant(a,other.app);await send(other,xml);await drain();
 assert.equal((await svc.documents(a)).documents.length,1);
});
test('missing identity, missing/revoked consent and unknown buyer have indistinguishable public status',async()=>{
 const i=await integration(),unverified=await account(false),verified=await account(),revoked=await account();
 const denied=await request('/api/customer/invoices/consents',{account:unverified,body:{app_id:i.app.id,book_id:unverified.book.id,accepted:true,text_version:svc.CONSENT.version}});
 assert.equal(denied.status,409);
 const consent=await grant(revoked,i.app);
 const submissions=[];
 for(const buyer of [unverified.document,verified.document,revoked.document,'UNKNOWNBUYER'])submissions.push(await send(i,fixture({id:uuid(),buyer})));
 await request('/api/customer/invoices/consents/'+consent.id,{account:revoked,method:'DELETE'});await drain();
 for(const s of submissions){assert.equal((await request('/api/invoice/v1/receipts/'+s.data.id,{token:i.key.secret})).data.status,'PROCESSED');}
 for(const a of [unverified,verified,revoked])assert.equal((await svc.documents(a)).documents.length,0);
 assert.equal((await request('/api/invoice/v1/customers/UNKNOWNBUYER',{token:i.key.secret})).status,404);
});
test('consent requires own book, explicit acceptance and policy version; cookie CSRF and stale account rejected',async()=>{
 const i=await integration(),a=await account(),b=await account();
 const data={app_id:i.app.id,book_id:a.book.id,accepted:true,text_version:svc.CONSENT.version};
 assert.equal((await request('/api/customer/invoices/consents',{account:a,body:{...data,book_id:b.book.id}})).status,404);
 for(const change of [{accepted:false},{text_version:'old'},{customer_id:b.id}])assert.equal((await request('/api/customer/invoices/consents',{account:a,body:{...data,...change}})).status,400);
 assert.equal((await request('/api/customer/invoices/consents',{body:data,headers:{Cookie:'qori_customer_session='+a.token}})).status,403);
 assert.equal((await request('/api/customer/invoices/',{account:a,headers:{'X-Qori-Account':b.id}})).status,409);
});
test('revocation of merchant, identity or app while queued stops internal delivery',async()=>{
 for(const kind of ['merchant','identity','app']){
  const i=await integration(),a=await account();await grant(a,i.app);await send(i,fixture({id:uuid(),buyer:a.document}));
  if(kind==='merchant')await svc.authorizeFixture(i.owner,i.app.id,true);
  if(kind==='identity')await query('update invoice_identity_attestations set revoked_at=now() where customer_id=$1',[a.id]);
  if(kind==='app')await query('update invoice_apps set active=false where id=$1',[i.app.id]);
  await drain();assert.equal((await svc.documents(a)).documents.length,0);
 }
});
test('notes arriving before their invoice relate without creating a refund; reconciliation is owned and idempotent',async()=>{
 const i=await integration(),a=await account(),b=await account();await grant(a,i.app);
 const id=uuid();
 await send(i,fixture({type:'CreditNote',id:uuid(),related:id,buyer:a.document}));await drain();
 assert.equal((await svc.documents(a)).documents[0].related_document_id,null);
 await send(i,fixture({id,buyer:a.document}));await drain();
 const docs=(await svc.documents(a)).documents,note=docs.find(x=>x.type==='CreditNote'),invoice=docs.find(x=>x.type==='Invoice');
 assert.equal(note.related_document_id,invoice.id);
 const entry=async owner=>(await query("insert into customer_entries(customer_id,book_id,request_id,kind,amount,currency,occurred_at,merchant) values($1,$2,$3,'EXPENSE',23800,'COP',now(),'Comercio sintético') returning id",[owner.id,owner.book.id,uuid()])).rows[0].id;
 const own=await entry(a),foreign=await entry(b);
 const url='/api/customer/invoices/'+invoice.id+'/reconcile';
 assert.equal((await request(url,{account:a,body:{entry_id:foreign,confirmed:true}})).status,409);
 for(let j=0;j<2;j++)assert.equal((await request(url,{account:a,body:{entry_id:own,confirmed:true}})).status,200);
 assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[a.id])).rows[0].n,1);
 assert.equal((await request('/api/customer/invoices/'+note.id+'/reconcile',{account:a,body:{entry_id:own,confirmed:true}})).status,409);
});
test('invalid XML and SQL errors never reflect document contents; technical rejection clears payload',async()=>{
 const i=await integration();const r=await send(i,'<!DOCTYPE a SYSTEM "file:///PRIVATE_SYNTHETIC">');
 assert.equal(r.status,202);await drain();
 const receipt=await request('/api/invoice/v1/receipts/'+r.data.id,{token:i.key.secret});
 assert.equal(receipt.data.status,'REJECTED');assert.equal(receipt.data.code,'INVALID_DOCUMENT');assert.ok(!JSON.stringify(receipt.data).includes('PRIVATE_SYNTHETIC'));
 const row=(await query('select payload_box,attempts from invoice_submissions where id=$1',[r.data.id])).rows[0];assert.equal(row.payload_box,null);assert.equal(row.attempts,1);
 const oversized=await send(i,'a'.repeat(700000));assert.equal(oversized.status,413);
});
test('two workers process jobs once; transient failures retry and exhaust with no raw error disclosure',async()=>{
 const i=await integration();const receipt=await send(i,fixture({id:uuid()}));
 await query("update invoice_submissions set payload_box='invalid synthetic box' where id=$1",[receipt.data.id]);
 await Promise.all([svc.processOne(),svc.processOne()]);
 let row=(await query('select * from invoice_submissions where id=$1',[receipt.data.id])).rows[0];assert.equal(row.state,'RETRY');assert.equal(row.attempts,1);
 for(let n=0;n<4;n++){await query('update invoice_submissions set available_at=now() where id=$1',[row.id]);await svc.processOne();}
 row=(await query('select * from invoice_submissions where id=$1',[row.id])).rows[0];assert.equal(row.state,'DEAD');assert.equal(row.attempts,5);assert.equal(row.payload_box,null);
});
test('all module tables enable RLS; PUBLIC privileges denied and migrations mirrored',async()=>{
 const tables=(await query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'invoice_%'")).rows;
 assert.equal(tables.length,12);assert.ok(tables.every(t=>t.relrowsecurity));
 assert.equal((await query("select count(*)::int n from information_schema.table_privileges where table_name like 'invoice_%' and grantee='PUBLIC'")).rows[0].n,0);
 assert.equal(fs.readFileSync('database/migrations/20261122160317_qori_invoice_sandbox.sql','utf8'),fs.readFileSync('supabase/migrations/20261122160317_qori_invoice_sandbox.sql','utf8'));
});


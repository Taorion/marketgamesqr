const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55489/qori_invoice_qa';
process.env.NODE_ENV='test';process.env.DB_SSL='false';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
process.env.QORI_INVOICE_SANDBOX_ENABLED='true';
process.env.QORI_INVOICE_IDENTITY_KEY=crypto.randomBytes(32).toString('hex');
process.env.QORI_INVOICE_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),svc=require('../backend/src/invoice/service');
const cfg=require('../backend/src/invoice/config'),{fixture}=require('./fixtures/qoriInvoice');
let server,base,environmentLock;
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
 const r=await fetch(base+'/api/invoice/v1/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:'Basic '+Buffer.from(key.client_id+':'+key.client_secret).toString('base64')},body:'grant_type=client_credentials'});
 assert.equal(r.status,200);const token=(await r.json()).access_token;
 return {owner,app:application,key,token};
}
async function grant(a,app) {
 const r=await request('/api/customer/invoices/consents',{account:a,body:{app_id:app.id,book_id:a.book.id,accepted:true,text_version:svc.CONSENT.version}});
 assert.equal(r.status,200,JSON.stringify(r.data));return r.data.consent;
}
async function send(i,xml=fixture(),key=uuid()) {
 return request('/api/invoice/v1/invoices',{token:i.token,key,body:{issuer_nit:'900000000',xml}});
}
async function drain() {for(let i=0;i<100&&await svc.processOne();i++);await query("update invoice_submissions set public_ready_at=now()-interval '1 second'");}
before(async()=>{
 assert.equal((await query('select current_database() n')).rows[0].n,'qori_invoice_qa');
 environmentLock=await pool.connect();
 assert.equal((await environmentLock.query('select pg_try_advisory_lock(53002817) acquired')).rows[0].acquired,true,'Stop local preview/workers before running tests with different encryption keys');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 require('../backend/src/config/env').env.corsOrigins.push(base);
});
after(async()=>{if(server)await new Promise(r=>server.close(r));if(environmentLock){await environmentLock.query('select pg_advisory_unlock(53002817)');environmentLock.release();}await pool.end();});
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
 assert.equal((await request('/api/customer/invoices/',{token:a.token})).status,401);
 await svc.authorizeFixture(a.owner,a.app.id,true);assert.equal((await send(a)).status,403);
 await svc.authorizeFixture(a.owner,a.app.id);
 await query("update invoice_keys set expires_at=now()-interval '1 second' where id=$1",[a.key.key.id]);assert.equal((await send(a)).status,401);
 a.key=await svc.createKey(a.owner,a.app.id);await svc.revokeKey(a.owner,a.app.id,a.key.key.id);assert.equal((await send(a)).status,401);
 const read=await svc.overview(b.owner);assert.ok(!JSON.stringify(read).includes(b.token));assert.ok(read.apps.every(x=>x.id===b.app.id));
});
test('concurrent idempotency creates exactly one job and conflict cannot replace XML',async()=>{
 const i=await integration(),xml=fixture({id:uuid()}),key=uuid();
 const attempts=await Promise.all(Array.from({length:8},()=>send(i,xml,key)));
 attempts.forEach(r=>assert.equal(r.status,202,JSON.stringify(r.data)));
 assert.equal(new Set(attempts.map(r=>r.data.submission_id)).size,1);
 assert.equal((await query('select count(*)::int n from invoice_submissions where app_id=$1 and idempotency_key=$2',[i.app.id,key])).rows[0].n,1);
 assert.equal((await send(i,fixture({id:uuid()}),key)).status,409);
 const b=await integration();assert.equal((await request('/api/invoice/v1/receipts/'+attempts[0].data.submission_id,{token:b.token})).status,404);
 await drain();assert.equal((await request('/api/invoice/v1/receipts/'+attempts[0].data.submission_id,{token:i.token})).data.status,'PROCESSED');
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
 assert.equal((await query('select payload_box from invoice_submissions where id=$1',[received.data.submission_id])).rows[0].payload_box,null);
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
 for(const buyer of [unverified.document,verified.document,revoked.document,'SANDBOXUNKNOWN001'])submissions.push(await send(i,fixture({id:uuid(),buyer})));
 await request('/api/customer/invoices/consents/'+consent.id,{account:revoked,method:'DELETE'});await drain();
 for(const s of submissions){assert.equal((await request('/api/invoice/v1/receipts/'+s.data.submission_id,{token:i.token})).data.status,'PROCESSED');}
 for(const a of [unverified,verified,revoked])assert.equal((await svc.documents(a)).documents.length,0);
 assert.equal((await request('/api/invoice/v1/customers/UNKNOWNBUYER',{token:i.token})).status,404);
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
 const receipt=await request('/api/invoice/v1/receipts/'+r.data.submission_id,{token:i.token});
 assert.equal(receipt.data.status,'REJECTED');assert.equal(receipt.data.code,'INVALID_DOCUMENT');assert.ok(!JSON.stringify(receipt.data).includes('PRIVATE_SYNTHETIC'));
 const row=(await query('select payload_box,attempts from invoice_submissions where id=$1',[r.data.submission_id])).rows[0];assert.equal(row.payload_box,null);assert.equal(row.attempts,1);
 const oversized=await send(i,'a'.repeat(700000));assert.equal(oversized.status,413);
});
test('two workers process jobs once; transient failures retry and exhaust with no raw error disclosure',async()=>{
 const i=await integration();const receipt=await send(i,fixture({id:uuid()}));
 await query("update invoice_submissions set payload_box='invalid synthetic box' where id=$1",[receipt.data.submission_id]);
 await Promise.all([svc.processOne(),svc.processOne()]);
 let row=(await query('select * from invoice_submissions where id=$1',[receipt.data.submission_id])).rows[0];assert.equal(row.state,'RETRY');assert.equal(row.attempts,1);
 for(let n=0;n<4;n++){await query('update invoice_submissions set available_at=now() where id=$1',[row.id]);await svc.processOne();}
 row=(await query('select * from invoice_submissions where id=$1',[row.id])).rows[0];assert.equal(row.state,'DEAD');assert.equal(row.attempts,5);assert.equal(row.payload_box,null);
});
test('scoped short lived tokens, client binding, expiry and live revocation',async()=>{
 const i=await integration(),oauth=require('../backend/src/invoice/oauth');
 assert.equal((await send({...i,token:i.key.client_secret})).status,401);
 await assert.rejects(()=>oauth.issue(uuid(),i.key.client_secret),e=>e.status===401);
 const read=await oauth.issue(i.key.client_id,i.key.client_secret,'submissions:read');
 assert.equal((await send({...i,token:read.access_token})).status,403);
 await query("update invoice_access_tokens set expires_at=now()-interval '1 second' where token_hash=$1",[cfg.hash(read.access_token)]);
 await assert.rejects(()=>svc.machine(read.access_token,'submissions:read'),e=>e.status===401);
 await svc.revokeKey(i.owner,i.app.id,i.key.key.id);
 assert.equal((await send(i)).status,401);
});
test('personal override preserves original, optimistic concurrency, summary and ownership',async()=>{
 const i=await integration(),a=await account(),other=await account();await grant(a,i.app);
 const id=uuid(),xml=fixture({id,buyer:a.document});await send(i,xml);await drain();
 const doc=(await svc.documents(a)).documents[0],path='/api/customer/invoices/'+doc.id;
 const edit={method:'PUT',body:{category:'hogar',revision:0}};
 assert.equal((await request(path+'/lines/1/category',{account:other,...edit})).status,404);
 assert.equal((await request(path+'/lines/1/category',{account:a,...edit})).status,200);
 assert.equal((await request(path+'/lines/1/category',{account:a,...edit})).status,409);
 assert.equal((await request(path+'/xml',{account:a})).data,xml);
 const d=(await request(path,{account:a})).data.document;assert.equal(d.lines[0].category,'hogar');assert.equal(d.lines[0].category_trace.normalized_value,'alimentacion');
 let sum=(await request('/api/customer/invoices/summary',{account:a})).data.currencies[0];
 assert.equal(sum.purchases_minor,2380000);assert.equal(sum.linked_payments_minor,0);assert.equal(sum.categories.hogar,2380000);
 await send(i,fixture({id:uuid(),buyer:a.document,type:'CreditNote',related:id}));await drain();
 sum=(await request('/api/customer/invoices/summary',{account:a})).data.currencies[0];assert.equal(sum.purchases_minor,0);assert.equal(sum.linked_payments_minor,0);
 assert.equal((await request('/api/customer/invoices/?search=impossible-search',{account:a})).data.documents.length,0);
 const notices=(await request('/api/customer/invoices/notices',{account:a})).data.items;assert.equal(notices.length,2);
 assert.equal((await request('/api/customer/invoices/notices/'+notices[0].id+'/read',{account:other,method:'POST'})).status,404);
 assert.equal((await request('/api/customer/invoices/notices/'+notices[0].id+'/read',{account:a,method:'POST'})).status,200);
 await query("update invoice_identity_attestations set expires_at=now()-interval '1 second' where customer_id=$1",[a.id]);
 assert.equal((await request(path+'/xml',{account:a})).status,403);
 assert.equal((await svc.exportData(a)).documents.length,0);
});
test('private fiscal conflicts are not observable in technical status or partner logs',async()=>{
 const i=await integration(),a=await account();await grant(a,i.app);const id=uuid();
 await send(i,fixture({id,buyer:a.document}));await drain();
 const changed=await send(i,fixture({id,buyer:a.document,name:'Producto cambiado'}));await drain();
 assert.equal((await request('/api/invoice/v1/receipts/'+changed.data.submission_id,{token:i.token})).data.status,'PROCESSED');
 assert.equal((await query('select internal_result from invoice_submissions where id=$1',[changed.data.submission_id])).rows[0].internal_result,'CONFLICT_REVIEW');
 assert.equal((await svc.documents(a)).documents.length,1);
 const ops=require('../backend/src/invoice/operations'),date=new Date().toISOString().slice(0,10);
 assert.ok(!JSON.stringify(await ops.metrics(i.owner,i.app.id,{from:date,to:date})).includes('CONFLICT_REVIEW'));
});
test('same identifier with another country or type never delivers to the first identity',async()=>{
 const i=await integration(),a=await account();await grant(a,i.app);
 const original=fixture({id:uuid(),buyer:a.document});
 const altered=original.replace('schemeName="13"','schemeName="22"');
 await send(i,altered);await drain();assert.equal((await svc.documents(a)).documents.length,0);
 assert.notEqual(cfg.identity('13',a.document,'CO'),cfg.identity('13',a.document,'EC'));
 assert.equal((await request('/api/customer/invoices/identity/requests',{account:a,body:{kind:'IDENTITY_REVIEW',country:'CO',document_type:'13',number:'SANDBOXOTHER001'}})).data.verification_granted,false);
 const proof=(await query('select count(*)::int n from invoice_identity_attestations where customer_id=$1',[a.id])).rows[0].n;assert.equal(proof,1);
});
test('members and invitations enforce owner role and last owner; review cannot enable production',async()=>{
 const i=await integration(),ops=require('../backend/src/invoice/operations'),support=await account(false);
 const partner=(await svc.overview(i.owner)).partners[0];
 const invitation=await ops.invite(i.owner,partner.id,'SUPPORT');await ops.acceptInvite(support,invitation.invitation_token);
 await assert.rejects(()=>ops.acceptInvite(support,invitation.invitation_token),e=>e.status===404);
 assert.equal((await svc.overview(support)).apps[0].id,i.app.id);
 await assert.rejects(()=>svc.createKey(support,i.app.id),e=>e.status===404);
 await assert.rejects(()=>ops.removeMember(i.owner,partner.id,i.owner.id),e=>e.code==='LAST_OWNER');
 await assert.rejects(()=>ops.homologate(i.owner,i.app.id,{}),e=>e.code==='PROFILE_REQUIRED');
 await ops.profile(i.owner,partner.id,{entity_kind:'COMPANY',country:'CO',identification:'SANDBOXCOMPANY001',contact_email:'test@example.invalid',website:'https://example.invalid',accepted:true,terms_version:ops.TERMS.version});
 const review=await ops.homologate(i.owner,i.app.id,{sandbox_e2e:true});assert.equal(review.production_enabled,false);
 assert.equal((await request('/api/admin/invoices/overview',{account:i.owner})).status,401);
 await ops.lifecycle(i.owner,i.app.id,false);assert.equal((await send(i)).status,401);
});
test('privacy requests retain originals under hold and delete only after sandbox retention',async()=>{
 const i=await integration(),a=await account(),ops=require('../backend/src/invoice/operations'),personal=require('../backend/src/invoice/customer');await grant(a,i.app);
 await send(i,fixture({id:uuid(),buyer:a.document}));await drain();const doc=(await svc.documents(a)).documents[0];
 const request=await personal.requestReview(a,{kind:'DELETION',document_id:doc.id,reason:'Prueba de eliminación controlada'});
 await assert.rejects(()=>ops.requestDecision({id:null},request.request_id,'RESOLVED','REQUEST_COMPLETED'),e=>e.code==='RETENTION_REQUIRED');
 await query("update invoice_documents set retain_until=now()-interval '1 day',legal_hold=true where id=$1",[doc.id]);
 await assert.rejects(()=>ops.requestDecision({id:null},request.request_id,'RESOLVED','REQUEST_COMPLETED'),e=>e.code==='RETENTION_REQUIRED');
 await query('update invoice_documents set legal_hold=false where id=$1',[doc.id]);
 await ops.requestDecision({id:null},request.request_id,'RESOLVED','REQUEST_COMPLETED');
 await assert.rejects(()=>svc.document(a,doc.id),e=>e.code==='DOCUMENT_REMOVED');
 assert.equal((await svc.documents(a)).documents.length,0);
});
test('queue TTL discards encrypted content; no private recipient details enter receipts',async()=>{
 const i=await integration();const job=await send(i,fixture({id:uuid()}));assert.equal(job.status,202);
 await query("update invoice_submissions set created_at=now()-interval '1 hour' where id=$1",[job.data.submission_id]);
 await require('../backend/src/invoice/operations').retention();
 const row=(await query('select payload_box,state,internal_result from invoice_submissions where id=$1',[job.data.submission_id])).rows[0];
 assert.equal(row.payload_box,null);assert.equal(row.state,'DEAD');assert.equal(row.internal_result,'EXPIRED');
 assert.deepEqual(Object.keys((await svc.receipt(await svc.machine(i.token,'submissions:read'),job.data.submission_id))).sort(),['status','submission_id']);
});
test('real API powers Developers and Customer DOM flows without client-side secret submission',async()=>{
 const {JSDOM}=require('jsdom'),i=await integration(),a=await account();await grant(a,i.app);await send(i,fixture({id:uuid(),buyer:a.document}));await drain();
 const windows=[];
 async function ui(file,person){
  const w=new JSDOM(fs.readFileSync(file,'utf8'),{url:base,runScripts:'outside-only'}).window;windows.push(w);
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=async(path,options={})=>{const r=await request(path,{account:person,method:options.method||'GET',body:options.body?JSON.parse(options.body):undefined});return {ok:r.status<400,status:r.status,headers:r.headers,json:async()=>r.data};};
  w.eval(fs.readFileSync('developers/app.js','utf8'));
  for(let n=0;n<100&&!w.document.getElementById('status').textContent.includes('Sandbox listo');n++)await new Promise(r=>setTimeout(r,10));
  assert.match(w.document.getElementById('status').textContent,/Sandbox listo/);return w;
 }
 try{
 const dev=await ui('developers/index.html',i.owner);
 const generate=[...dev.document.querySelectorAll('button')].find(b=>b.textContent==='Generar credencial');generate.click();
 for(let n=0;n<100&&dev.document.getElementById('secret-panel').hidden;n++)await new Promise(r=>setTimeout(r,10));
 assert.match(dev.document.getElementById('secret').textContent,/client_secret: qi_sbx_/);
 assert.equal(dev.document.getElementById('send-form').elements.token,undefined);
 dev.document.getElementById('hide-secret').click();assert.equal(dev.document.getElementById('secret').textContent,'');
 const customer=await ui('developers/customer.html',a);
 assert.match(customer.document.getElementById('financial-summary').textContent,/Compras documentadas/);
 [...customer.document.querySelectorAll('button')].find(b=>b.textContent==='Ver detalle').click();
 for(let n=0;n<100&&customer.document.getElementById('detail').hidden;n++)await new Promise(r=>setTimeout(r,10));
 assert.equal(customer.document.querySelectorAll('#detail-lines tbody tr').length,1);
 assert.match(customer.document.getElementById('detail-cufe').textContent,/CUFE/);
 }finally{windows.forEach(w=>w.close());}
});
test('JavaScript server example executes and preserves idempotency against real HTTP API',async()=>{
 const i=await integration(),exec=require('node:util').promisify(require('node:child_process').execFile);
 const env={...process.env,QORI_BASE_URL:base,QORI_CLIENT_ID:i.key.client_id,QORI_CLIENT_SECRET:i.key.client_secret,QORI_IDEMPOTENCY_KEY:uuid()};
 const run=()=>exec(process.execPath,['docs/qori-invoice/examples/send.mjs'],{env,timeout:15000});
 const first=await run(),second=await run();assert.ok(!first.stdout.includes(i.key.client_secret));
 assert.equal(JSON.parse(first.stdout.split('\n')[0]).submission_id,JSON.parse(second.stdout.split('\n')[0]).submission_id);
});
test('administrative review reuses real JWT authorization without enabling production',async()=>{
 const {env}=require('../backend/src/config/env'),policy=require('../backend/src/services/adminAccessPolicy');
 // Only the fixed disposable DB. Read the existing allowlist rather than copying personal emails into fixtures.
 const admin=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'DISABLED_SYNTHETIC_HASH','Synthetic admin','QORI_SUPERADMIN') on conflict(email) do update set role='QORI_SUPERADMIN',password_setup_required=false returning id,password_version",[policy.ADMIN_EMAILS[0]])).rows[0];
 const token=require('jsonwebtoken').sign({sub:admin.id,password_version:admin.password_version,session_version:env.appSessionVersion},env.jwtSecret,{expiresIn:'5m'});
 const i=await integration(),ops=require('../backend/src/invoice/operations'),partner=(await svc.overview(i.owner)).partners[0];
 await ops.profile(i.owner,partner.id,{entity_kind:'COMPANY',country:'CO',identification:'SANDBOXCOMPANY001',contact_email:'test@example.invalid',website:'https://example.invalid',accepted:true,terms_version:ops.TERMS.version});
 const review=await ops.homologate(i.owner,i.app.id,{sandbox_e2e:true});
 const result=await request('/api/admin/invoices/reviews/'+review.id+'/decision',{token,body:{state:'REVIEW_APPROVED',code:'SANDBOX_REVIEWED'}});
 assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.production_enabled,false);
 assert.equal((await request('/api/admin/invoices/apps/'+i.app.id+'/block',{token,method:'PUT',body:{blocked:true}})).status,200);
 assert.equal((await send(i)).status,401);
 await assert.rejects(()=>ops.lifecycle(i.owner,i.app.id,true),e=>e.code==='ADMIN_BLOCK');
 const overview=await request('/api/admin/invoices/overview',{token});assert.equal(overview.status,200);assert.ok(!JSON.stringify(overview.data).includes('payload_box'));
});
test('Python example runs against the same token and submission contract',async()=>{
 const i=await integration(),exec=require('node:util').promisify(require('node:child_process').execFile);
 const result=await exec('py',['-3','docs/qori-invoice/examples/send.py'],{env:{...process.env,QORI_BASE_URL:base,QORI_CLIENT_ID:i.key.client_id,QORI_CLIENT_SECRET:i.key.client_secret,QORI_IDEMPOTENCY_KEY:uuid()},timeout:15000});
 assert.equal(JSON.parse(result.stdout.split('\n')[0]).status,'ACCEPTED');assert.ok(!result.stdout.includes(i.key.client_secret));
});
test('public OpenAPI and reference are available when the sandbox is disabled',async()=>{
 process.env.QORI_INVOICE_SANDBOX_ENABLED='false';
 try{const r=await request('/developers/openapi.yaml');assert.equal(r.status,200);const contract=JSON.parse(r.data);assert.equal(contract.openapi,'3.1.1');assert.ok(contract.paths['/api/invoice/v1/invoices']);for(const path of ['/developers/guide.html','/developers/style.css','/developers/reference.js'])assert.equal((await request(path)).status,200);}
 finally{process.env.QORI_INVOICE_SANDBOX_ENABLED='true';}
});
test('persistent application quota preserves retries; foreign issuer and oversized XML are rejected',async()=>{
 const i=await integration();await query('update invoice_apps set hourly_quota=1 where id=$1',[i.app.id]);
 const key=uuid(),xml=fixture({id:uuid()});const first=await send(i,xml,key);assert.equal(first.status,202);
 assert.equal((await send(i,xml,key)).data.submission_id,first.data.submission_id);
 const limited=await send(i,fixture({id:uuid()}));assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');
 assert.equal((await request('/api/invoice/v1/invoices',{token:i.token,key:uuid(),body:{issuer_nit:'900000001',xml}})).status,403);
 assert.equal((await send(i,'x'.repeat(524289))).status,413);
 await drain();
});
test('all module tables enable RLS; PUBLIC privileges denied and migrations mirrored',async()=>{
 const tables=(await query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'invoice_%'")).rows;
 assert.equal(tables.length,18);assert.ok(tables.every(t=>t.relrowsecurity));
 assert.equal((await query("select count(*)::int n from information_schema.table_privileges where table_name like 'invoice_%' and grantee='PUBLIC'")).rows[0].n,0);
 assert.equal(fs.readFileSync('database/migrations/20261122160317_qori_invoice_sandbox.sql','utf8'),fs.readFileSync('supabase/migrations/20261122160317_qori_invoice_sandbox.sql','utf8'));
});


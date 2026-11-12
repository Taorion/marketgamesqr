const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-welcome-local-only';process.env.RESEND_API_KEY='test-key-never-sent';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken');
const activation=require('../backend/src/services/sellerActivationService'),sellers=require('../backend/src/services/qoriSellerService'),welcome=require('../backend/src/services/sellerWelcomeService'),mail=require('../backend/src/services/sellerWelcomeMailService');
const uid=()=>crypto.randomUUID(),sign=u=>jwt.sign({sub:u.id,password_version:Number(u.password_version||0)},process.env.JWT_SECRET);
let server,base,admin,other;const originalDeliver=mail.deliver;
async function api(path,body,token=sign(admin),method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
async function create(){return activation.create(admin,{full_name:'Embajadora Bienvenida QA',email:uid()+'@example.test',document_key:String(BigInt('0x'+uid().replaceAll('-','').slice(0,12))),phone:'3105550000',city:'Bogotá',reason:'Vinculación manual para pruebas aisladas.'});}
async function approve(c){
 for(const kind of ['IDENTITY','RUT','BANK','CONTRACT'])await sellers.adminUpload(admin,c.seller.id,kind,{filename:kind+'.pdf',content_base64:Buffer.from('%PDF-1.4\n%%EOF').toString('base64'),expected_sha256:null});
 const docs=(await query('select kind,sha256 from qori_seller_documents where user_id=$1',[c.seller.id])).rows;
 await sellers.adminSubmit(admin,c.seller.id,{documents_received:true,signed_and_notarized:true,note:'Cuatro documentos recibidos y verificados para revisión.',document_hashes:Object.fromEntries(docs.map(d=>[d.kind,d.sha256]))});
 await sellers.review(admin,c.seller.id,{status:'APPROVED',note:'Identidad y documentos completos verificados por administración.',identity_checked:true,ciiu_checked:true,bank_ownership_checked:true,notarized_contract_checked:true,legal_terms_checked:true});
}
before(async()=>{assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');for(const role of ['QORI_SUPERADMIN','ADMIN']){const u=(await query('insert into app_users(email,password_hash,full_name,role) values($1,$2,$3,$4) returning *',[uid()+'@example.test','!disabled','Admin bienvenida QA',role])).rows[0];if(role==='QORI_SUPERADMIN')admin=u;else other=u;}server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{mail.deliver=originalDeliver;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('Admin verifies a manual applicant before activation without inventing acceptance or allowing payouts',async()=>{
 const c=await create();await approve(c);
 const a=(await query('select status,approval_mode,accepted_at,terms_version from qori_seller_applications where user_id=$1',[c.seller.id])).rows[0];assert.equal(a.status,'APPROVED');assert.equal(a.approval_mode,'DOCUMENTS');assert.equal(a.accepted_at,null);assert.equal(a.terms_version,'PENDING_ACTIVATION');
 assert.equal((await api('/api/seller/dashboard',undefined,sign(c.seller))).status,403);
 await assert.rejects(()=>sellers.pay(admin,{seller_id:c.seller.id,request_id:uid(),transfer_reference:'LOCAL-NOT-PAID',paid_on:'2026-01-01',expected_gross_cop:100,withholding_cop:0,transfer_verified:true,bank_ownership_checked:true}),/activada/);
 assert.equal((await welcome.preview(admin,c.seller.id)).can_send,true);
});
test('unapproved and override accounts cannot receive a false admission; non-superadmin cannot send',async()=>{
 let calls=0;mail.deliver=async()=>{calls++;return uid();};const c=await create(),body={request_id:uid(),expected_email:c.seller.email};
 const preview=await welcome.preview(admin,c.seller.id);assert.equal(preview.can_send,false);assert.match(preview.reason,/verifica/);
 assert.equal((await api('/api/admin/accounts/sellers/'+c.seller.id+'/welcome',body)).status,400);
 await sellers.authorizeAccess(admin,c.seller.id,{acknowledge_pending_documents:true,note:'Alta excepcional con documentos pendientes para prueba.'});
 assert.equal((await api('/api/admin/accounts/sellers/'+c.seller.id+'/welcome',body)).status,400);
 assert.equal((await api('/api/admin/accounts/sellers/'+c.seller.id+'/welcome',body,sign(other))).status,403);assert.equal(calls,0);
});
test('approved welcome goes only to the account email, contains single-use activation, and concurrent duplicate clicks send once',async()=>{
 const c=await create();await approve(c);let sent=[];mail.deliver=async(payload,key)=>{sent.push({payload,key});return 'fake-provider-id';};
 const path='/api/admin/accounts/sellers/'+c.seller.id+'/welcome',body={request_id:uid(),expected_email:c.seller.email};
 assert.equal((await api(path,{...body,expected_email:'another@example.test'})).status,400);
 const results=await Promise.all([api(path,body),api(path,body)]);assert.ok(results.every(r=>r.status==='SENT'));assert.equal(sent.length,1);assert.deepEqual(sent[0].payload.to,[c.seller.email]);assert.match(sent[0].payload.html,/documentos han sido verificados/);assert.match(sent[0].payload.html,/Activar mi cuenta y crear contraseña/);
 const token=sent[0].payload.text.match(/#activar=([A-Za-z0-9_-]{43})/)[1];assert.notEqual(token,new URL(c.activation.url).hash.slice(9));assert.equal((await activation.inspect({token})).seller.email,c.seller.email);
 const stored=(await query('select * from qori_seller_welcome_emails where request_id=$1',[body.request_id])).rows[0];assert.equal(stored.encrypted_payload,null);assert.equal(stored.provider_id,'fake-provider-id');assert.equal(stored.status,'SENT');
 const history=await welcome.preview(admin,c.seller.id);assert.equal(history.history[0].status,'SENT');assert.equal(JSON.stringify(history).includes(token),false);
 const audit=(await query('select detail from qori_commercial_audit where entity_id=$1',[c.seller.id])).rows;assert.equal(JSON.stringify(audit).includes(token),false);
 await activation.complete({token,password:'WelcomePersonal2026!',password_confirm:'WelcomePersonal2026!',terms_version:require('../backend/src/services/qoriSellerPolicy').VERSION,terms_accepted:true,privacy_accepted:true,adult_confirmed:true},'127.0.0.1');
 const login=await api('/api/auth/demo/login',{email:c.seller.email,password:'WelcomePersonal2026!'},null);assert.equal(login.status,200);assert.equal(login.user.demo_mode,true);
});
test('an uncertain provider result can retry the same encrypted request and idempotency key',async()=>{
 const c=await create();await approve(c);const sent=[],body={request_id:uid(),expected_email:c.seller.email};
 mail.deliver=async(payload,key)=>{sent.push({payload,key});if(sent.length===1)throw Error('Simulated timeout after acceptance');return 'same-provider-id';};
 const first=await welcome.send(admin,c.seller.id,body);assert.equal(first.status,'FAILED');
 const stored=(await query('select * from qori_seller_welcome_emails where request_id=$1',[body.request_id])).rows[0];assert.ok(Buffer.isBuffer(stored.encrypted_payload));assert.equal(stored.encrypted_payload.includes(Buffer.from('#activar=')),false);
 const second=await welcome.send(admin,c.seller.id,body);assert.equal(second.status,'SENT');assert.deepEqual(sent[0],sent[1]);
});
test('changed activation links and suspension stop retries; active accounts receive login without password replacement',async()=>{
 const c=await create();await approve(c);mail.deliver=async()=>{throw Error('Simulated outage');};const body={request_id:uid(),expected_email:c.seller.email};assert.equal((await welcome.send(admin,c.seller.id,body)).status,'FAILED');
 const fresh=await activation.renew(admin,c.seller.id);let calls=0;mail.deliver=async()=>{calls++;return uid();};assert.equal((await welcome.send(admin,c.seller.id,body)).status,'CANCELLED');assert.equal(calls,0);
 const token=new URL(fresh.activation.url).hash.slice(9);await activation.complete({token,password:'AlreadyActivated2026!',password_confirm:'AlreadyActivated2026!',terms_version:require('../backend/src/services/qoriSellerPolicy').VERSION,terms_accepted:true,privacy_accepted:true,adult_confirmed:true},'127.0.0.1');
 await query("update qori_seller_welcome_emails set created_at=now()-interval '2 minutes' where request_id=$1",[body.request_id]);const before=(await query('select password_hash,password_version from app_users where id=$1',[c.seller.id])).rows[0];let payload;
 mail.deliver=async p=>{payload=p;return uid();};assert.equal((await welcome.send(admin,c.seller.id,{request_id:uid(),expected_email:c.seller.email})).status,'SENT');assert.match(payload.html,/Entrar a Qori Seller/);assert.doesNotMatch(payload.text,/#activar=/);assert.deepEqual((await query('select password_hash,password_version from app_users where id=$1',[c.seller.id])).rows[0],before);
 await query('update app_users set is_active=false where id=$1',[c.seller.id]);await assert.rejects(()=>welcome.send(admin,c.seller.id,{request_id:uid(),expected_email:c.seller.email}),/suspendida/);
});

const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-activation-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
let server,base,admin,other;const uid=()=>crypto.randomUUID();
const sign=u=>jwt.sign({sub:u.id,password_version:Number(u.password_version||0)},process.env.JWT_SECRET);
async function user(role){return (await query('insert into app_users(email,password_hash,full_name,role) values($1,$2,$3,$4) returning *',[uid()+'@example.test','!disabled','Administrador QA',role])).rows[0];}
async function api(path,body,token=sign(admin),method=body?'POST':'GET') {const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
const data=()=>({full_name:'Embajador Manual QA',email:uid()+'@example.test',document_key:String(Date.now())+Math.floor(Math.random()*100),phone:'3100000000',city:'Bogotá',reason:'Alta manual para probar activación local.'});
async function create(){const payload=data(),result=await api('/api/admin/accounts/sellers',payload);assert.equal(result.status,200,JSON.stringify(result));return {...result,payload,token:new URL(result.activation.url).hash.slice('#activar='.length)};}
const complete=token=>({token,password:'UnaClavePersonal2026!',password_confirm:'UnaClavePersonal2026!',terms_version:require('../backend/src/services/qoriSellerPolicy').VERSION,terms_accepted:true,privacy_accepted:true,adult_confirmed:true});
before(async()=>{assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');admin=await user('QORI_SUPERADMIN');other=await user('ADMIN');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('only superadmin creates a pending account and dossier, without a password or forged acceptance',async()=>{
 assert.equal((await api('/api/admin/accounts/sellers',data(),sign(other))).status,403);
 assert.equal((await api('/api/admin/accounts/sellers',data(),null)).status,401);
 const c=await create();assert.equal(c.seller.password_setup_required,true);assert.equal(c.credentials,undefined);
 const u=(await query('select * from app_users where id=$1',[c.seller.id])).rows[0],a=(await query('select * from qori_seller_applications where user_id=$1',[u.id])).rows[0];
 assert.match(u.password_hash,/^!pending-activation-/);assert.equal(a.accepted_at,null);assert.equal(a.status,'DRAFT');assert.equal(a.terms_version,'PENDING_ACTIVATION');
 const stored=(await query('select * from qori_seller_activations where user_id=$1',[u.id])).rows[0];assert.equal(stored.token_hash,crypto.createHash('sha256').update(c.token).digest('hex'));assert.equal(JSON.stringify(stored).includes(c.token),false);
 assert.equal((await api('/api/auth/me',undefined,sign(u))).status,403);
 const detail=await api('/api/admin/accounts/sellers/'+u.id);assert.equal(detail.record.password_setup_required,true);assert.equal(JSON.stringify(detail).includes(c.token),false);
 const audit=(await query("select detail from qori_commercial_audit where entity_id=$1 and action='SELLER_MANUALLY_CREATED'",[u.id])).rows[0].detail;assert.equal(audit.terms_accepted,false);assert.equal(JSON.stringify(audit).includes(c.token),false);
});
test('duplicate email/document cannot replace another account or change its password',async()=>{
 const c=await create(),u=(await query('select password_hash from app_users where id=$1',[c.seller.id])).rows[0];
 assert.equal((await api('/api/admin/accounts/sellers',{...data(),email:c.payload.email.toUpperCase()})).status,400);
 assert.equal((await api('/api/admin/accounts/sellers',{...data(),document_key:c.payload.document_key})).status,400);
 assert.equal((await query('select password_hash from app_users where id=$1',[c.seller.id])).rows[0].password_hash,u.password_hash);
 const document=data().document_key;
 const results=await Promise.all([api('/api/admin/accounts/sellers',{...data(),document_key:document}),api('/api/admin/accounts/sellers',{...data(),document_key:document})]);
 assert.equal(results.filter(r=>r.status===200).length,1);assert.ok(results.every(r=>[200,400,409].includes(r.status)));
});
test('first access requires matching password, current terms and explicit acceptance; remains pending commercial approval',async()=>{
 const c=await create(),preview=await api('/api/seller/activation/preview',{token:c.token},null);assert.equal(preview.status,200);assert.equal(preview.seller.email,c.payload.email);
 assert.equal((await api('/api/seller/activation/complete',{...complete(c.token),password_confirm:'OtraClavePersonal2026!'},null)).status,400);
 assert.equal((await api('/api/seller/activation/complete',{...complete(c.token),terms_accepted:false},null)).status,400);
 const activated=await api('/api/seller/activation/complete',complete(c.token),null);assert.equal(activated.status,200,JSON.stringify(activated));
 const a=(await query('select accepted_at,terms_version,status from qori_seller_applications where user_id=$1',[c.seller.id])).rows[0];assert.ok(a.accepted_at);assert.equal(a.status,'DRAFT');assert.equal(a.terms_version,complete(c.token).terms_version);
 const login=await api('/api/auth/login',{email:c.payload.email,password:complete(c.token).password},null);assert.equal(login.status,200);assert.equal(login.user.role,'QORI_SELLER');
 assert.equal((await api('/api/seller/demo/session',{},login.token)).status,403);
 assert.equal((await api('/api/seller/activation/preview',{token:c.token},null)).status,400);
 assert.equal((await api('/api/admin/accounts/sellers/'+c.seller.id+'/activation',{})).status,400);
});
test('admin can attach documents and grant access before activation, but Seller and Demo stay locked until password setup',async()=>{
 const c=await create();
 const upload=await api('/api/seller/admin/applications/'+c.seller.id+'/documents/IDENTITY',{filename:'identity.pdf',content_base64:Buffer.from('%PDF-1.4\n%%EOF').toString('base64'),expected_sha256:null},sign(admin),'PUT');assert.equal(upload.status,200,JSON.stringify(upload));
 assert.equal((await api('/api/seller/admin/applications/'+c.seller.id+'/authorize-access',{note:'Alta expresa de prueba, documentos pendientes.',acknowledge_pending_documents:true})).status,200);
 assert.equal((await api('/api/seller/demo/session',{},sign(c.seller))).status,403);
 assert.equal((await api('/api/seller/activation/complete',complete(c.token),null)).status,200);
 const login=await api('/api/auth/demo/login',{email:c.payload.email,password:complete(c.token).password},null);assert.equal(login.status,200);assert.equal(login.user.demo_mode,true);
});
test('renewal invalidates the previous link, expires, and suspension blocks activation',async()=>{
 const c=await create();assert.equal((await api('/api/admin/accounts/sellers/'+c.seller.id+'/activation',{},sign(other))).status,403);
 const renewed=await api('/api/admin/accounts/sellers/'+c.seller.id+'/activation',{}),fresh=new URL(renewed.activation.url).hash.slice(9);assert.equal(renewed.status,200);assert.notEqual(fresh,c.token);
 assert.equal((await api('/api/seller/activation/preview',{token:c.token},null)).status,400);
 await query('update app_users set is_active=false where id=$1',[c.seller.id]);assert.equal((await api('/api/seller/activation/preview',{token:fresh},null)).status,400);
 await query('update app_users set is_active=true where id=$1',[c.seller.id]);await query("update qori_seller_activations set expires_at=now()-interval '1 minute' where user_id=$1",[c.seller.id]);assert.equal((await api('/api/seller/activation/preview',{token:fresh},null)).status,400);
});
test('concurrent activation uses one token once, and another password path cannot bypass activation',async()=>{
 const c=await create();await query('update app_users set password_hash=$2 where id=$1',[c.seller.id,await bcrypt.hash(complete(c.token).password,4)]);
 assert.equal((await api('/api/auth/login',{email:c.payload.email,password:complete(c.token).password},null)).status,403);
 // Call the service to isolate atomicity from the HTTP rate limiter.
 const service=require('../backend/src/services/sellerActivationService');
 const results=await Promise.allSettled([service.complete(complete(c.token),'127.0.0.1'),service.complete(complete(c.token),'127.0.0.1')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await query("select count(*)::int n from qori_commercial_audit where entity_id=$1 and action='SELLER_ACTIVATED'",[c.seller.id])).rows[0].n,1);
});

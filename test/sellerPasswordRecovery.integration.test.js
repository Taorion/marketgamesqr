const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='seller-recovery-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const delivered=[];
require('../backend/src/services/passwordResetMailService').sendPasswordResetEmail=async message=>delivered.push(message);
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
const recovery=require('../backend/src/services/sellerPasswordRecoveryService'),auth=require('../backend/src/controllers/authController');
const ids=[],reason='El embajador solicitó recuperar su acceso.',password='NuevaClavePersonal2026!';
let server,base,admin,sandra;
const sign=u=>jwt.sign({sub:u.id,password_version:Number(u.password_version||0)},process.env.JWT_SECRET);
async function user(role='QORI_SELLER',pending=false){const u=(await query('insert into app_users(email,password_hash,full_name,role,password_setup_required) values($1,$2,$3,$4,$5) returning *',[crypto.randomUUID()+'@example.test',await bcrypt.hash('AnteriorClavePersonal!',4),'Embajador recuperación QA',role,pending])).rows[0];ids.push(u.id);return u;}
async function api(path,body,actor=admin){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+sign(actor)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,...await r.json()};}
const raw=r=>new URL(r.recovery.url).hash.slice('#recuperar='.length);
const resetBody=(token,pass=password)=>({token,password:pass,password_confirm:pass});
// Controller boundary with the real QA database; no HTTP rate-limit exhaustion across negative cases.
async function controller(fn,body){return new Promise(resolve=>{const res={set(){return res;},json(data){resolve({status:200,...data});}};fn({body,ip:'127.0.0.1',headers:{}},res,error=>resolve({status:error.status||500,error}));});}
before(async()=>{assert.equal((await query('select current_database() n')).rows[0].n,'qori_customer_qa');admin=await require('./helpers/adminIdentity').admin(query);sandra=await require('./helpers/adminIdentity').admin(query,'scasallas@gosqori.com');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await query("delete from qori_commercial_audit where entity_id=any($1::uuid[])",[ids]);await query('delete from app_users where id=any($1::uuid[])',[ids]);await pool.end();});

test('only the two authorized administrators may issue a link; activation, suspended and non-Seller accounts are excluded',async()=>{
  const seller=await user(),pretender=await user('QORI_SUPERADMIN'),business=await user('BUSINESS_OWNER'),pending=await user('QORI_SELLER',true);
  const path='/api/admin/accounts/sellers/'+seller.id+'/password-reset';
  for(const actor of [seller,pretender])assert.equal((await api(path,{reason},actor)).status,403);
  assert.equal((await api(path,{reason},null)).status,401);
  for(const actor of [admin,sandra])assert.equal((await api(path,{reason},actor)).status,200);
  assert.equal((await api(path,{reason:'corto'})).status,400);
  for(const [u,status] of [[business,404],[pending,400]])assert.equal((await api('/api/admin/accounts/sellers/'+u.id+'/password-reset',{reason})).status,status);
  await query('update app_users set is_active=false where id=$1',[seller.id]);
  assert.equal((await api(path,{reason})).status,400);
});

test('regeneration replaces the old link, stores only a hash, audits the actor and closes old sessions only upon reset',async()=>{
  const seller=await user(),path='/api/admin/accounts/sellers/'+seller.id+'/password-reset';
  const first=await api(path,{reason}),second=await api(path,{reason});assert.equal(second.status,200);
  assert.match(second.headers.get('cache-control'),/no-store/);assert.match(second.recovery.url,/\/seller\/#recuperar=/);
  const token=raw(second),stored=(await query('select * from password_reset_tokens where token_hash=$1',[crypto.createHash('sha256').update(token).digest('hex')])).rows[0];
  assert.ok(stored);assert.equal(JSON.stringify(stored).includes(token),false);
  assert.equal(new Date(stored.expires_at)-new Date(stored.created_at),30*60_000);
  assert.equal((await api('/api/auth/me',null,seller)).status,200);
  const unchanged=(await query('select * from app_users where id=$1',[seller.id])).rows[0];assert.equal(unchanged.password_hash,seller.password_hash);
  assert.equal((await api('/api/auth/password/reset',resetBody(raw(first)),null)).status,400);
  const changed=await api('/api/auth/password/reset',resetBody(token),null);assert.equal(changed.status,200,JSON.stringify(changed));assert.equal(changed.next_url,'/seller/');
  assert.equal((await api('/api/auth/password/reset',resetBody(token),null)).status,400);
  assert.equal((await api('/api/auth/me',null,seller)).status,401);
  const login=await api('/api/auth/login',{email:seller.email,password},null);assert.equal(login.status,200);assert.equal(login.user.role,'QORI_SELLER');assert.equal(login.user.admin_access,false);
  const after=(await query('select * from app_users where id=$1',[seller.id])).rows[0];assert.equal(after.is_active,true);assert.equal(after.password_setup_required,false);assert.ok(after.password_version>seller.password_version);
  const audit=(await query("select * from qori_commercial_audit where entity_id=$1 and action='SELLER_PASSWORD_RECOVERY_ISSUED'",[seller.id])).rows;assert.equal(audit.length,2);assert.ok(audit.every(a=>a.actor_id===admin.id&&a.detail.reason===reason));assert.equal(JSON.stringify(audit).includes(token),false);assert.equal(delivered.length,0);
});

test('concurrent generation leaves one usable token; concurrent consumption succeeds once',async()=>{
  const seller=await user(),issued=await Promise.all([recovery.issue(admin,seller.id,{reason}),recovery.issue(sandra,seller.id,{reason})]);
  assert.equal((await query('select count(*)::int n from password_reset_tokens where user_id=$1 and used_at is null',[seller.id])).rows[0].n,1);
  const active=(await query('select token_hash from password_reset_tokens where user_id=$1 and used_at is null',[seller.id])).rows[0];
  const token=issued.map(raw).find(t=>crypto.createHash('sha256').update(t).digest('hex')===active.token_hash);
  const results=await Promise.all([controller(auth.resetPassword,resetBody(token)),controller(auth.resetPassword,resetBody(token))]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
});

test('expired, suspended, deleted and role-changed accounts cannot consume an issued Seller link',async()=>{
  for(const sql of ["update password_reset_tokens set expires_at=now()-interval '1 minute' where user_id=$1",'update app_users set is_active=false where id=$1','update app_users set deactivated_at=now() where id=$1',"update app_users set role='BUSINESS_OWNER' where id=$1"]){
    const seller=await user(),link=await recovery.issue(admin,seller.id,{reason});await query(sql,[seller.id]);
    assert.equal((await controller(auth.resetPassword,resetBody(raw(link)))).status,400);
    assert.equal((await query('select password_hash from app_users where id=$1',[seller.id])).rows[0].password_hash,seller.password_hash);
  }
});

test('Seller passwords require 12 characters and fit bcrypt; failed validation does not consume the link',async()=>{
  const seller=await user(),link=await recovery.issue(admin,seller.id,{reason});
  for(const pass of ['12345678','á'.repeat(40)])assert.equal((await controller(auth.resetPassword,resetBody(raw(link),pass))).status,400);
  assert.equal((await controller(auth.resetPassword,resetBody(raw(link)))).status,200);
});

test('self-service emails open Seller, invalidate admin links and keep pending activation private; Empresa keeps its destination',async()=>{
  const seller=await user(),pending=await user('QORI_SELLER',true),old=await recovery.issue(admin,seller.id,{reason});
  const r=await controller(auth.requestPasswordReset,{email:seller.email});assert.equal(r.status,200);assert.match(delivered.at(-1).resetUrl,/\/seller\/#recuperar=/);
  assert.equal((await controller(auth.resetPassword,resetBody(raw(old)))).status,400);
  const before=delivered.length,p=await controller(auth.requestPasswordReset,{email:pending.email}),unknown=await controller(auth.requestPasswordReset,{email:'missing-'+crypto.randomUUID()+'@example.test'});assert.deepEqual(p,unknown);assert.equal(delivered.length,before);
  const owner=await user('BUSINESS_OWNER'),o=await controller(auth.requestPasswordReset,{email:owner.email});assert.match(o.reset_url,/\/empresa\/\?reset_token=/);assert.equal((await controller(auth.resetPassword,resetBody(o.reset_token,'Owner1234'))).next_url,'/empresa/');
});

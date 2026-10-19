const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');

test('admin roles and delegated permissions are enforced against real persisted users',{skip:process.env.QORI_COMMERCIAL_QA!=='true'},async t=>{
  const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');
  const {pool}=require('../backend/src/config/db'),{env}=require('../backend/src/config/env');
  const jwt=require('jsonwebtoken'),express=require('express');
  const {DEFAULT_PERMISSIONS,PERMISSIONS}=require('../backend/src/services/adminPermissions');
  const {authRequired,canAccessBusiness}=require('../backend/src/middleware/auth');
  const app=express();app.use(express.json());app.use('/api/admin',require('../backend/src/routes/adminRoutes'));
  app.get('/api/qa/business/:id',authRequired,(req,res)=>res.status(canAccessBusiness(req.user,req.params.id)?200:403).json({role:req.user.role}));
  app.use(require('../backend/src/middleware/errorHandler').errorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`,c='/api/admin/commercial';
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
  const prefix=`permissions-${randomUUID()}`;
  const business=(await pool.query("insert into businesses(name,slug,plan_code,is_active) values($1,$1,'PRO',true) returning id",[prefix])).rows[0];
  async function account(suffix,role='QORI_SELLER',platform=null){return (await pool.query(`insert into app_users(email,full_name,password_hash,role,platform_role,business_id)
    values($1,$2,'qa-no-login',$3,$4,$5) returning *`,[`${prefix}-${suffix}@example.test`,suffix,role,platform,role.startsWith('BUSINESS')?business.id:null])).rows[0];}
  async function token(account){const u=(await pool.query('select * from app_users where id=$1',[account.id])).rows[0];return jwt.sign({sub:u.id,role:'QORI_SUPERADMIN',admin_permissions:Object.keys(PERMISSIONS),password_version:u.password_version||0,session_version:env.appSessionVersion},env.jwtSecret);}
  async function call(path,auth,body,expected=200,method=body===undefined?'GET':'POST'){
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(result)}`);return result;
  }
  const root=await account('root','QORI_SUPERADMIN'),seller=await account('seller'),other=await account('other'),dual=await account('dual','BUSINESS_OWNER','QORI_SELLER');
  const rootToken=await token(root);let sellerToken=await token(seller),dualToken=await token(dual);
  const access=(u,permissions,role='QORI_SELLER',auth=rootToken,expected=200)=>call(c+`/sellers/${u.id}/access`,auth,{role,permissions,reason:'QA authorized role change'},expected,'PATCH');
  const prospectBody={business_name:'QA prospect',contact_name:'QA Contact',email:`${prefix}-prospect@example.test`};
  const policyBody={name:'QA delegated policy',plan_codes:['STARTER'],max_discount_percent:10,max_discount_months:1,max_trial_days:5,max_bonus_tickets:5,max_benefit_days:0,expires_at:new Date(Date.now()+86400000).toISOString()};
  let prospect,deal;
  await t.test('standard accounts ignore forged token claims and cannot delegate access',async()=>{
    const boot=await call(c+'/bootstrap',sellerToken);assert.deepEqual(boot.user.permissions,DEFAULT_PERMISSIONS);assert.equal(boot.user.can_see_team,false);
    await access(other,[], 'QORI_SUPERADMIN',sellerToken,403);
    await call(c+'/sellers',sellerToken,{full_name:'Forbidden',email:'forbidden@example.test'},403);
    await call(c+'/policies',sellerToken,policyBody,403);await call(c+'/audit',sellerToken);
    await call('/api/admin/users',sellerToken,undefined,403);
    prospect=(await call(c+'/prospects',await token(other),prospectBody)).prospect;
    deal=(await call(c+'/deals',await token(other),{prospect_id:prospect.id,terms:{plan_code:'STARTER'},reason:'Needs exception approval'})).deal;
  });
  await t.test('removing a permission blocks its API immediately and closes the old session',async()=>{
    await access(seller,[]);await call(c+'/bootstrap',sellerToken,undefined,401);sellerToken=await token(seller);
    assert.deepEqual((await call(c+'/bootstrap',sellerToken)).user.permissions,[]);
    await call(c+'/prospects',sellerToken,prospectBody,403);
    await call(c+'/enrollments/descubre',sellerToken,{},403);
    await call(c+'/deals',sellerToken,{},403);
    await call(c+`/deals/${deal.id}/apply`,sellerToken,{},403);
    await call(c+`/deals/${deal.id}/cancel`,sellerToken,{reason:'Not permitted'},403);
  });
  await t.test('global permissions cannot be granted to the seller role',async()=>{
    for(const permission of Object.keys(PERMISSIONS).filter(p=>!DEFAULT_PERMISSIONS.includes(p))) {
      await access(seller,[permission],'QORI_SELLER',rootToken,400);
    }
    await access(seller,DEFAULT_PERMISSIONS);sellerToken=await token(seller);
    assert.equal((await call(c+'/bootstrap',sellerToken)).user.can_see_team,false);
  });
  await t.test('legacy global grants never widen seller access or allow team administration',async()=>{
    await pool.query('update app_users set admin_permissions=$2 where id=$1',[seller.id,Object.keys(PERMISSIONS)]);
    sellerToken=await token(seller);
    const boot=await call(c+'/bootstrap',sellerToken);
    assert.deepEqual(boot.user.permissions,DEFAULT_PERMISSIONS);assert.equal(boot.user.can_see_team,false);
    assert.deepEqual(boot.sellers.map(s=>s.id),[seller.id]);
    await call(c+'/sellers',sellerToken,{full_name:'Forbidden',email:'forbidden@example.test'},403);
    await call(c+`/sellers/${other.id}`,sellerToken,undefined,403);
    await call(c+`/sellers/${other.id}`,sellerToken,{full_name:'Cannot edit'},403,'PATCH');
    await call(c+`/sellers/${other.id}`,sellerToken,undefined,403,'DELETE');
    await call(c+'/policies',sellerToken,policyBody,403);
    await call(c+`/deals/${deal.id}/decision`,sellerToken,{decision:'APPROVED',reason:'Not permitted'},403);
    await call(c+`/customers/${business.id}`,sellerToken,{is_active:false,reason:'Not permitted'},403,'PATCH');
    assert.equal((await call(c+'/prospects',sellerToken)).rows.length,0);
    await call(c+`/prospects?seller_id=${other.id}`,sellerToken,undefined,403);
    await call(c+`/audit?seller_id=${other.id}`,sellerToken,undefined,403);
    await call('/api/admin/users',sellerToken,undefined,403);
    await call('/api/qa/business/'+business.id,sellerToken,undefined,403);
  });
  await t.test('promoting an existing business user preserves identity and separates portal scope',async()=>{
    const before=(await pool.query('select * from app_users where id=$1',[dual.id])).rows[0];
    await access(dual,[],'QORI_SUPERADMIN');dualToken=await token(dual);
    const boot=await call(c+'/bootstrap',dualToken);assert.equal(boot.user.role,'QORI_SUPERADMIN');assert.deepEqual(boot.user.permissions,Object.keys(PERMISSIONS));
    assert.ok(boot.sellers.some(s=>s.id===root.id));await call('/api/admin/users',dualToken);
    await call('/api/qa/business/'+business.id,dualToken);await call('/api/qa/business/'+randomUUID(),dualToken,undefined,403);
    const after=(await pool.query('select * from app_users where id=$1',[dual.id])).rows[0];
    for(const key of ['id','business_id','branch_id','role','email','password_hash'])assert.equal(after[key],before[key]);
    await access(dual,DEFAULT_PERMISSIONS);await call(c+'/bootstrap',dualToken,undefined,401);
    dualToken=await token(dual);assert.equal((await call(c+'/bootstrap',dualToken)).user.role,'QORI_SELLER');await call('/api/admin/users',dualToken,undefined,403);
  });
  await t.test('pure commercial accounts can be promoted, demoted, revoked and restored',async()=>{
    await access(other,[],'QORI_SUPERADMIN');assert.equal((await call(c+'/bootstrap',await token(other))).user.role,'QORI_SUPERADMIN');
    await access(other,[],'NONE');await call(c+'/bootstrap',await token(other),undefined,401);
    await access(other,DEFAULT_PERMISSIONS);assert.equal((await call(c+'/bootstrap',await token(other))).user.role,'QORI_SELLER');
    await access(dual,[],'NONE');dualToken=await token(dual);await call(c+'/bootstrap',dualToken,undefined,403);await call('/api/qa/business/'+business.id,dualToken);
  });
  await t.test('self changes, unknown permissions and concurrent mutual demotion are blocked',async()=>{
    await access(root,[],'NONE',rootToken,403);
    await access(seller,['invented.permission'],'QORI_SELLER',rootToken,400);
    await call(c+`/sellers/${seller.id}/access`,rootToken,{role:'ADMIN',permissions:[],reason:'Unknown role'},400,'PATCH');
    const a=await account('root-a','QORI_SUPERADMIN'),b=await account('root-b','QORI_SUPERADMIN');
    const at=await token(a),bt=await token(b);
    const results=await Promise.all([[a,bt],[b,at]].map(async([u,auth])=>fetch(base+c+`/sellers/${u.id}/access`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth}`},body:JSON.stringify({role:'QORI_SELLER',permissions:[],reason:'Concurrent demotion'})})));
    assert.equal(results.filter(r=>r.status===200).length,1);
    assert.ok(results.some(r=>[401,403].includes(r.status)));
    const remain=await pool.query("select id from app_users where id=any($1::uuid[]) and role='QORI_SUPERADMIN' and is_active",[[a.id,b.id]]);assert.equal(remain.rowCount,1);
  });
  await t.test('permission changes have auditable before/after records without credentials',async()=>{
    const audit=(await pool.query("select detail from qori_commercial_audit where entity_id=$1 and action='ADMIN_ACCESS_UPDATED'",[seller.id])).rows;
    assert.ok(audit.length>=2);assert.ok(audit.every(a=>a.detail.reason&&Array.isArray(a.detail.permissions)));
    assert.equal(JSON.stringify(audit).includes('password'),false);
  });
});

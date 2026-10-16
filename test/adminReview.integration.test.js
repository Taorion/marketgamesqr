const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');

test('admin review: session revocation and customer search',{skip:process.env.QORI_COMMERCIAL_QA!=='true'},async t=>{
  const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');
  const {pool}=require('../backend/src/config/db'),{env}=require('../backend/src/config/env');
  const express=require('express'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
  const app=express();app.use(express.json());app.use('/api/admin',require('../backend/src/routes/adminRoutes'));app.use('/api/auth',require('../backend/src/routes/authRoutes'));app.use(require('../backend/src/middleware/errorHandler').errorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
  const base=`http://127.0.0.1:${server.address().port}`,prefix=`review-${randomUUID()}`;
  async function account(suffix,role,businessId=null){return (await pool.query("insert into app_users(email,full_name,password_hash,role,business_id) values($1,$2,'qa-no-login',$3,$4) returning *",[`${prefix}-${suffix}@example.test`,suffix,role,businessId])).rows[0];}
  async function token(user){const row=(await pool.query('select * from app_users where id=$1',[user.id])).rows[0];return jwt.sign({sub:row.id,password_version:row.password_version||0,session_version:env.appSessionVersion},env.jwtSecret);}
  async function call(path,auth,body,status=200){const r=await fetch(base+path,{method:body?'PATCH':'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth}`},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
  const root=await account('root','QORI_SUPERADMIN'),seller=await account('seller','QORI_SELLER'),other=await account('other','QORI_SELLER');
  const rootToken=await token(root),sellerToken=await token(seller),otherToken=await token(other);
  const businesses=[];
  for(const [suffix,active,days] of [['active',true,5],['expired',true,-1],['suspended',false,5]]){
    const row=(await pool.query("insert into businesses(name,slug,plan_code,subscription_status,subscription_current_period_ends_at,is_active,settings) values($1,$1,'DESCUBRE','ACTIVE',now()+($2*interval '1 day'),$3,$4::jsonb) returning *",[prefix+'-'+suffix,days,active,JSON.stringify({contact_email:prefix+'-'+suffix+'@example.test',nit:prefix+'-doc-'+suffix,phone:prefix+'-phone-'+suffix})])).rows[0];businesses.push(row);
    await pool.query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[row.id,seller.id,root.id]);
  }
  const owner=await account('owner','BUSINESS_OWNER',businesses[0].id);
  await t.test('password reset invalidates prior sessions and outstanding recovery links',async()=>{
    const before=await token(owner);
    await pool.query("insert into password_reset_tokens(user_id,token_hash,expires_at) values($1,$2,now()+interval '1 hour')",[owner.id,prefix]);
    await call('/api/admin/users/'+owner.id,rootToken,{password:'Review-QA-Password!2026'});
    await call('/api/auth/me',before,undefined,401);
    await call('/api/auth/me',await token(owner));
    const stored=(await pool.query('select * from app_users where id=$1',[owner.id])).rows[0];assert.ok(await bcrypt.compare('Review-QA-Password!2026',stored.password_hash));
    assert.ok((await pool.query('select used_at from password_reset_tokens where token_hash=$1',[prefix])).rows[0].used_at);
    const version=stored.password_version;
    await call('/api/admin/users/'+owner.id,rootToken,{full_name:'Updated profile only'});
    assert.equal((await pool.query('select password_version from app_users where id=$1',[owner.id])).rows[0].password_version,version);
  });
  await t.test('access changes close old sessions; legacy editor cannot reset platform accounts',async()=>{
    const before=await token(owner);
    await call('/api/admin/users/'+owner.id,rootToken,{role:'BUSINESS_MANAGER'});
    await call('/api/auth/me',before,undefined,401);
    await call('/api/admin/users/'+seller.id,rootToken,{password:'Cannot-reset-this!2026'},403);
    await call('/api/admin/users/'+owner.id,sellerToken,{is_active:false},403);
  });
  await t.test('search finds billing document, email and phone but keeps seller ownership',async()=>{
    for(const search of [prefix+'-active@example.test',prefix+'-doc-active',prefix+'-phone-active']){
      const path='/api/admin/commercial/customers?search='+encodeURIComponent(search);
      assert.deepEqual((await call(path,sellerToken)).rows.map(b=>b.id),[businesses[0].id]);
      assert.equal((await call(path,otherToken)).rows.length,0);
    }
  });
  await t.test('trial deadline filters and suspension match persisted access, not stale ACTIVE status',async()=>{
    for(const [status,index] of [['DESCUBRE_ACTIVE',0],['DESCUBRE_EXPIRED',1],['SUSPENDED',2]]){
      const data=await call(`/api/admin/commercial/customers?search=${prefix}&status=${status}`,sellerToken);
      assert.deepEqual(data.rows.map(b=>b.id),[businesses[index].id]);assert.equal(data.has_more,false);
      if(index===1)assert.equal(data.rows[0].subscription.portal_access_allowed,false);
    }
  });
});

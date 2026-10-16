const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomInt}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

test('Descubre is granted once per billing document for the lifetime of the identity',{skip:process.env.QORI_COMMERCIAL_QA!=='true'},async t=>{
  const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');
  const {pool}=require('../backend/src/config/db'),{env}=require('../backend/src/config/env');
  const jwt=require('jsonwebtoken'),express=require('express');
  const {normalizeDocument}=require('../backend/src/services/signupIdentityService');
  const app=express();app.use(express.json());app.use('/api/admin',require('../backend/src/routes/adminRoutes'));
  app.use('/api/public',require('../backend/src/routes/packageSalesRoutes'));
  app.use(require('../backend/src/middleware/errorHandler').errorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`,endpoint='/api/admin/commercial/enrollments/descubre';
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
  const prefix=`once-${randomUUID()}`,password='Once-QA-Only!2026';
  async function actor(role,suffix){
    const u=(await pool.query("insert into app_users(email,full_name,password_hash,role) values($1,$2,'qa-no-login',$3) returning id",[`${prefix}-${suffix}@example.test`,suffix,role])).rows[0];
    return jwt.sign({sub:u.id,password_version:0,session_version:env.appSessionVersion},env.jwtSecret);
  }
  const root=await actor('QORI_SUPERADMIN','root'),seller=await actor('QORI_SELLER','seller'),other=await actor('QORI_SELLER','other');
  const document=()=>`${Date.now()}${randomInt(100000,999999)}`;
  const input=nit=>({request_id:randomUUID(),company_name:'QA Once Only',contact_name:'QA Titular',nit,email:`${randomUUID()}@example.test`,phone:'3001234567',password,password_confirm:password,terms_accepted:true,privacy_accepted:true});
  async function call(route,auth,body,expected=200,method=body===undefined?'GET':'POST'){
    const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await r.json();if(expected!==null)assert.equal(r.status,expected,`${route}: ${JSON.stringify(result)}`);return {status:r.status,...result};
  }
  const original=input(document());let enrolled;
  await t.test('first enrollment claims a document permanently and retries do not grant more time',async()=>{
    enrolled=await call(endpoint,seller,original);
    const claim=(await pool.query('select * from qori_descubre_documents where document_key=$1',[original.nit])).rows[0];assert.equal(claim.business_id,enrolled.business_id);
    const end=(await pool.query('select subscription_current_period_ends_at from businesses where id=$1',[enrolled.business_id])).rows[0].subscription_current_period_ends_at;
    const retried=await call(endpoint,seller,original);assert.equal(retried.already_created,true);assert.equal(retried.business_id,enrolled.business_id);
    assert.equal((await pool.query('select subscription_current_period_ends_at from businesses where id=$1',[enrolled.business_id])).rows[0].subscription_current_period_ends_at.toISOString(),end.toISOString());
  });
  await t.test('expired trial cannot be issued again by another seller or superadmin with different email/name',async()=>{
    await pool.query("update businesses set subscription_current_period_ends_at=now()-interval '1 day' where id=$1",[enrolled.business_id]);
    for(const auth of [seller,other,root]){
      const duplicate=await call(endpoint,auth,{...input(original.nit),company_name:'Different business name'},400);
      assert.match(duplicate.error.message,/una vez por documento/);
    }
    const retried=await call(endpoint,seller,original);assert.equal(retried.already_created,true);assert.equal(retried.plan.portal_access_allowed,false);
    const tickets=(await pool.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[enrolled.business_id])).rows[0];assert.equal(Number(tickets.qr_balance),25);
  });
  await t.test('format changes, billing edits, removed metadata and inactive status do not reset eligibility',async()=>{
    const formatted=` ${original.nit.slice(0,3)}.${original.nit.slice(3,-1)}-${original.nit.slice(-1)} `;
    assert.equal(normalizeDocument(formatted),original.nit);
    await pool.query("update businesses set is_active=false,settings=jsonb_set(settings-'qori_descubre','{nit}',to_jsonb($2::text)) where id=$1",[enrolled.business_id,document()]);
    const denied=await call(endpoint,root,{...input(formatted),company_name:'Changed billing identity'},400);assert.match(denied.error.message,/una vez por documento/);
    assert.equal((await pool.query('select count(*)::int as n from qori_descubre_documents where document_key=$1',[original.nit])).rows[0].n,1);
  });
  await t.test('generic admin plan assignment cannot bypass identity checks or renew Descubre',async()=>{
    const before=(await pool.query('select plan_code,subscription_current_period_ends_at from businesses where id=$1',[enrolled.business_id])).rows[0];
    await call('/api/admin/businesses/'+enrolled.business_id+'/subscription',root,{plan_code:'descubre',subscription_current_period_ends_at:new Date(Date.now()+30*86400000).toISOString()},400,'PATCH');
    await call('/api/admin/businesses',root,{name:'QA bypass',slug:prefix+'-bypass',plan_code:'DESCUBRE'},400);
    const plans=await call('/api/admin/subscription-plans',root);assert.equal(plans.plans.some(p=>p.code==='DESCUBRE'),false);
    assert.deepEqual((await pool.query('select plan_code,subscription_current_period_ends_at from businesses where id=$1',[enrolled.business_id])).rows[0],before);
  });
  await t.test('simultaneous different requests for the same document grant one sample and one ticket allocation',async()=>{
    const nit=document(),a=input(nit),b=input(nit);
    const results=await Promise.all([call(endpoint,seller,a,null),call(endpoint,other,b,null)]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
    const id=results.find(r=>r.status===200).business_id;
    assert.equal((await pool.query('select count(*)::int as n from qori_descubre_documents where document_key=$1',[nit])).rows[0].n,1);
    assert.equal((await pool.query('select count(*)::int as n from business_qr_credit_ledger where business_id=$1',[id])).rows[0].n,1);
    const rejected=results[0].status===400?a:b;assert.equal((await pool.query('select id from app_users where email=$1',[rejected.email])).rowCount,0);
  });
  await t.test('backfill includes past trials on paid plans and survives business deletion',async()=>{
    const nit=document();
    const history=(await pool.query(`insert into businesses(name,slug,plan_code,settings) values('QA historical trial',$1,'GROWTH',$2::jsonb) returning id`,[prefix+'-historical',JSON.stringify({nit,qori_descubre:{started_at:'2026-01-01T00:00:00.000Z',ends_at:'2026-01-31T00:00:00.000Z'}})])).rows[0];
    const migration=fs.readFileSync(path.join(__dirname,'../database/migrations/20261016231239_qori_descubre_once_per_document.sql'),'utf8');
    await pool.query(migration);await pool.query(migration);
    assert.equal((await pool.query('select business_id from qori_descubre_documents where document_key=$1',[nit])).rows[0].business_id,history.id);
    await pool.query('delete from businesses where id=$1',[history.id]);
    const duplicate=await call(endpoint,root,input(nit),400);assert.match(duplicate.error.message,/una vez por documento/);
    assert.equal((await pool.query('select business_id from qori_descubre_documents where document_key=$1',[nit])).rows[0].business_id,history.id);
  });
  await t.test('a different document can still receive Descubre and the registry is not publicly accessible',async()=>{
    const fresh=await call(endpoint,seller,input(document()));assert.equal(fresh.plan.code,'DESCUBRE');
    const table=(await pool.query("select relrowsecurity from pg_class where oid='public.qori_descubre_documents'::regclass")).rows[0];assert.equal(table.relrowsecurity,true);
    assert.equal((await pool.query("select 1 from information_schema.role_table_grants where table_schema='public' and table_name='qori_descubre_documents' and grantee in ('PUBLIC','anon','authenticated')")).rowCount,0);
  });
});

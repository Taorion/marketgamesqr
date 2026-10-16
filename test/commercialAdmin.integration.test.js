const test=require("node:test");
const assert=require("node:assert/strict");
test("commercial admin: real PostgreSQL, API authorization, onboarding and revocation",{skip:process.env.QORI_COMMERCIAL_QA!=="true"},async t=>{
  const url=new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"55439","Never run this suite on a shared database");
  const {pool}=require("../backend/src/config/db");
  const bcrypt=require("bcryptjs");
  const express=require("express");
  const app=express();app.use(express.json());
  app.use("/api/auth",require("../backend/src/routes/authRoutes"));
  app.use("/api/admin",require("../backend/src/routes/adminRoutes"));
  app.patch("/api/business/users/:userId",require("../backend/src/middleware/auth").authRequired,require("../backend/src/controllers/businessPortalController").updateBusinessUser);
  app.use(require("../backend/src/middleware/errorHandler").errorHandler);
  const server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await pool.end();});
  const prefix=`qa-${Date.now()}`;
  const password="Qori-QA-Only!2026";
  const hash=await bcrypt.hash(password,4);
  const superRow=(await pool.query("insert into app_users(email,password_hash,full_name,role) values($1,$2,'QA Superadmin','QORI_SUPERADMIN') returning id",[`${prefix}@example.test`,hash])).rows[0];
  async function call(path,token,body,method=body===undefined?"GET":"POST",expected=200){
    const response=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await response.json();assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);return data;
  }
  const root=(await call("/api/auth/login",null,{email:`${prefix}@example.test`,password})).token;
  const c="/api/admin/commercial";
  let seller1,seller2,token1,token2,prospect,policy,deal,businessId,ownerCredentials;
  const policyBody={name:"QA autorización",seller_id:null,plan_codes:["STARTER"],max_discount_percent:10,max_discount_months:3,max_trial_days:7,max_bonus_tickets:50,allowed_modules:["products"],max_benefit_days:30,max_limits:{users:4},expires_at:new Date(Date.now()+86400000).toISOString(),is_active:true};
  const terms={plan_code:"STARTER",discount_percent:10,discount_months:3,trial_days:7,bonus_tickets:50,modules:["products"],benefit_days:30,limit_overrides:{users:4}};
  const newProspect=(suffix)=>({business_name:`QA negocio ${suffix}`,contact_name:"QA Contacto",email:`${prefix}-${suffix}@example.test`,phone:"",notes:"",stage:"NEW",next_contact_at:null});
  await t.test("superadmin creates sellers; sales accounts cannot use legacy admin or grant privileges",async()=>{
    seller1=await call(c+"/sellers",root,{full_name:"QA Vendedor Uno",email:`${prefix}-s1@example.test`,phone:""});
    seller2=await call(c+"/sellers",root,{full_name:"QA Vendedor Dos",email:`${prefix}-s2@example.test`,phone:""});
    token1=(await call("/api/auth/login",null,seller1.credentials)).token;
    token2=(await call("/api/auth/login",null,seller2.credentials)).token;
    await call("/api/admin/users",token1,undefined,"GET",403);
    await call(c+"/sellers",token1,{full_name:"Forged",email:"forged@example.test"},"POST",403);
    await call(c+"/policies",token1,policyBody,"POST",403);
    const bootstrap=await call(c+"/bootstrap",token1);assert.equal(bootstrap.sellers.length,1);
  });
  await t.test("seller ownership is enforced for reads and writes",async()=>{
    prospect=(await call(c+"/prospects",token1,newProspect("p1"))).prospect;
    await call(c+"/prospects",token1,{...newProspect("forged"),seller_id:seller2.seller.id},"POST",403);
    assert.equal((await call(c+"/prospects",token2)).rows.length,0);
    await call(c+`/prospects/${prospect.id}`,token2,newProspect("stolen"),"PATCH",403);
  });
  await t.test("authorized offer can be applied once even with concurrent requests",async()=>{
    policy=(await call(c+"/policies",root,policyBody)).policy;
    deal=(await call(c+"/deals",token1,{prospect_id:prospect.id,policy_id:policy.id,terms,reason:"QA propuesta autorizada"})).deal;
    assert.equal(deal.status,"APPROVED");
    await call(c+`/deals/${deal.id}/decision`,token1,{decision:"APPROVED",reason:"No permitido"},"POST",403);
    await call(c+`/deals/${deal.id}/apply`,token2,{},"POST",403);
    const results=await Promise.all([call(c+`/deals/${deal.id}/apply`,token1,{}),call(c+`/deals/${deal.id}/apply`,token1,{})]);
    assert.equal(results.filter(r=>r.already_applied).length,1);
    const created=results.find(r=>r.credentials);businessId=created.business_id;
    assert.equal(created.subscription.features.products,true);assert.equal(created.subscription.limits.users,4);
    ownerCredentials=created.credentials;
    const owner=await call("/api/auth/login",null,created.credentials);
    assert.equal(owner.user.subscription.plan.features.products,true);
    const balance=await pool.query("select qr_balance from business_qr_credit_accounts where business_id=$1",[businessId]);assert.equal(balance.rows[0].qr_balance,50);
    await call(c+"/bootstrap",owner.token,undefined,"GET",403);
    assert.equal((await call(c+"/customers",token2)).rows.some(b=>b.id===businessId),false);
  });
  await t.test("out-of-policy benefits need a superadmin decision",async()=>{
    const p=(await call(c+"/prospects",token1,newProspect("exception"))).prospect;
    const pending=(await call(c+"/deals",token1,{prospect_id:p.id,policy_id:policy.id,terms:{...terms,discount_percent:20},reason:"Solicita descuento mayor"})).deal;
    assert.equal(pending.status,"PENDING");
    await call(c+`/deals/${pending.id}/apply`,token1,{},"POST",400);
    await call(c+`/deals/${pending.id}/decision`,root,{decision:"APPROVED",reason:"Excepción aprobada QA"});
    const result=await call(c+`/deals/${pending.id}/apply`,token1,{});assert.ok(result.business_id);
  });
  await t.test("changed policies and expired offers are rejected on application",async()=>{
    const p=(await call(c+"/prospects",token1,newProspect("revised"))).prospect;
    const offer=(await call(c+"/deals",token1,{prospect_id:p.id,policy_id:policy.id,terms,reason:"Oferta antes de revisión"})).deal;
    await call(c+`/policies/${policy.id}`,root,{...policyBody,max_discount_percent:5},"PATCH");
    await call(c+`/deals/${offer.id}/apply`,token1,{},"POST",400);
    await call(c+`/deals/${offer.id}/decision`,root,{decision:"APPROVED",reason:"Autorización individual QA"});
    await pool.query("update qori_commercial_deals set valid_until=now()-interval '1 second' where id=$1",[offer.id]);
    await call(c+`/deals/${offer.id}/apply`,token1,{},"POST",400);
  });
  await t.test("portfolio reassignment removes old seller visibility and cancels open offers",async()=>{
    const offer=(await call(c+"/deals",token1,{business_id:businessId,policy_id:policy.id,terms:{...terms,discount_percent:5},reason:"Oferta para cartera actual"})).deal;
    assert.equal(offer.status,"PENDING","A seller must not stack trials or courtesy credits on existing customers");
    await call(c+`/customers/${businessId}`,root,{seller_id:seller1.seller.id,is_active:true,reason:"Conservar responsable actual"},"PATCH");
    assert.equal((await pool.query("select status from qori_commercial_deals where id=$1",[offer.id])).rows[0].status,"PENDING","Saving the same owner must preserve open offers");
    await call(c+`/customers/${businessId}`,root,{seller_id:seller2.seller.id,reason:"Reasignación de prueba"},"PATCH");
    assert.equal((await call(c+"/customers",token1)).rows.some(b=>b.id===businessId),false);
    assert.equal((await call(c+"/customers",token2)).rows.some(b=>b.id===businessId),true);
    await call(c+`/deals/${offer.id}/apply`,token1,{},"POST",400);
  });
  await t.test("revocation is visible in computed access and cannot be done by a seller",async()=>{
    await call(c+`/customers/${businessId}`,token2,{revoke_benefits:true,reason:"Intento sin permiso"},"PATCH",403);
    await call(c+`/customers/${businessId}`,root,{revoke_benefits:true,reason:"Retiro autorizado QA"},"PATCH");
    const b=(await call(c+"/customers",token2)).rows.find(b=>b.id===businessId);
    assert.equal(b.commercial.status,"REVOKED");assert.equal(b.subscription.portal_access_allowed,false);
  });
  await t.test("deactivated sellers lose existing tokens; audit never contains credentials",async()=>{
    await call(c+`/sellers/${seller1.seller.id}`,root,undefined,"DELETE");
    await call(c+"/bootstrap",token1,undefined,"GET",401);
    const audit=await call(c+"/audit",root);assert.ok(audit.rows.length>=15);
    assert.equal(JSON.stringify(audit).includes(seller1.credentials.password),false);
    await call(c+"/audit",token2,undefined,"GET",403);
  });
  await t.test("a business owner can also be superadmin without losing their business identity",async()=>{
    const saved=(await pool.query("update app_users set platform_role='QORI_SUPERADMIN' where email=$1 returning id,business_id,role",[ownerCredentials.email])).rows[0];
    assert.equal(saved.role,"BUSINESS_OWNER");assert.equal(saved.business_id,businessId);
    const dual=await call("/api/auth/login",null,ownerCredentials);
    assert.equal(dual.user.role,"BUSINESS_OWNER");assert.equal(dual.user.platform_role,"QORI_SUPERADMIN");
    assert.equal((await call(c+"/bootstrap",dual.token)).user.role,"QORI_SUPERADMIN");
    assert.equal((await call("/api/auth/me",dual.token)).user.business_id,businessId);
    await call(`/api/admin/users/${saved.id}`,root,{is_active:false},"PATCH",403);
    const colleagueEmail=`${prefix}-co-owner@example.test`;
    await pool.query("insert into app_users(email,password_hash,full_name,role,business_id) values($1,$2,'Otro propietario','BUSINESS_OWNER',$3)",[colleagueEmail,hash,businessId]);
    const colleague=await call("/api/auth/login",null,{email:colleagueEmail,password});
    await call(`/api/business/users/${saved.id}`,colleague.token,{is_active:false},"PATCH",403);
    assert.equal((await call(c+"/bootstrap",dual.token)).user.role,"QORI_SUPERADMIN");
  });
  await t.test("all commercial tables enforce RLS without anon/authenticated grants",async()=>{
    const result=await pool.query("select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname=any($1::text[])",[["qori_sales_profiles","qori_sales_accounts","qori_sales_prospects","qori_commercial_policies","qori_commercial_deals","qori_commercial_audit"]]);
    assert.equal(result.rows.length,6);assert.ok(result.rows.every(r=>r.relrowsecurity));
    const grants=await pool.query("select * from information_schema.role_table_grants where (table_name like 'qori_%' or table_name='app_users') and grantee in ('anon','authenticated','PUBLIC')");assert.equal(grants.rowCount,0);
  });
});

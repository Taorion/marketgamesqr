const test=require("node:test");
const assert=require("node:assert/strict");
const {randomUUID}=require("node:crypto");

test("existing portal users receive a separate seller permission without losing their business identity",{skip:process.env.QORI_COMMERCIAL_QA!=="true"},async t=>{
  const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"55439");
  const {pool}=require("../backend/src/config/db"),bcrypt=require("bcryptjs"),express=require("express");
  const {authRequired,canAccessBusiness}=require("../backend/src/middleware/auth");
  const app=express();app.use(express.json());
  app.use("/api/auth",require("../backend/src/routes/authRoutes"));
  app.use("/api/admin",require("../backend/src/routes/adminRoutes"));
  app.use("/api/public",require("../backend/src/routes/packageSalesRoutes"));
  app.patch("/api/business/users/:userId",authRequired,require("../backend/src/controllers/businessPortalController").updateBusinessUser);
  app.get("/api/qa/business/:id",authRequired,(req,res)=>res.status(canAccessBusiness(req.user,req.params.id)?200:403).json({role:req.user.role,business_id:req.user.business_id}));
  app.use(require("../backend/src/middleware/errorHandler").errorHandler);
  const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));
  const base=`http://127.0.0.1:${server.address().port}`,c="/api/admin/commercial";
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
  const prefix=`existing-seller-${Date.now()}`,originalPassword="Portal-QA-Original!2026",newPassword="Admin-QA-Chosen!2026";
  const hash=await bcrypt.hash(originalPassword,4);
  const business=(await pool.query(`insert into businesses(name,slug,plan_code,plan_type,subscription_status,subscription_current_period_ends_at,is_active)
    values($1,$2,'PRO','premium_monthly','ACTIVE',now()+interval '30 days',true) returning id`,[prefix,prefix])).rows[0];
  async function account(role,suffix,platform=null){return (await pool.query(`insert into app_users(business_id,email,full_name,password_hash,role,platform_role)
    values($1,$2,$3,$4,$5,$6) returning id,email,role,business_id,branch_id`,[business.id,`${prefix}-${suffix}@example.test`,suffix,hash,role,platform])).rows[0];}
  const superadmin=await account("BUSINESS_OWNER","superadmin","QORI_SUPERADMIN");
  const colleague=await account("BUSINESS_OWNER","colleague");
  // Each fixture represents a different device; retain the real per-device login limiter.
  const devices=new Map();
  async function call(path,token,body,expected=200,method=body===undefined?"GET":"POST"){
    if(body?.email&&!devices.has(body.email))devices.set(body.email,`192.0.2.${devices.size+1}`);
    const r=await fetch(base+path,{method,headers:{"Content-Type":"application/json","X-Forwarded-For":devices.get(body?.email)||"192.0.2.250",...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(result)}`);return result;
  }
  const login=(email,password=originalPassword)=>call("/api/auth/login",null,{email,password});
  const root=(await login(superadmin.email)).token,colleagueToken=(await login(colleague.email)).token;
  let primary,primaryLogin;
  for(const role of ["BUSINESS_OWNER","BUSINESS_MANAGER","VALIDATOR","BUSINESS_SELLER"])await t.test(`grant and authenticate ${role} as seller only inside admin`,async()=>{
    const existing=await account(role,role.toLowerCase());
    const before=await login(existing.email);
    await call(c+"/bootstrap",before.token,undefined,403);
    const found=await call(c+"/seller-candidates?email="+encodeURIComponent(existing.email.toUpperCase()),root);
    assert.equal(found.eligible,true);assert.equal(found.user.id,existing.id);assert.equal(found.user.business_id,business.id);
    assert.equal("password_hash" in found.user,false);
    const body={user_id:existing.id,password:newPassword,password_confirm:newPassword};
    await call(c+"/sellers/existing",colleagueToken,body,403);
    await call(c+"/sellers/existing",root,{...body,role:"QORI_SUPERADMIN"},400);
    await call(c+"/sellers/existing",root,{...body,password_confirm:"wrong"},400);
    const granted=await call(c+"/sellers/existing",root,body);
    assert.equal(granted.seller.id,existing.id);assert.equal(granted.seller.role,role);assert.equal(granted.seller.platform_role,"QORI_SELLER");
    assert.equal(granted.seller.business_id,business.id);assert.equal(granted.credentials.shared_login,true);
    await call("/api/auth/me",before.token,undefined,401);
    await call("/api/auth/login",null,{email:existing.email,password:originalPassword},401);
    const after=await login(existing.email,newPassword);
    assert.equal(after.user.role,role);assert.equal(after.user.platform_role,"QORI_SELLER");assert.equal(after.user.business_id,business.id);
    const boot=await call(c+"/bootstrap",after.token);assert.equal(boot.user.role,"QORI_SELLER");assert.equal(boot.sellers.length,1);
    await call("/api/admin/users",after.token,undefined,403);
    await call(c+"/seller-candidates?email="+encodeURIComponent(colleague.email),after.token,undefined,403);
    await call(c+"/sellers/existing",after.token,{...body,user_id:colleague.id},403);
    await call(c+"/sellers",after.token,{full_name:"Forbidden",email:"forbidden@example.test"},403);
    await call(c+"/sellers/existing",root,body,400);
    const identity=await call("/api/auth/me",after.token);assert.equal(identity.user.role,role);
    await call("/api/qa/business/"+business.id,after.token,undefined,role==="BUSINESS_SELLER"?403:200);
    await call("/api/qa/business/"+randomUUID(),after.token,undefined,403);
    const stored=(await pool.query("select password_hash,branch_id from app_users where id=$1",[existing.id])).rows[0];
    assert.equal(await bcrypt.compare(newPassword,stored.password_hash),true);assert.equal(stored.branch_id,existing.branch_id);
    if(role==="BUSINESS_OWNER"){primary=existing;primaryLogin=after;}
  });
  await t.test("dual-role seller can enroll Descubre and owns only the assigned portfolio",async()=>{
    const result=await call(c+"/enrollments/descubre",primaryLogin.token,{request_id:randomUUID(),company_name:"QA Assigned Business",contact_name:"QA Contact",nit:prefix,phone:"3001234567",email:`${prefix}-customer@example.test`,password:newPassword,password_confirm:newPassword,terms_accepted:true,privacy_accepted:true});
    assert.equal(result.plan.code,"DESCUBRE");
    const customers=await call(c+"/customers",primaryLogin.token);assert.ok(customers.rows.some(b=>b.id===result.business_id));assert.equal(customers.rows.some(b=>b.id===business.id),false);
    const advisor=await call("/api/public/commercial-advisors/"+primary.id);assert.equal(advisor.advisor.id,primary.id);
    await call("/api/qa/business/"+result.business_id,primaryLogin.token,undefined,403);
  });
  await t.test("commercial accounts cannot be modified by legacy or tenant user administration",async()=>{
    await call("/api/admin/users/"+primary.id,root,{password:"Forbidden-Reset!2026"},403,"PATCH");
    await call("/api/business/users/"+primary.id,colleagueToken,{is_active:false},403,"PATCH");
    const {updateSeller}=require("../backend/src/services/sellerService");
    const seller=(await pool.query("select id from app_users where business_id=$1 and role='BUSINESS_SELLER'",[business.id])).rows[0];
    await assert.rejects(()=>updateSeller(business.id,seller.id,{id:colleague.id,role:"BUSINESS_OWNER"},{email:"takeover@example.test"}),{status:403});
    const protectedLookup=await call(c+"/seller-candidates?email="+encodeURIComponent(superadmin.email),root);assert.equal(protectedLookup.eligible,false);
    await call(c+"/sellers/existing",root,{user_id:superadmin.id,password:newPassword,password_confirm:newPassword},400);
    await call(c+"/sellers/"+superadmin.id,root,{password:newPassword,password_confirm:newPassword},400,"PATCH");
  });
  await t.test("inactive business does not remove commercial permission or grant portal access",async()=>{
    await pool.query("update businesses set is_active=false where id=$1",[business.id]);
    const logged=await login(primary.email,newPassword);assert.equal(logged.user.platform_role,"QORI_SELLER");
    await call(c+"/bootstrap",logged.token);
    await call("/api/qa/business/"+business.id,logged.token,undefined,403);
    await pool.query("update businesses set is_active=true where id=$1",[business.id]);
  });
  await t.test("revoking and restoring admin access preserves the portal and invalidates old sessions",async()=>{
    await call(c+"/sellers/"+primary.id,root,undefined,200,"DELETE");
    await call(c+"/bootstrap",primaryLogin.token,undefined,401);
    let logged=await login(primary.email,newPassword);assert.equal(logged.user.platform_role,null);assert.equal(logged.user.role,"BUSINESS_OWNER");
    await call("/api/qa/business/"+business.id,logged.token);await call(c+"/bootstrap",logged.token,undefined,403);
    const reenabled=await call(c+"/sellers/"+primary.id,root,{is_active:true,password:"Replacement-QA!2026",password_confirm:"Replacement-QA!2026"},200,"PATCH");
    assert.equal(reenabled.credentials.shared_login,true);
    await call("/api/auth/me",logged.token,undefined,401);
    logged=await login(primary.email,"Replacement-QA!2026");await call(c+"/bootstrap",logged.token);await call("/api/qa/business/"+business.id,logged.token);
    await call(c+"/sellers/"+primary.id,root,{is_active:false},200,"PATCH");
    logged=await login(primary.email,"Replacement-QA!2026");await call("/api/qa/business/"+business.id,logged.token);await call(c+"/bootstrap",logged.token,undefined,403);
    assert.equal((await pool.query("select count(*)::int as n from app_users where email=$1",[primary.email])).rows[0].n,1);
    assert.equal((await pool.query("select count(*)::int as n from qori_sales_profiles where user_id=$1",[primary.id])).rows[0].n,1);
    const audit=JSON.stringify(await call(c+"/audit",root));
    assert.equal(audit.includes(newPassword),false);assert.equal(audit.includes("Replacement-QA!2026"),false);
  });
});

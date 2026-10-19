const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
test('superadmin seller records and strict own-portfolio access',{skip:process.env.QORI_COMMERCIAL_QA!=='true'},async t=>{
  const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55439');
  const {pool}=require('../backend/src/config/db'),{env}=require('../backend/src/config/env');
  const svc=require('../backend/src/services/commercialAdminService'),jwt=require('jsonwebtoken');
  const app=require('express')();app.use(require('express').json());app.use('/api/admin',require('../backend/src/routes/adminRoutes'));
  app.use(require('../backend/src/middleware/errorHandler').errorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end();});
  const base=`http://127.0.0.1:${server.address().port}/api/admin/commercial`,prefix=randomUUID();
  async function account(label,role){return (await pool.query(`insert into app_users(full_name,email,password_hash,role) values($1,$2,'qa-secret-hash',$3) returning *`,[label,`${prefix}-${label}@example.test`,role])).rows[0];}
  const root=await account('Supervisor','QORI_SUPERADMIN'),a=await account('Ana','QORI_SELLER'),b=await account('Bruno','QORI_SELLER');
  await pool.query('insert into qori_sales_profiles(user_id,phone,created_by) values($1,$3,$4),($2,$3,$4)',[a.id,b.id,'3000000000',root.id]);
  const token=u=>jwt.sign({sub:u.id,password_version:u.password_version||0,session_version:env.appSessionVersion,role:'QORI_SUPERADMIN'},env.jwtSecret);
  async function call(user,path,body,status=200,method=body===undefined?'GET':'POST'){
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token(user)}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await r.json();assert.equal(r.status,status,`${path}: ${JSON.stringify(result)}`);return result;
  }
  const prospectBody=(suffix)=>({business_name:`Negocio ${suffix}`,contact_name:`Contacto ${suffix}`,email:`${prefix}-${suffix}@example.test`,notes:`Notas privadas ${suffix}`,phone:'3000000000'});
  const pa=(await svc.saveProspect(a,prospectBody('Ana'))).prospect,pb=(await svc.saveProspect(b,prospectBody('Bruno'))).prospect;
  const da=(await svc.createDeal(a,{prospect_id:pa.id,terms:{plan_code:'STARTER'},reason:'Oferta privada de Ana'})).deal;
  const db=(await svc.createDeal(b,{prospect_id:pb.id,terms:{plan_code:'STARTER'},reason:'Oferta privada de Bruno'})).deal;
  const ba=(await pool.query("insert into businesses(name,slug,plan_code,settings) values('Cliente Ana',$1,'PRO',$2::jsonb) returning *",[prefix+'-a',JSON.stringify({contact_email:'cliente-a@example.test'})])).rows[0];
  const bb=(await pool.query("insert into businesses(name,slug,plan_code,settings) values('Cliente Bruno',$1,'PRO',$2::jsonb) returning *",[prefix+'-b',JSON.stringify({contact_email:'cliente-b@example.test'})])).rows[0];
  await pool.query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$5),($3,$4,$5)',[ba.id,a.id,bb.id,b.id,root.id]);
  await svc.saveProspect(root,{...prospectBody('Ana'),notes:'Superadmin hizo seguimiento',stage:'CONTACTED'},pa.id);
  await svc.saveProspect(root,{...prospectBody('Bruno'),notes:'Información de Bruno para supervisor',stage:'NEGOTIATING'},pb.id);
  await t.test('superadmin can select every seller profile, lists and summary without exposing credentials',async()=>{
    const profile=await call(root,`/sellers/${a.id}`);assert.equal(profile.seller.email,a.email);assert.equal(profile.seller.phone,'3000000000');
    assert.equal(profile.seller.created_by_name,root.full_name);assert.equal(profile.stats.prospects_total,1);assert.equal(profile.stats.deals_total,1);assert.equal(profile.stats.customers_total,1);
    assert.equal(JSON.stringify(profile).includes('qa-secret-hash'),false);assert.equal('password_version' in profile.seller,false);
    for(const [kind,id] of [['prospects',pa.id],['deals',da.id],['customers',ba.id]])assert.deepEqual((await call(root,`/${kind}?seller_id=${a.id}`)).rows.map(r=>r.id),[id]);
    const boot=await call(root,`/bootstrap?seller_id=${b.id}`);assert.equal(boot.counts.prospects,1);assert.equal(boot.counts.pending,1);assert.equal(boot.counts.customers,1);
    assert.ok(boot.sellers.some(s=>s.id===a.id));assert.ok((await call(root,'/prospects')).rows.some(p=>p.id===pb.id));
    await call(root,'/sellers/not-a-uuid',undefined,400);await call(root,`/sellers/${randomUUID()}`,undefined,404);
  });
  await t.test('seller sees only own records despite forged claims, queries, permissions or IDs',async()=>{
    await pool.query('update app_users set admin_permissions=$2 where id=$1',[a.id,Object.keys(require('../backend/src/services/adminPermissions').PERMISSIONS)]);
    const boot=await call(a,'/bootstrap');assert.equal(boot.user.can_see_team,false);assert.deepEqual(boot.sellers.map(s=>s.id),[a.id]);assert.equal(boot.counts.prospects,1);
    for(const kind of ['prospects','deals','customers','audit','bootstrap'])await call(a,`/${kind}?seller_id=${b.id}`,undefined,403);
    for(const [kind,id] of [['prospects',pa.id],['deals',da.id],['customers',ba.id]])assert.deepEqual((await call(a,`/${kind}?all=true&superadmin=true`)).rows.map(r=>r.id),[id]);
    assert.equal((await call(a,`/sellers/${a.id}`)).seller.id,a.id);await call(a,`/sellers/${b.id}`,undefined,403);
    await call(a,`/prospects/${pb.id}`,prospectBody('Tamper'),403,'PATCH');
    await call(a,'/prospects',{...prospectBody('Tamper'),seller_id:b.id},403);
    await call(a,`/deals/${db.id}/cancel`,{reason:'No permission'},403);
    await call(a,`/deals/${db.id}/apply`,{},403);
    await call(a,`/customers/${bb.id}`,{is_active:false,reason:'No permission'},403,'PATCH');
  });
  await t.test('seller history includes supervisor actions on own work and omits other portfolios',async()=>{
    const history=await call(a,'/audit');assert.ok(history.rows.some(r=>r.actor_id===root.id&&r.entity_id===pa.id));
    assert.ok(history.rows.every(r=>[a.id,pa.id,da.id,ba.id].includes(r.entity_id)));
    assert.equal(JSON.stringify(history).includes(pb.email),false);
    const event=history.rows.find(r=>r.action==='PROSPECT_UPDATED');assert.equal(event.detail.changes.notes.before,'Notas privadas Ana');assert.equal(event.detail.changes.notes.after,'Superadmin hizo seguimiento');
    const filtered=await call(root,`/audit?seller_id=${b.id}`);assert.ok(filtered.rows.some(r=>r.actor_id===root.id&&r.entity_id===pb.id));assert.ok(filtered.rows.every(r=>![pa.id,da.id].includes(r.entity_id)));
  });
  await t.test('reassignment removes old prospect and offer access while preserving superadmin history',async()=>{
    await svc.cancelDeal(root,da.id,{reason:'Cerrar oferta antes de reasignar'});
    await svc.saveProspect(root,{...prospectBody('Ana'),seller_id:b.id},pa.id);
    assert.equal((await call(a,'/prospects')).rows.some(r=>r.id===pa.id),false);
    assert.equal((await call(a,'/deals')).rows.some(r=>r.id===da.id),false);
    assert.equal((await call(a,'/audit')).rows.some(r=>[pa.id,da.id].includes(r.entity_id)),false);
    await call(a,`/deals/${da.id}/apply`,{},403);await call(a,`/deals/${da.id}/cancel`,{reason:'Former owner'},403);
    const history=await call(root,`/audit?seller_id=${a.id}`);assert.ok(history.rows.some(r=>r.detail.previous_seller_id===a.id&&r.detail.seller_id===b.id));
    assert.ok(history.rows.some(r=>r.entity_id===da.id));assert.ok((await call(b,'/prospects')).rows.some(r=>r.id===pa.id));
  });
  await t.test('customer reassignment also removes converted prospect and idempotent offer access',async()=>{
    const p=(await svc.saveProspect(a,prospectBody('Convertido'))).prospect;
    await pool.query("update qori_sales_prospects set stage='WON',business_id=$2 where id=$1",[p.id,ba.id]);
    const deal=(await svc.createDeal(root,{business_id:ba.id,terms:{plan_code:'STARTER'},reason:'Seguimiento de cliente'})).deal;
    await pool.query("update qori_commercial_deals set status='APPLIED' where id=$1",[deal.id]);
    await svc.updateCustomer(root,ba.id,{seller_id:b.id,reason:'Reasignación de cliente QA'});
    assert.equal((await call(a,'/customers')).rows.some(r=>r.id===ba.id),false);
    assert.equal((await call(a,'/prospects')).rows.some(r=>r.id===p.id),false);
    assert.equal((await call(a,'/deals')).rows.some(r=>r.id===deal.id),false);
    await call(a,`/deals/${deal.id}/apply`,{},403);
    assert.ok((await call(b,'/prospects')).rows.some(r=>r.id===p.id));
    assert.ok((await call(root,`/audit?seller_id=${a.id}`)).rows.some(r=>r.entity_id===ba.id&&r.detail.previous_seller_id===a.id));
  });
  await t.test('seller history paginates without mixing another seller events',async()=>{
    await pool.query(`insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail)
      select $1,'SELLER_UPDATED','seller',$2,jsonb_build_object('reason','Página '||n) from generate_series(1,55) n`,[root.id,a.id]);
    const page1=await call(a,'/audit'),page2=await call(a,'/audit?offset=50');
    assert.equal(page1.rows.length,50);assert.equal(page1.has_more,true);assert.equal(page2.rows.length,5);
    assert.equal(new Set([...page1.rows,...page2.rows].map(r=>r.id)).size,55);assert.ok(page1.rows.every(r=>r.entity_id===a.id));
  });
  await t.test('Descubre retries cannot reveal a customer after reassignment',async()=>{
    const body={request_id:randomUUID(),company_name:'Cliente Descubre QA',contact_name:'Titular QA',nit:randomUUID(),phone:'3000000000',email:`${randomUUID()}@example.test`,password:'Scope-QA-Only!2026',password_confirm:'Scope-QA-Only!2026',terms_accepted:true,privacy_accepted:true};
    const enrolled=await call(a,'/enrollments/descubre',body);
    await svc.updateCustomer(root,enrolled.business_id,{seller_id:b.id,reason:'Reasignar muestra QA'});
    await call(a,'/enrollments/descubre',body,403);
  });
  await t.test('removing a customer assignment also hides offers linked through its converted prospect',async()=>{
    const p=(await svc.saveProspect(b,prospectBody('SinAsignar'))).prospect;
    const d=(await svc.createDeal(b,{prospect_id:p.id,terms:{plan_code:'STARTER'},reason:'Oferta previa a conversión'})).deal;
    await pool.query("update qori_sales_prospects set business_id=$2,stage='WON' where id=$1",[p.id,bb.id]);
    await svc.updateCustomer(root,bb.id,{seller_id:null,reason:'Retirar asignación QA'});
    assert.equal((await call(b,'/prospects')).rows.some(r=>r.id===p.id),false);
    assert.equal((await call(b,'/deals')).rows.some(r=>r.id===d.id),false);
    assert.equal((await call(b,'/audit')).rows.some(r=>r.entity_id===d.id),false);
    await call(b,`/deals/${d.id}/apply`,{},403);await call(b,`/deals/${d.id}/cancel`,{reason:'Sin asignación'},403);
  });
  await t.test('archived seller details and history remain visible to superadmin',async()=>{
    await svc.updateSeller(root,a.id,{},true);
    await call(a,'/bootstrap',undefined,401);
    const result=await call(root,`/sellers/${a.id}`);assert.equal(result.seller.is_active,false);assert.ok(result.seller.archived_at);
    assert.ok((await call(root,`/audit?seller_id=${a.id}`)).rows.some(r=>r.action==='SELLER_ARCHIVED'));
  });
});

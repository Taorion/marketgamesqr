const {test,after}=require('node:test');
const assert=require('node:assert/strict');
// Dedicated local database only. Set up with scripts/stamp-card-local-setup.js.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55439/stamp_cards_qa';
process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3049';process.env.JWT_SECRET='local-stamp-card-integration-only';
const {query,pool}=require('../backend/src/config/db');
const svc=require('../backend/src/services/stampCardService');
const {program:programSchema}=require('../backend/src/routes/stampCardRoutes');
const {getQrDetails,redeemQr}=require('../backend/src/services/qrService');
const crypto=require('crypto');
let business,other,user,program,member,cycle,sale1,sale2;
const today=new Date().toISOString().slice(0,10),filter={from:'2020-01-01',to:'2030-12-31'};
const rules={name:'Café de la casa',stamps_required:2,benefit_type:'FREE_GIFT',benefit_value:{label:'Un café gratis'},minimum_purchase:5000,
  one_per_day:false,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:2000,ticket_cost:1000,terms:'Un café de la casa. Personal.',status:'ACTIVE'};
async function sale(document='CC12345',amount=10000,extra={}){return (await query(`insert into business_sales
  (business_id,customer_document_id,customer_name,sale_amount,paid_at,sale_status) values ($1,$2,'Cliente QA',$3,coalesce($4::timestamptz,clock_timestamp()),$5) returning *`,
  [extra.business||business.id,document,amount,extra.paid_at||null,extra.status||'PAID'])).rows[0];}
async function current(m=member){return (await query('select * from stamp_cycles where member_id=$1 order by cycle_number desc limit 1',[m.id])).rows[0];}
test('stamp loyalty database, issuance and public contract',{skip:process.env.STAMP_CARD_INTEGRATION!=='1'},async t=>{
  await t.test('fixtures use actual business, sale, QR and credit tables',async()=>{
    business=(await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values ('Sellos QA',$1,'PRO','ACTIVE',$2::jsonb) returning *`,
      ['stamps-'+crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
    other=(await query(`insert into businesses(name,slug,plan_code) values ('Otro negocio QA',$1,'PRO') returning *`,['other-'+crypto.randomUUID()])).rows[0];
    user=(await query(`insert into app_users(business_id,email,password_hash,full_name,role) values ($1,$2,'test','Manager QA','BUSINESS_OWNER') returning *`,[business.id,crypto.randomUUID()+'@example.test'])).rows[0];
    await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values ($1,10,10)',[business.id]);
    program=await svc.saveProgram(business.id,user.id,rules);assert.equal(program.stamps_required,2);
  });
  await t.test('invalid benefit configuration is rejected',()=>{
    assert.equal(programSchema.safeParse({...rules,stamps_required:1}).success,false);
    assert.equal(programSchema.safeParse({...rules,benefit_type:'PERCENT_DISCOUNT',benefit_value:{label:'Inválido',percent:101}}).success,false);
  });
  await t.test('enrollment is idempotent under concurrency and consumes no credits',async()=>{
    const [a,b]=await Promise.all([1,2].map(()=>svc.enroll(business.id,user.id,{program_id:program.id,name:'Cliente QA',document_id:'CC-12345'})));
    assert.equal(a.member.id,b.member.id);member=a.member;cycle=await current();assert.equal(cycle.stamps,0);
    assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[business.id])).rows[0].qr_balance,10);
  });
  await t.test('early claims and cross-tenant writes fail',async()=>{
    await assert.rejects(()=>svc.claim(member.public_token,cycle.id),/faltan sellos/);
    await assert.rejects(()=>svc.manualStamp(other.id,user.id,member.id,{reference:'hack',note:'bad'}),/no encontrada/);
    await assert.rejects(()=>svc.enroll(other.id,user.id,{program_id:program.id,name:'Fake',document_id:'333'}),/activo/);
    await assert.rejects(()=>svc.saveProgram(other.id,user.id,rules,program.id),/no encontrado/);
    assert.equal((await svc.members(other.id)).members.length,0);
  });
  await t.test('only qualifying paid purchases after enrollment grant stamps',async()=>{
    await sale('CC12345',100);await sale('CC12345',10000,{business:other.id});await sale('CC12345',10000,{status:'VOIDED'});
    await sale('CC12345',10000,{paid_at:'2020-01-01'});await sale('',10000);assert.equal((await current()).stamps,0);
    sale1=await sale();assert.equal((await current()).stamps,1);
    await query('update business_sales set notes=$2 where id=$1',[sale1.id,'Edit does not duplicate']);assert.equal((await current()).stamps,1);
    sale2=await sale();assert.equal((await current()).stamps,2);
    await sale();assert.equal((await current()).stamps,2);
  });
  await t.test('simultaneous claims return the same ticket and debit exactly once',async()=>{
    const results=await Promise.all([1,2,3,4].map(()=>svc.claim(member.public_token,cycle.id)));
    assert.equal(new Set(results.map(r=>r.ticket_code)).size,1);cycle=await current();
    assert.equal((await query('select count(*)::int as n from business_qr_credit_ledger where qr_code_id=$1',[cycle.qr_code_id])).rows[0].n,1);
    assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[business.id])).rows[0].qr_balance,9);
    const details=await getQrDetails(results[0].ticket_code,user);assert.equal(details.allowed,true);
    assert.equal(details.reward.name,'Un café gratis');
  });
  await t.test('public card excludes customer identifiers, internal costs and program internals',async()=>{
    const result=await svc.publicCard(member.public_token);assert.equal(result.name,'Cliente');assert.ok(result.cycles[0].qr_image.startsWith('data:image/png'));
    const raw=JSON.stringify(result);assert.equal(raw.includes('CC12345'),false);assert.equal(raw.includes('reward_cost'),false);assert.equal(raw.includes('ticket_cost'),false);
    await assert.rejects(()=>svc.publicCard('bad'),/no válido/);
  });
  await t.test('canonical validator rejects transfer of a stamp reward',async()=>{
    const token=(await query('select token from qr_codes where id=$1',[cycle.qr_code_id])).rows[0].token;
    await assert.rejects(()=>redeemQr(token,user,{idempotency_key:crypto.randomUUID(),beneficiary:{name:'Someone Else',document_id:'other123',data_use_confirmed:true}}),/personal/);
  });
  await t.test('voiding a paid sale reverses its stamp and cancels unused ticket without reissuing',async()=>{
    await query("update business_sales set sale_status='VOIDED' where id=$1",[sale1.id]);
    assert.equal((await current()).stamps,1);assert.equal((await current()).review_required,true);
    assert.equal((await query('select status from qr_codes where id=$1',[cycle.qr_code_id])).rows[0].status,'CANCELLED');
    await query("update business_sales set sale_status='PAID' where id=$1",[sale1.id]);assert.equal((await current()).stamps,1);
  });
  await t.test('renewal is idempotent and preserves old snapshots after editing',async()=>{
    await svc.saveProgram(business.id,user.id,{...rules,stamps_required:3},program.id);
    const results=await Promise.all([svc.renew(member.public_token),svc.renew(member.public_token)]);assert.equal(results[0].cycle.id,results[1].cycle.id);
    assert.equal((await current()).rules.stamps_required,3);
    const old=(await query('select rules from stamp_cycles where id=$1',[cycle.id])).rows[0];assert.equal(old.rules.stamps_required,2);
  });
  await t.test('manual visits require unique references and a paid-at update can earn once',async()=>{
    const a=await svc.manualStamp(business.id,user.id,member.id,{reference:'visit-1',note:'Visita verificada'});
    const b=await svc.manualStamp(business.id,user.id,member.id,{reference:'visit-1',note:'Reintento'});
    assert.equal(a.duplicate,false);assert.equal(b.duplicate,true);assert.equal((await current()).stamps,1);
    const pending=await sale('CC12345',5000,{status:'PENDING'});await query("update business_sales set sale_status='PAID' where id=$1",[pending.id]);assert.equal((await current()).stamps,2);
  });
  await t.test('no balance rolls back ticket and player creation, preserving claimable card',async()=>{
    await sale();await query('update business_qr_credit_accounts set qr_balance=0 where business_id=$1',[business.id]);
    const c=await current();const before=(await query('select count(*)::int as n from qr_codes where business_id=$1',[business.id])).rows[0].n;
    await assert.rejects(()=>svc.claim(member.public_token,c.id),/agotado/);assert.equal((await current()).claimed_at,null);
    assert.equal((await query('select count(*)::int as n from qr_codes where business_id=$1',[business.id])).rows[0].n,before);
    await query('update business_qr_credit_accounts set qr_balance=10 where business_id=$1',[business.id]);
  });
  await t.test('daily cap holds for concurrent automatic and manual stamps',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,one_per_day:true});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Diario QA',document_id:'DAY123'});
    await Promise.all([sale('DAY123'),sale('DAY123'),sale('DAY123')]);assert.equal((await current(m)).stamps,1);
    await assert.rejects(()=>svc.manualStamp(business.id,user.id,m.id,{reference:'daily-visit',note:'Visita'}),/hoy/);
  });
  await t.test('paused programs stop earning but honor existing complete cards',async()=>{
    await svc.saveProgram(business.id,user.id,{...rules,status:'PAUSED'},program.id);
    const c=await current();await svc.claim(member.public_token,c.id);
    await assert.rejects(()=>svc.renew(member.public_token),/pausado/);
    const count=(await query('select count(*)::int as n from stamp_events where member_id=$1',[member.id])).rows[0].n;
    await sale();assert.equal((await query('select count(*)::int as n from stamp_events where member_id=$1',[member.id])).rows[0].n,count);
  });
  await t.test('dashboard metrics, history and tenant scoping are persisted',async()=>{
    const result=await svc.dashboard(business.id,filter);assert.ok(result.metrics.issued>=2);assert.ok(result.metrics.return_visits>=1);assert.ok(result.trend.length);
    assert.equal((await svc.dashboard(other.id,filter)).metrics.stamps,0);
    const history=await svc.history(business.id,{...filter});assert.ok(history.events.some(e=>e.voided_at));assert.ok(history.events.some(e=>e.source==='MANUAL'));
    const rls=await query("select relname,relrowsecurity from pg_class where relname in ('stamp_programs','stamp_members','stamp_cycles','stamp_events')");
    assert.equal(rls.rows.length,4);assert.ok(rls.rows.every(r=>r.relrowsecurity));
  });
  await t.test('benefit redeems once through canonical validator and appears in dashboard',async()=>{
    const c=await current();const token=(await query('select token from qr_codes where id=$1',[c.qr_code_id])).rows[0].token;
    const payload={mode:'STANDALONE',idempotency_key:crypto.randomUUID(),beneficiary:{name:'Cliente QA',document_id:'cc12345',data_use_confirmed:true}};
    await redeemQr(token,user,payload);await redeemQr(token,user,payload);
    assert.equal((await query('select count(*)::int as n from redemptions where qr_code_id=$1',[c.qr_code_id])).rows[0].n,1);
    assert.equal((await svc.dashboard(business.id,filter)).metrics.redeemed,1);
    await assert.rejects(()=>redeemQr(token,user,{...payload,idempotency_key:crypto.randomUUID()}),/redimido/);
    const e=(await query('select id from stamp_events where cycle_id=$1 and voided_at is null limit 1',[c.id])).rows[0];
    await svc.voidStamp(business.id,user.id,e.id,'Ajuste de prueba');
    assert.equal((await query('select status from qr_codes where id=$1',[c.qr_code_id])).rows[0].status,'REDEEMED');
    assert.equal((await current()).review_required,true);
  });
  await t.test('HTTP routes require manager authentication and serve public secret links',async()=>{
    const jwt=require('jsonwebtoken');const {app}=require('../backend/src/app');const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}`;
    try{
      const token=jwt.sign({sub:user.id,password_version:0},process.env.JWT_SECRET);
      assert.equal((await fetch(base+'/api/business/stamp-cards/context')).status,401);
      const res=await fetch(base+'/api/business/stamp-cards/context',{headers:{Authorization:`Bearer ${token}`}});assert.equal(res.status,200);
      assert.ok((await res.json()).programs.length);
      const pub=await fetch(base+'/api/public/stamp-cards/'+member.public_token);assert.equal(pub.status,200);assert.match(pub.headers.get('cache-control'),/no-store/);
      const invalid=await fetch(base+'/api/public/stamp-cards/'+member.public_token+'/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cycle_id:crypto.randomUUID()})});assert.equal(invalid.status,404);
    }finally{await new Promise(resolve=>server.close(resolve));}
  });
  await t.test('global revenue and customers deduplicate purchases shared by two programs',async()=>{
    const before=(await svc.dashboard(business.id,filter)).metrics;
    const a=await svc.saveProgram(business.id,user.id,{...rules,name:'Programa paralelo A'});
    const b=await svc.saveProgram(business.id,user.id,{...rules,name:'Programa paralelo B'});
    await svc.enroll(business.id,user.id,{program_id:a.id,name:'Multi QA',document_id:'MULTI123'});
    await svc.enroll(business.id,user.id,{program_id:b.id,name:'Multi QA',document_id:'MULTI123'});
    await sale('MULTI123',12000);
    const after=(await svc.dashboard(business.id,filter)).metrics;
    assert.equal(Number(after.linked_sales)-Number(before.linked_sales),12000);
    assert.equal(after.active_customers-before.active_customers,1);
    assert.equal(Number((await svc.dashboard(business.id,{...filter,program_id:a.id})).metrics.linked_sales),12000);
  });
  await t.test('expired cards cannot claim and tenant foreign keys reject cross-business rows',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'Vigencia QA'});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Vigencia QA',document_id:'EXP123'});
    await sale('EXP123');await sale('EXP123');const c=await current(m);
    await query("update stamp_cycles set expires_at=now()-interval '1 minute' where id=$1",[c.id]);
    await assert.rejects(()=>svc.claim(m.public_token,c.id),/vencida/);
    const next=await svc.renew(m.public_token);assert.equal(next.cycle.cycle_number,2);assert.equal(next.cycle.stamps,0);
    await assert.rejects(()=>query(`insert into stamp_events(business_id,member_id,cycle_id,source,source_key) values ($1,$2,$3,'MANUAL','cross-tenant')`,[other.id,m.id,c.id]),e=>e.code==='23503');
    const acl=await query(`select count(*)::int as n from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.relname like 'stamp_%' and c.relkind='r' and a.grantee=0`);
    assert.equal(acl.rows[0].n,0);
  });
  await t.test('manual permission changes apply to existing cards without changing their reward rules',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'Segundo programa',allow_manual:false,stamps_required:5});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Cliente nuevo',document_id:'MANUALNEW'});
    const original=(await current(m)).rules;
    const visit={reference:'first-manual',note:'Visita verificada'};
    await assert.rejects(()=>svc.manualStamp(business.id,user.id,m.id,visit),/Habilita/);
    await svc.saveProgram(business.id,user.id,{...rules,name:p.name,stamps_required:7,allow_manual:true,benefit_value:{label:'Otro premio'}},p.id);
    await svc.manualStamp(business.id,user.id,m.id,visit);
    assert.equal((await current(m)).stamps,1);
    assert.deepEqual((await current(m)).rules,original);
    const row=(await svc.members(business.id,{program_id:p.id})).members[0];
    assert.equal(row.allow_manual,true);assert.equal(row.program_status,'ACTIVE');
    await svc.saveProgram(business.id,user.id,{...rules,allow_manual:false},p.id);
    await assert.rejects(()=>svc.manualStamp(business.id,user.id,m.id,{...visit,reference:'blocked'}),/Habilita/);
    await assert.rejects(()=>svc.manualStamp(business.id,user.id,m.id,{...visit,reference:'bypass',enable_manual:true}),/Habilita/);
    assert.equal((await svc.members(business.id,{program_id:p.id})).members[0].allow_manual,false);
    await assert.rejects(()=>svc.manualStamp(other.id,user.id,m.id,{...visit,enable_manual:true}),/no encontrada/);
    await svc.saveProgram(business.id,user.id,{...rules,allow_manual:true},p.id);
    await query("update stamp_cycles set expires_at=now()-interval '1 minute' where member_id=$1",[m.id]);
    await assert.rejects(()=>svc.manualStamp(business.id,user.id,m.id,{...visit,reference:'expired',enable_manual:true}),/vencida/);
    assert.equal((await svc.context(business.id)).programs.find(x=>x.id===p.id).allow_manual,true);
  });
  await t.test('HTTP visits honor the program configuration and cannot enable manual stamping',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,allow_manual:false,stamps_required:5,one_per_day:true});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Manual HTTP',document_id:'MANUALHTTP'});
    const jwt=require('jsonwebtoken'),{app}=require('../backend/src/app');
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const url=`http://127.0.0.1:${server.address().port}/api/business/stamp-cards/members/${m.id}/stamps`;
    const body={reference:'visit-enable',note:'Habilitación y visita',enable_manual:true};
    const headers={'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({sub:user.id,password_version:0},process.env.JWT_SECRET)}`};
    try{
      assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(body)})).status,400);
      assert.equal((await svc.context(business.id)).programs.find(x=>x.id===p.id).allow_manual,false);
      assert.equal((await current(m)).stamps,0);
      const configUrl=`http://127.0.0.1:${server.address().port}/api/business/stamp-cards/programs/${p.id}`;
      assert.equal((await fetch(configUrl,{method:'PUT',headers,body:JSON.stringify({...rules,allow_manual:true,stamps_required:5,one_per_day:true})})).status,200);
      const results=await Promise.all([1,2].map(()=>fetch(url,{method:'POST',headers,body:JSON.stringify(body)})));
      assert.ok(results.every(r=>r.status===200));assert.equal((await current(m)).stamps,1);
      assert.equal((await svc.context(business.id)).programs.find(x=>x.id===p.id).allow_manual,true);
      assert.equal((await fetch(configUrl,{method:'PUT',headers,body:JSON.stringify({...rules,allow_manual:false,one_per_day:false})})).status,200);
      const capped=await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,reference:'another-today'})});
      assert.equal(capped.status,400);
      assert.match((await capped.json()).error.message,/configuración/);
      assert.equal((await svc.context(business.id)).programs.find(x=>x.id===p.id).allow_manual,false);
      await svc.saveProgram(business.id,user.id,{...rules,status:'PAUSED',allow_manual:false},p.id);
      await assert.rejects(()=>svc.manualStamp(business.id,user.id,m.id,{...body,reference:'paused'}),/activo/);
    }finally{await new Promise(resolve=>server.close(resolve));}
  });
  await t.test('deleting a program preserves completed cards, issued tickets, history and metrics',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'Programa para eliminar'});
    const {member:complete}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Beneficio pendiente',document_id:'DELETECOMPLETE'});
    const {member:progress}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'En progreso',document_id:'DELETEPROGRESS'});
    await sale('DELETECOMPLETE');await sale('DELETECOMPLETE');await sale('DELETEPROGRESS');
    const before=(await svc.dashboard(business.id,{...filter,program_id:p.id})).metrics;
    await assert.rejects(()=>svc.deleteProgram(other.id,user.id,p.id),/no encontrado/);
    const a=await svc.deleteProgram(business.id,user.id,p.id);
    const b=await svc.deleteProgram(business.id,user.id,p.id);
    assert.equal(new Date(a.deleted_at).getTime(),new Date(b.deleted_at).getTime());
    const ctx=await svc.context(business.id);
    assert.equal(ctx.programs.some(x=>x.id===p.id),false);assert.ok(ctx.deleted_programs.some(x=>x.id===p.id));
    assert.equal((await svc.context(other.id)).deleted_programs.some(x=>x.id===p.id),false);
    const persisted=(await query('select * from stamp_programs where id=$1',[p.id])).rows[0];
    assert.equal(persisted.deleted_by,user.id);assert.equal(persisted.status,'ARCHIVED');
    await assert.rejects(()=>svc.saveProgram(business.id,user.id,rules,p.id),/no encontrado/);
    await assert.rejects(()=>svc.enroll(business.id,user.id,{program_id:p.id,name:'Nuevo',document_id:'DELETEBLOCK'}),/activo/);
    await assert.rejects(()=>svc.manualStamp(business.id,user.id,progress.id,{reference:'deleted-visit',note:'Intento',enable_manual:true}),/activo/);
    await sale('DELETEPROGRESS');assert.equal((await current(progress)).stamps,1);
    assert.deepEqual((await svc.dashboard(business.id,{...filter,program_id:p.id})).metrics,before);
    assert.equal((await svc.history(business.id,{...filter,program_id:p.id})).events.length,3);
    assert.equal((await svc.publicCard(complete.public_token)).program.deleted,true);
    const c=await current(complete),balance=(await svc.context(business.id)).ticket_balance;
    const reward=await svc.claim(complete.public_token,c.id);
    assert.equal((await svc.context(business.id)).ticket_balance,balance-1);
    assert.equal((await getQrDetails(reward.ticket_code,user)).allowed,true);
    await svc.deleteProgram(business.id,user.id,p.id);
    assert.equal((await getQrDetails(reward.ticket_code,user)).allowed,true);
    await assert.rejects(()=>svc.renew(complete.public_token),/pausado/);
    assert.ok((await svc.members(business.id,{program_id:p.id})).members.every(x=>x.program_deleted_at));
  });
  await t.test('DELETE HTTP route supports unused programs, validates ids and requires tenant authentication',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'Sin clientes'});
    const jwt=require('jsonwebtoken'),{app}=require('../backend/src/app');
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}/api/business/stamp-cards/programs/`;
    const headers={Authorization:`Bearer ${jwt.sign({sub:user.id,password_version:0},process.env.JWT_SECRET)}`};
    try{
      assert.equal((await fetch(base+p.id,{method:'DELETE'})).status,401);
      assert.equal((await fetch(base+'bad-id',{method:'DELETE',headers})).status,400);
      assert.equal((await fetch(base+crypto.randomUUID(),{method:'DELETE',headers})).status,404);
      assert.equal((await fetch(base+p.id,{method:'DELETE',headers})).status,200);
      assert.equal((await fetch(base+p.id,{method:'DELETE',headers})).status,200);
      assert.equal((await svc.context(business.id)).programs.some(x=>x.id===p.id),false);
    }finally{await new Promise(resolve=>server.close(resolve));}
  });
  await t.test('inventory rules persist exact tenant products and reject forged or archived references',async()=>{
    const product=async(b,name)=>(await query(`insert into business_inventory_products(business_id,internal_id,name,unit_price,stock_quantity)
      values ($1,$2,$3,6000,50) returning *`,[b,crypto.randomUUID(),name])).rows[0];
    const coffee=await product(business.id,'Café inventario'),cake=await product(business.id,'Torta inventario'),foreign=await product(other.id,'Producto privado');
    const payload=programSchema.parse({...rules,allow_manual:false,stamps_required:5,
      purchase_product:{inventory_product_id:coffee.id,product_name:'Nombre falso'},
      benefit_value:{label:'Torta gratis',product_scope:{inventory_product_id:cake.id,product_name:'Premio falso'}}});
    const p=await svc.saveProgram(business.id,user.id,payload);
    assert.deepEqual(p.purchase_product,{inventory_product_id:coffee.id,product_name:coffee.name});
    assert.deepEqual(p.benefit_value.product_scope,{inventory_product_id:cake.id,product_name:cake.name,mode:'gift_product'});
    const ctx=await svc.context(business.id);assert.ok(ctx.inventory_products.some(x=>x.id===coffee.id));
    assert.ok(!ctx.inventory_products.some(x=>x.id===foreign.id));
    await assert.rejects(()=>svc.saveProgram(business.id,user.id,{...payload,purchase_product:{inventory_product_id:foreign.id}}),/inventario de tu negocio/);
    await assert.rejects(()=>svc.saveProgram(business.id,user.id,{...payload,benefit_value:{label:'No permitido',product_scope:{inventory_product_id:foreign.id}}}),/inventario de tu negocio/);
    await query("update business_inventory_products set status='ARCHIVED' where id=$1",[cake.id]);
    await assert.rejects(()=>svc.saveProgram(business.id,user.id,payload),/producto activo/);
    await query("update business_inventory_products set status='ACTIVE' where id=$1",[cake.id]);
    assert.equal(programSchema.safeParse({...rules,purchase_product:{inventory_product_id:'bad'}}).success,false);
    assert.equal(programSchema.safeParse({...rules,benefit_type:'CUSTOM',benefit_value:payload.benefit_value}).success,false);
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Inventario QA',document_id:'INVENTORYQA'});
    const line=(id,quantity=1,unit_price=6000)=>({inventory_product_id:id,name:'Texto no autoritativo',quantity,unit_price});
    const purchase=async(items,extra={})=>(await query(`insert into business_sales
      (business_id,customer_document_id,sale_amount,paid_at,sale_status,metadata,inventory_product_id,quantity)
      values ($1,'INVENTORYQA',$2,clock_timestamp(),$3,$4::jsonb,$5,1) returning *`,
      [extra.business||business.id,extra.amount||12000,extra.status||'PAID',JSON.stringify(items),extra.product||null])).rows[0];
    await purchase({products:[line(cake.id)]});await purchase({products:[{name:coffee.name,quantity:1,unit_price:6000}]});
    await purchase({products:[line(coffee.id,0)]});await purchase({products:[line(coffee.id,1,0)]});
    await purchase({products:[line(coffee.id)]},{amount:100});await purchase({products:[line(coffee.id)]},{business:other.id});
    await purchase({products:[line(coffee.id)]},{status:'VOIDED'});await purchase({products:{bad:true}});
    assert.equal((await current(m)).stamps,0);
    const a=await purchase({products:[line(cake.id),line(coffee.id,3)]});assert.equal((await current(m)).stamps,1);
    await query('update business_sales set metadata=$2::jsonb where id=$1',[a.id,JSON.stringify({products:[line(coffee.id,4)]})]);
    assert.equal((await current(m)).stamps,1);
    await purchase({},{product:coffee.id});assert.equal((await current(m)).stamps,2);
    const pending=await purchase({line_items:[line(coffee.id)]},{status:'PENDING'});
    await query("update business_sales set sale_status='PAID' where id=$1",[pending.id]);assert.equal((await current(m)).stamps,3);
    const imported=await purchase({products:[{name:coffee.name,quantity:1,unit_price:6000}]});
    assert.equal((await current(m)).stamps,3);
    await query('update business_sales set metadata=$2::jsonb where id=$1',[imported.id,JSON.stringify({products:[line(coffee.id)]})]);
    assert.equal((await current(m)).stamps,4);
    await svc.saveProgram(business.id,user.id,{...payload,purchase_product:{inventory_product_id:cake.id},benefit_value:{label:'Café gratis',product_scope:{inventory_product_id:coffee.id}}},p.id);
    await purchase({products:[line(cake.id)]});assert.equal((await current(m)).stamps,4);
    await query('update business_inventory_products set name=$2 where id=$1',[coffee.id,'Nombre cambiado']);
    await purchase({products:[line(coffee.id)]});assert.equal((await current(m)).stamps,5);
    const c=await current(m),publicCard=await svc.publicCard(m.public_token);
    assert.equal(publicCard.cycles[0].rules.purchase_product.product_name,'Café inventario');
    const reward=await svc.claim(m.public_token,c.id),details=await getQrDetails(reward.ticket_code,user);
    const qr=(await query('select benefit_value from qr_codes where id=$1',[(await current(m)).qr_code_id])).rows[0];
    assert.equal(qr.benefit_value.product_scope.inventory_product_id,cake.id);
    assert.equal(details.allowed,true);
    const redeemPayload={mode:'STANDALONE',idempotency_key:crypto.randomUUID(),beneficiary:{name:'Inventario QA',document_id:'INVENTORYQA',data_use_confirmed:true}};
    await redeemQr(reward.ticket_code,user,redeemPayload);await redeemQr(reward.ticket_code,user,redeemPayload);
    const redemption=(await query('select metadata from redemptions where qr_code_id=$1',[(await current(m)).qr_code_id])).rows[0];
    assert.deepEqual(redemption.metadata.benefit_application.gifts,['Torta inventario']);
    const next=await svc.renew(m.public_token);assert.equal(next.cycle.rules.purchase_product.inventory_product_id,cake.id);
    assert.equal(next.cycle.rules.benefit_value.product_scope.inventory_product_id,coffee.id);
    await query("update business_sales set sale_status='VOIDED' where id=$1",[a.id]);
    await query("update business_sales set sale_status='PAID' where id=$1",[a.id]);
    assert.equal((await query('select stamps from stamp_cycles where id=$1',[c.id])).rows[0].stamps,4);
    assert.equal((await current(m)).stamps,0);
    // An already consumed sale cannot generate a second stamp on a later cycle.
    await query('update business_sales set metadata=$2::jsonb where id=$1',[a.id,JSON.stringify({products:[line(cake.id)]})]);
    assert.equal((await current(m)).stamps,0);
  });
  await t.test('existing cards receive a stable identification QR without leaking the private claim link or consuming credits',async()=>{
    const {PNG}=require('pngjs'),jsQR=require('jsqr');
    const before=(await svc.context(business.id)).ticket_balance;
    const card=await svc.publicCard(member.public_token),again=await svc.publicCard(member.public_token);
    assert.equal(card.identification.qr_image,again.identification.qr_image);
    const png=PNG.sync.read(Buffer.from(card.identification.qr_image.split(',')[1],'base64'));
    const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
    assert.equal(decoded.data,card.identification.scan_url);
    assert.equal(new URL(decoded.data).searchParams.get('stamp_card'),member.id);
    assert.ok(!decoded.data.includes(member.public_token));assert.ok(!decoded.data.includes(member.document_key));
    assert.equal((await svc.context(business.id)).ticket_balance,before);
  });
  await t.test('scanned card lookup is read only and quick stamps enforce permission, concurrency, stale state and renewal',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'QR presencial',allow_manual:false,stamps_required:3});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Contacto con QR',document_id:'CARDQR123'});
    const c=await current(m),payload={cycle_id:c.id,expected_stamps:0};
    const before=(await svc.context(business.id)).ticket_balance;
    const scan=await svc.validatorCard(business.id,m.id);
    assert.equal(scan.card.name,m.name);assert.equal(scan.can_stamp,false);assert.equal((await current(m)).stamps,0);
    assert.ok(!JSON.stringify(scan).includes(m.public_token));assert.ok(!JSON.stringify(scan).includes('reward_cost'));
    await assert.rejects(()=>svc.validatorCard(other.id,m.id),/no encontrada/);
    await assert.rejects(()=>svc.stampFromQr(other.id,user.id,m.id,payload),/no encontrada/);
    await assert.rejects(()=>svc.stampFromQr(business.id,user.id,m.id,payload),/Habilita/);
    await svc.saveProgram(business.id,user.id,{...rules,name:p.name,allow_manual:true,stamps_required:3},p.id);
    assert.equal((await svc.validatorCard(business.id,m.id)).can_stamp,true);
    const results=await Promise.all([1,2,3].map(()=>svc.stampFromQr(business.id,user.id,m.id,payload)));
    assert.equal(results.filter(r=>!r.duplicate).length,1);assert.equal((await current(m)).stamps,1);
    assert.equal((await svc.context(business.id)).ticket_balance,before);
    const event=(await query("select * from stamp_events where member_id=$1 and source='MANUAL'",[m.id])).rows[0];
    assert.equal(event.actor_id,user.id);assert.match(event.note,/QR/);assert.equal(Number(event.sale_amount),0);
    await assert.rejects(()=>svc.stampFromQr(business.id,user.id,m.id,{...payload,cycle_id:crypto.randomUUID(),expected_stamps:1}),/cambió/);
    await svc.stampFromQr(business.id,user.id,m.id,{...payload,expected_stamps:1});
    await svc.stampFromQr(business.id,user.id,m.id,{...payload,expected_stamps:2});
    assert.equal((await svc.validatorCard(business.id,m.id)).can_stamp,false);
    await assert.rejects(()=>svc.stampFromQr(business.id,user.id,m.id,{...payload,expected_stamps:3}),/completa/);
    await query("update stamp_cycles set expires_at=now()-interval '1 minute' where id=$1",[c.id]);
    const oldQr=(await svc.publicCard(m.public_token)).identification.scan_url;
    await svc.renew(m.public_token);
    const renewed=await svc.validatorCard(business.id,m.id);
    assert.equal(renewed.card.cycle_number,2);assert.equal(renewed.card.stamps,0);
    assert.equal((await svc.publicCard(m.public_token)).identification.scan_url,oldQr);
    await svc.stampFromQr(business.id,user.id,m.id,payload);assert.equal((await current(m)).stamps,0);
    await svc.saveProgram(business.id,user.id,{...rules,status:'PAUSED'},p.id);
    assert.equal((await svc.validatorCard(business.id,m.id)).can_stamp,false);
    await assert.rejects(()=>svc.stampFromQr(business.id,user.id,m.id,{cycle_id:renewed.card.cycle_id,expected_stamps:0}),/activo/);
  });
  await t.test('a fresh scan can stamp after a reversal while retries of the voided stamp remain idempotent',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'QR con anulación',stamps_required:3});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'Corrección QR',document_id:'QRVOID123'});
    const c=await current(m),payload={cycle_id:c.id,expected_stamps:0,expected_voids:0};
    await svc.stampFromQr(business.id,user.id,m.id,payload);
    const event=(await query('select id from stamp_events where cycle_id=$1',[c.id])).rows[0];
    await svc.voidStamp(business.id,user.id,event.id,'Prueba de corrección');
    assert.equal((await svc.stampFromQr(business.id,user.id,m.id,payload)).duplicate,true);
    assert.equal((await current(m)).stamps,0);
    const scan=await svc.validatorCard(business.id,m.id);
    assert.equal(scan.card.void_count,1);assert.equal(scan.can_stamp,true);
    await assert.rejects(()=>svc.stampFromQr(business.id,user.id,m.id,{...payload,expected_stamps:1}),/cambió/);
    const corrected=await svc.stampFromQr(business.id,user.id,m.id,{...payload,expected_voids:scan.card.void_count});
    assert.equal(corrected.duplicate,false);assert.equal(corrected.card.stamps,1);
    assert.equal((await svc.stampFromQr(business.id,user.id,m.id,{...payload,expected_voids:1})).duplicate,true);
  });
  await t.test('validator role can find and stamp its own cards but cannot manage programs or bypass daily limits',async()=>{
    const p=await svc.saveProgram(business.id,user.id,{...rules,name:'QR diario',one_per_day:true});
    const {member:m}=await svc.enroll(business.id,user.id,{program_id:p.id,name:'QR diario',document_id:'QRDAILY123'});
    const c=await current(m);
    const validator=(await query(`insert into app_users(business_id,email,password_hash,full_name,role)
      values ($1,$2,'test','Validador QA','VALIDATOR') returning *`,[business.id,crypto.randomUUID()+'@example.test'])).rows[0];
    const jwt=require('jsonwebtoken'),{app}=require('../backend/src/app');
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}/api/business/stamp-cards`;
    const headers={'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({sub:validator.id,password_version:0},process.env.JWT_SECRET)}`};
    try{
      assert.equal((await fetch(base+`/validator/${m.id}`)).status,401);
      assert.equal((await fetch(base+`/validator/${m.id}`,{headers})).status,200);
      assert.equal((await fetch(base+'/context',{headers})).status,403);
      assert.equal((await fetch(base+'/programs',{method:'POST',headers,body:JSON.stringify(rules)})).status,403);
      assert.equal((await fetch(base+'/validator/not-an-id',{headers})).status,400);
      const stamp=body=>fetch(base+`/validator/${m.id}/stamp`,{method:'POST',headers,body:JSON.stringify(body)});
      assert.equal((await stamp({cycle_id:c.id})).status,400);
      const response=await stamp({cycle_id:c.id,expected_stamps:0});assert.equal(response.status,200);
      const result=await response.json();assert.equal(result.card.stamps,1);assert.equal(result.can_stamp,false);assert.match(result.blocked_reason,/hoy/);
      assert.equal((await stamp({cycle_id:c.id,expected_stamps:1})).status,400);
      const e=(await query('select actor_id from stamp_events where member_id=$1',[m.id])).rows[0];assert.equal(e.actor_id,validator.id);
    }finally{await new Promise(resolve=>server.close(resolve));}
  });
});
after(()=>pool.end());

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
  (business_id,customer_document_id,customer_name,sale_amount,paid_at,sale_status) values ($1,$2,'Cliente QA',$3,$4,$5) returning *`,
  [extra.business||business.id,document,amount,extra.paid_at||new Date(),extra.status||'PAID'])).rows[0];}
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
});
after(()=>pool.end());

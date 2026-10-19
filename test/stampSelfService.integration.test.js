const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('crypto');
// Never use a production DATABASE_URL for these tests.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55439/stamp_cards_qa';
process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3049';
process.env.JWT_SECRET='local-stamp-self-service-tests';
const {query,pool}=require('../backend/src/config/db');
const svc=require('../backend/src/services/stampCardService');
const rules={name:'Tu café de siempre',stamps_required:8,benefit_type:'FREE_GIFT',benefit_value:{label:'Un café gratis'},minimum_purchase:5000,
  one_per_day:true,allow_manual:true,card_valid_days:365,ticket_valid_days:30,reward_cost:2000,ticket_cost:1000,terms:'Beneficio personal.',status:'ACTIVE'};
const customer=()=>({name:'Ana Prueba',document_id:crypto.randomUUID(),phone:'3000000000',email:'ana@example.test',consent:true,access_key:crypto.randomBytes(32).toString('hex')});
let server;
test('program QR self-service registration',{skip:process.env.STAMP_CARD_INTEGRATION!=='1'},async t=>{
  const business=(await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values ('Autoservicio QA',$1,'PRO','ACTIVE',$2::jsonb) returning *`,
    ['self-service-'+crypto.randomUUID(),JSON.stringify({subscription:{lifetime_access:true,monthly_payment_required:false}})])).rows[0];
  const other=(await query(`insert into businesses(name,slug,plan_code) values ('Otro QA',$1,'PRO') returning *`,['other-'+crypto.randomUUID()])).rows[0];
  const user=(await query(`insert into app_users(business_id,email,password_hash,full_name,role) values ($1,$2,'test','QA','BUSINESS_OWNER') returning *`,[business.id,crypto.randomUUID()+'@example.test'])).rows[0];
  const program=await svc.saveProgram(business.id,user.id,rules);
  const {app}=require('../backend/src/app');
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base=`http://127.0.0.1:${server.address().port}`;
  const publicPath=`/api/public/stamp-cards/programs/${program.id}`;
  const post=(body,path=publicPath+'/enroll')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const auth={Authorization:`Bearer ${require('jsonwebtoken').sign({sub:user.id,password_version:0},process.env.JWT_SECRET)}`};
  await t.test('stable QR is tenant-scoped and contains the public program URL only',async()=>{
    const a=await svc.enrollmentQr(business.id,program.id),b=await svc.enrollmentQr(business.id,program.id);
    assert.equal(a.url,b.url);assert.match(a.url,/\/sellos\/inscripcion.html\?programa=/);assert.equal(new URL(a.url).hash,'');
    const png=require('pngjs').PNG.sync.read(Buffer.from(a.qr_image.split(',')[1],'base64'));
    const decoded=require('jsqr')(new Uint8ClampedArray(png.data),png.width,png.height);
    assert.equal(decoded.data,a.url);
    await assert.rejects(()=>svc.enrollmentQr(other.id,program.id),/no encontrado/);
    assert.equal((await fetch(base+`/api/business/stamp-cards/programs/${program.id}/enrollment-qr`)).status,401);
    assert.equal((await fetch(base+`/api/business/stamp-cards/programs/${program.id}/enrollment-qr`,{headers:auth})).status,200);
  });
  await t.test('public landing exposes rules and branding without private fields',async()=>{
    const response=await fetch(base+publicPath);assert.equal(response.status,200);
    assert.match(response.headers.get('cache-control'),/no-store/);
    const info=await response.json();assert.equal(info.business.name,business.name);assert.equal(info.program.stamps_required,8);
    for(const key of ['reward_cost','ticket_cost','created_by','business_id','public_token'])assert.equal(JSON.stringify(info).includes(key),false);
    assert.equal((await fetch(base+'/sellos/inscripcion.html')).status,200);
    assert.equal((await fetch(base+'/api/public/stamp-cards/programs/not-a-uuid')).status,400);
  });
  await t.test('unauthenticated enrollment creates a personalized zero-stamp card without credit use',async()=>{
    const input=customer();const response=await post({...input,business_id:other.id,program_id:crypto.randomUUID(),stamps:50,public_token:'forged'});
    assert.equal(response.status,200);const result=await response.json();assert.deepEqual(Object.keys(result).sort(),['existing','url']);
    const token=new URL(result.url).hash.slice(1),card=await svc.publicCard(token);
    assert.equal(card.name,'Ana');assert.equal(card.business.name,business.name);assert.equal(card.cycles[0].stamps,0);
    assert.equal(card.cycles[0].rules.stamps_required,8);assert.ok(card.identification.qr_image);
    const m=(await query('select * from stamp_members where public_token=$1',[token])).rows[0];
    assert.equal(m.business_id,business.id);assert.equal(m.program_id,program.id);assert.equal(m.created_by,null);assert.ok(m.consent_at);
    assert.equal((await query('select count(*)::int n from business_qr_credit_ledger where business_id=$1',[business.id])).rows[0].n,0);
    assert.ok((await svc.members(business.id)).members.some(row=>row.id===m.id));
    assert.equal((await svc.members(other.id)).members.length,0);
  });
  await t.test('concurrent retries return the same card and other callers cannot recover or overwrite it',async()=>{
    const input=customer(),results=await Promise.all([1,2,3].map(()=>svc.publicEnroll(program.id,input)));
    assert.equal(new Set(results.map(r=>r.url)).size,1);assert.equal(results.filter(r=>!r.existing).length,1);
    const token=new URL(results[0].url).hash.slice(1);
    await assert.rejects(()=>svc.publicEnroll(program.id,{...input,name:'Intruso',access_key:customer().access_key}),/enlace personal/);
    const m=(await query('select * from stamp_members where public_token=$1',[token])).rows[0];assert.equal(m.name,input.name);
    assert.equal((await query('select count(*)::int n from stamp_cycles where member_id=$1',[m.id])).rows[0].n,1);
    const manual=await svc.enroll(business.id,user.id,{...customer(),program_id:program.id});
    await assert.rejects(()=>svc.publicEnroll(program.id,{...customer(),document_id:manual.member.document_key}),/enlace personal/);
  });
  await t.test('consent, identity and retry key are required',async()=>{
    for(const override of [{consent:false},{name:''},{document_id:'---'},{access_key:'guess'},{email:'bad'}])assert.equal((await post({...customer(),...override})).status,400);
  });
  await t.test('pasted email whitespace is normalized before creating the card',async()=>{
    const input={...customer(),email:'  ana@example.test  '};
    const result=await post(input);assert.equal(result.status,200);
    assert.equal((await query('select email from stamp_members where program_id=$1 and document_key=$2',[program.id,svc.normalizeDocument(input.document_id)])).rows[0].email,'ana@example.test');
  });
  await t.test('paused, archived, deleted and inactive-business programs reject registration',async()=>{
    const p=await svc.saveProgram(business.id,user.id,rules);
    for(const status of ['PAUSED','ARCHIVED']){
      await svc.saveProgram(business.id,user.id,{...rules,status},p.id);
      const qr=await svc.enrollmentQr(business.id,p.id);assert.equal(qr.program_status,status);assert.ok(qr.url.includes(p.id));
      await assert.rejects(()=>svc.publicProgram(p.id),/no está disponible/);
      await assert.rejects(()=>svc.publicEnroll(p.id,customer()),/no está disponible/);
    }
    await svc.saveProgram(business.id,user.id,rules,p.id);
    await query('update businesses set is_active=false where id=$1',[business.id]);
    try{await assert.rejects(()=>svc.publicEnroll(p.id,customer()),/no está disponible/);}finally{await query('update businesses set is_active=true where id=$1',[business.id]);}
    await svc.deleteProgram(business.id,user.id,p.id);
    await assert.rejects(()=>svc.publicProgram(p.id),/no está disponible/);
    await assert.rejects(()=>svc.publicEnroll(p.id,customer()),/no está disponible/);
  });
  await t.test('Descubre permits cards while active and blocks expired subscriptions including retries',async()=>{
    await query(`update businesses set plan_code='DESCUBRE',settings='{}'::jsonb,
      subscription_current_period_ends_at=now()+interval '30 days' where id=$1`,[business.id]);
    const input=customer();assert.ok((await svc.publicEnroll(program.id,input)).url);
    await query("update businesses set subscription_current_period_ends_at=now()-interval '1 day' where id=$1",[business.id]);
    await assert.rejects(()=>svc.publicProgram(program.id),/no están disponibles/);
    await assert.rejects(()=>svc.publicEnroll(program.id,customer()),/no están disponibles/);
    await assert.rejects(()=>svc.publicEnroll(program.id,input),/no están disponibles/);
    await query("update businesses set plan_code='PRO',settings=$2::jsonb where id=$1",[business.id,JSON.stringify(business.settings)]);
  });
  await t.test('finite configured card quotas are enforced through the shared enrollment path',async()=>{
    const {PLAN_CATALOG}=require('../backend/src/services/subscriptionService');
    const previous=PLAN_CATALOG.PRO.limits.stamp_members;
    PLAN_CATALOG.PRO.limits.stamp_members=0;
    try{await assert.rejects(()=>svc.publicEnroll(program.id,customer()),/permite hasta/);}
    finally{if(previous===undefined)delete PLAN_CATALOG.PRO.limits.stamp_members;else PLAN_CATALOG.PRO.limits.stamp_members=previous;}
  });
  await t.test('public enrollment is rate-limited',async()=>{
    let response;for(let i=0;i<21;i++)response=await post({});assert.equal(response.status,429);
  });
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool.end();});

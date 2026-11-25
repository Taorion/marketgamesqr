'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_demonstrations_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='demonstrations-local-tests';process.env.PUBLIC_APP_URL='http://127.0.0.1:4877';process.env.QORI_DEMO_EMAIL_ENABLED='false';process.env.TZ='Pacific/Auckland';
const {query,pool}=require('../backend/src/config/db');
const {createService,policy}=require('../backend/src/services/demonstrationService');
const {worker}=require('../backend/src/services/demonstrationWorker');
const jwt=require('jsonwebtoken'),sharp=require('sharp'),jsQR=require('jsqr');
let time=new Date('2027-01-04T15:00:00Z'),operational=false,failMail=false,sent=[];
const s=createService({now:()=>new Date(time),mailOperational:()=>operational,deliver:async(p,k)=>{if(failMail)throw Error('mock provider failure');sent.push({p,k});return 'mock-'+k;}});
require('../backend/src/services/demonstrationRuntime').service=s;
let server,base,seller,other,admin,invite,slots,first,second;
const rand=()=>crypto.randomBytes(32).toString('base64url'),uuid=()=>crypto.randomUUID();
async function person(role='QORI_SELLER'){
 const mail=role==='QORI_SUPERADMIN'?'cbotero@gosqori.com':uuid()+'@example.test';
 const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Embajador de prueba',$2) on conflict(email) do update set role=excluded.role,is_active=true returning *",[mail,role])).rows[0];
 if(role==='QORI_SELLER')await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1','APPROVED','DOCUMENTS')",[u.id,uuid()]);return u;
}
const body=(slot,over={})=>({invitation:invite,session_id:slot.id,request_key:rand(),name:'Prospecto de prueba',business_name:'Negocio de prueba',email:uuid()+'@example.test',privacy_accepted:true,...over});
async function api(path,data,user=null,method=data?'POST':'GET'){const publicPath=['reserve','recover','reservation','invitation'].includes(path.split('/')[1]);const r=await fetch(base+(publicPath?'/api/demonstrations':'/api/seller/demonstrations')+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:user.password_version||0},process.env.JWT_SECRET)}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
const sessionEdit=(session,over={})=>({meet_url:session.meet_url,status:session.status,capacity:session.capacity,date:policy.colombiaDate(session.starts_at),time:new Date(new Date(session.starts_at).getTime()-5*3600000).toISOString().slice(11,16),duration_minutes:60,reason:'Cambio de prueba autorizado',...over});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Commercial demonstrations: local PostgreSQL, controlled clock and simulated delivery',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_demonstrations_qa');
 await query('truncate qori_demo_feedback,qori_demo_feedback_forms,qori_demo_messages,qori_demo_incidents,qori_demo_events,qori_demo_visits,qori_demo_access,qori_demo_bookings,qori_demo_invitations,qori_demo_sessions');
 await query('update qori_demo_config set approved=false,enabled=false,settings=$1',[policy.DEFAULTS]);
 await query("update qori_demo_templates set confirmed=not(weekday in(3,4) and local_time='10:00'),duration_minutes=60");
 seller=await person();other=await person();admin=await person('QORI_SUPERADMIN');server=require('../backend/src/app').app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 await t.test('initial proposals are disabled; exactly 12 templates with two pending confirmations',async()=>{
  const w=await s.workspace(admin);assert.equal(w.config.approved,false);assert.equal(w.templates.length,12);assert.equal(w.templates.filter(t=>!t.confirmed).length,2);assert.equal(w.available.length,0);
  await assert.rejects(s.saveConfig(admin,{settings:policy.DEFAULTS,enabled:true,accept_proposals:false}));
  const i=await s.invite(seller,{});invite=new URL(i.url).searchParams.get('i');const {data,info}=await sharp(Buffer.from(i.qr_data_url.split(',')[1],'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(jsQR(new Uint8ClampedArray(data),info.width,info.height).data,i.url);
  assert.equal((await s.landing(invite)).ambassador,seller.full_name);
 });
 await t.test('explicit configuration; first dates and four exact Meets; deterministic recurrence in foreign TZ',async()=>{
  await s.saveConfig(admin,{settings:{...policy.DEFAULTS,email_enabled:true},enabled:true,accept_proposals:true});
  slots=(await s.workspace(admin)).sessions;assert.ok(slots.length);assert.ok(slots.every(s=>policy.colombiaDate(s.starts_at)>='2027-01-05'));
  assert.equal(slots.filter(s=>policy.colombiaDate(s.starts_at)==='2027-01-05').length,4);
  const firstDay=slots.slice(0,4);assert.deepEqual(firstDay.map(s=>s.meet_url),['https://meet.google.com/apc-mdfv-pjz','https://meet.google.com/hmm-bwho-vxy','https://meet.google.com/djh-wqny-ggd','https://meet.google.com/xpt-jroa-aec']);assert.equal(new Date(firstDay[0].starts_at).toISOString(),'2027-01-05T13:00:00.000Z');
  const count=slots.length;assert.equal((await s.workspace(admin)).sessions.length,count);assert.equal((await s.landing(invite)).sessions.filter(s=>policy.colombiaDate(s.starts_at)==='2027-01-06').length,3);
  time=new Date('2026-10-01T12:00:00Z');assert.equal((await s.landing(invite)).sessions.length,0);time=new Date('2027-01-04T15:00:00Z');
 });
 await t.test('public reservation without business account and exact Meet; signed subscription prospect association',async()=>{
  first=await s.reserve(body(slots[0]));assert.equal(first.status,'CONFIRMED');assert.equal(first.session.meet_url,slots[0].meet_url);assert.ok(first.subscription.url);
  const url=new URL(first.subscription.url);assert.equal(url.searchParams.get('advisor'),seller.id);assert.ok(url.searchParams.get('prospect_ref'));
  const b=await s.booking({query},first.id);assert.equal(b.business_id,null);assert.equal(b.prospect_stage,'NEW');assert.equal(b.owner_id,seller.id);
  assert.equal((await query('select count(*) n from qori_demo_messages where booking_id=$1',[first.id])).rows[0].n,'2');
 });
 await t.test('concurrent same request is idempotent; different key with same email never discloses access',async()=>{
  const d=body(slots[1]);const results=await Promise.all([s.reserve(d),s.reserve(d),s.reserve(d)]);assert.equal(new Set(results.map(r=>r.id)).size,1);assert.equal(new Set(results.map(r=>r.token)).size,1);second=results[0];
  const r=await s.reserve({...d,request_key:rand()});assert.equal(r.recovery_required,true);assert.equal(r.token,undefined);assert.equal(r.id,undefined);
  await assert.rejects(s.reserve({...d,name:'Changed payload'}));
 });
 await t.test('existing contact is reused without overwriting private notes; forwarded invitation reveals no contact data',async()=>{
  const p=(await query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email,phone,notes,stage) values($1,'Private company','Private person',$2,'1234567','PRIVATE-NOTES','CONTACTED') returning *",[seller.id,uuid()+'@example.test'])).rows[0];
  const i=await s.invite(seller,{prospect_id:p.id});const token=new URL(i.url).searchParams.get('i'),landing=await s.landing(token);assert.ok(!JSON.stringify(landing).includes('PRIVATE'));assert.ok(!JSON.stringify(landing).includes(p.email));
  const r=await s.reserve(body(slots[2],{invitation:token,email:p.email.toUpperCase()}));const b=await s.booking({query},r.id);assert.equal(b.prospect_id,p.id);assert.equal((await query('select notes from qori_sales_prospects where id=$1',[p.id])).rows[0].notes,'PRIVATE-NOTES');
 });
 await t.test('cross-ambassador conflict preserves owner and hides booking from origin seller',async()=>{
  const i=await s.invite(other,{}),token=new URL(i.url).searchParams.get('i');const b=await s.booking({query},first.id);
  const r=await s.reserve(body(slots[3],{invitation:token,email:b.email}));assert.equal(new URL(r.subscription.url).searchParams.get('advisor'),seller.id);
  assert.equal((await s.workspace(other)).bookings.some(x=>x.id===r.id),false);assert.ok((await s.workspace(seller)).bookings.some(x=>x.id===r.id));
  assert.ok((await s.workspace(admin)).incidents.some(x=>x.booking_id===r.id));
  await assert.rejects(s.followup(other,r.id,{status:'PENDING',next_contact_at:null,notes:'forged'}),e=>e.status===403);
  assert.equal((await api('/reserve',{...body(slots[3]),seller_id:other.id})).status,400);
 });
 await t.test('ambiguous identity is not merged and remains admin-only until reviewed',async()=>{
  const mail=uuid()+'@example.test';for(const u of [seller,other])await query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email,stage) values($1,'Ambiguous','Person',$2,'NEW')",[u.id,mail]);
  const r=await s.reserve(body(slots[2],{email:mail}));assert.equal((await s.booking({query},r.id)).prospect_id,null);assert.equal(r.subscription.url,null);assert.ok(!(await s.workspace(seller)).bookings.some(b=>b.id===r.id));
 });
 await t.test('capacity is enforced atomically under concurrency and cannot be reduced below active seats',async()=>{
  const target=slots.find(s=>policy.colombiaDate(s.starts_at)==='2027-01-07'&&s.status==='ENABLED');await s.changeSession(admin,target.id,sessionEdit(target,{capacity:1}));
  const results=await Promise.allSettled(Array.from({length:5},()=>s.reserve(body(target))));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(s.changeSession(admin,slots[0].id,sessionEdit(slots[0],{capacity:0})));
 });
 await t.test('pending, closed, canceled, missing Meet, past and started sessions reject direct reservations',async()=>{
  const pending=slots.find(s=>!s.confirmed_template);await assert.rejects(s.reserve(body(pending)));
  for(const state of ['CLOSED','CANCELLED','DRAFT']){const target=slots.find(s=>policy.colombiaDate(s.starts_at)==='2027-01-12'&&s.status==='ENABLED'&&!s.used);target.used=true;await s.changeSession(admin,target.id,sessionEdit(target,{status:state}));await assert.rejects(s.reserve(body(target)));}
  const noMeet=slots.find(s=>policy.colombiaDate(s.starts_at)==='2027-01-13'&&s.status==='ENABLED');await s.changeSession(admin,noMeet.id,sessionEdit(noMeet,{meet_url:'',status:'CLOSED'}));await assert.rejects(s.reserve(body(noMeet)));
  const old=time;time=new Date(slots[0].starts_at);await assert.rejects(s.reserve(body(slots[0])));time=new Date('2027-01-06T00:00:00Z');await assert.rejects(s.reserve(body(slots[0])));time=old;
 });
 await t.test('safe move keeps identity/history and failure keeps original reservation',async()=>{
  const before=await s.booking({query},first.id),pending=slots.find(s=>!s.confirmed_template);await assert.rejects(s.change(first.token,{action:'MOVE',session_id:pending.id}));assert.equal((await s.manage(first.token)).session.id,before.session_id);
  const target=slots.find(s=>policy.colombiaDate(s.starts_at)==='2027-01-06'&&s.status==='ENABLED');const moved=await s.change(first.token,{action:'MOVE',session_id:target.id});assert.equal(moved.session.id,target.id);const after=await s.booking({query},first.id);assert.equal(after.owner_id,before.owner_id);assert.equal(after.prospect_id,before.prospect_id);
  assert.equal((await query('select count(*) n from qori_demo_visits where booking_id=$1',[first.id])).rows[0].n,'2');assert.ok((await query("select 1 from qori_demo_messages where booking_id=$1 and status='CANCELLED'",[first.id])).rowCount);
 });
 await t.test('Meet exception updates current confirmation and queues notice; schedule change requires acceptance',async()=>{
  let current=await s.session({query},second.session.id);await s.changeSession(admin,current.id,sessionEdit(current,{meet_url:'https://meet.google.com/abc-defg-hij'}));assert.equal((await s.manage(second.token)).session.meet_url,'https://meet.google.com/abc-defg-hij');
  current=await s.session({query},current.id);await s.changeSession(admin,current.id,sessionEdit(current,{time:'11:00'}));assert.equal((await s.manage(second.token)).status,'PENDING_CHANGE');assert.equal((await s.change(second.token,{action:'ACCEPT'})).status,'CONFIRMED');
 });
 await t.test('mail failure preserves reservation; controlled retry and provider idempotency; no real delivery',async()=>{
  operational=true;failMail=true;const w=worker(s);await w.tick();const r=await s.manage(second.token);assert.equal(r.status,'CONFIRMED');assert.ok(r.communications.some(m=>m.status==='FAILED'));assert.equal(sent.length,0);
  failMail=false;time=new Date(time.getTime()+2*60000);await w.tick();assert.ok(sent.length);assert.equal(new Set(sent.map(x=>x.k)).size,sent.length);const n=sent.length;await w.tick();assert.equal(sent.length,n);assert.ok(sent.some(x=>x.p.text.includes('https://meet.google.com/abc-defg-hij')));
 });
 await t.test('recovery never returns tokens or confirms whether email exists; arbitrary secret fails',async()=>{
  const b=await s.booking({query},second.id),a=await s.recover({email:b.email}),unknown=await s.recover({email:uuid()+'@example.test'});assert.deepEqual(a,unknown);assert.equal(a.token,undefined);await assert.rejects(s.manage(rand()),e=>e.status===404);
  assert.equal((await api('/reservation')).status,400);assert.equal((await api('/workspace')).status,401);assert.equal((await api('/admin/config',{settings:policy.DEFAULTS,enabled:true,accept_proposals:true},seller)).status,403);
 });
 await t.test('cancel releases seat and cancels all pending reminders',async()=>{
  const r=await s.change(first.token,{action:'CANCEL'});assert.equal(r.status,'CANCELLED');assert.equal(r.session.meet_url,null);assert.equal((await query("select count(*) n from qori_demo_messages where booking_id=$1 and kind like 'REMINDER%' and status in('PENDING','FAILED')",[first.id])).rows[0].n,'0');
 });
 await t.test('attendance is explicit, audited, preserved after a later booking; CRM next action reused',async()=>{
  time=new Date('2027-01-05T18:00:00Z');const visits=(await s.workspace(admin)).visits.filter(v=>v.booking_id===second.id&&v.active);assert.equal(visits[0].attendance,'PENDING');
  await assert.rejects(s.attendance(other,visits[0].id,{attendance:'ATTENDED',reason:'Una prueba'}),e=>e.status===403);
  await s.attendance(admin,visits[0].id,{attendance:'ABSENT',reason:'No participó en la sesión'});const before=await s.booking({query},second.id);assert.ok(before.followup_due);
  const target=(await s.landing(invite)).sessions[0];await s.change(second.token,{action:'MOVE',session_id:target.id});assert.equal((await query('select attendance from qori_demo_visits where id=$1',[visits[0].id])).rows[0].attendance,'ABSENT');
  await s.followup(seller,second.id,{status:'AGREED',next_contact_at:'2027-01-07T15:00:00Z',notes:'Resolver seguimiento y acordar nueva fecha'});assert.ok((await query('select notes from qori_sales_prospects where id=$1',[before.prospect_id])).rows[0].notes.includes('Resolver seguimiento'));
  assert.equal((await s.booking({query},second.id)).prospect_stage,'NEW');
 });
 await t.test('metrics use original reservations, explicit expected attendance and no invented paid conversions',async()=>{
  const m=await require('../backend/src/services/demonstrationMetrics').metrics(s,admin,{from:'2026-11-01',to:'2027-01-08'});assert.ok(m.reservations>0);assert.ok(m.attendance.absent>=1);assert.equal(m.conversion.paid_reservations,0);assert.ok(m.conversion.unidentified_reservations>0);assert.ok(m.reschedules.public>0);assert.ok(m.reschedules.admin>0);
 });
 await t.test('tables are RLS-protected and sensitive data never appears in anonymous schedule',async()=>{
  const tables=(await query("select relname,relrowsecurity from pg_class where relname like 'qori_demo_%' and relkind='r'")).rows;assert.equal(tables.length,12);assert.ok(tables.every(t=>t.relrowsecurity));const publicData=JSON.stringify(await s.landing(invite));assert.ok(!publicData.includes('@example.test'));assert.ok(!publicData.includes('token_hash'));assert.ok(!publicData.includes('meet.google.com'));
 });
 await t.test('private API scopes and pending templates are enforced after explicit administrative confirmation',async()=>{
  assert.equal((await api('/workspace',null,seller)).status,200);
  const own=(await api('/workspace',null,seller)).data,foreign=(await api('/workspace',null,other)).data;assert.ok(own.bookings.some(b=>b.id===second.id));assert.ok(!foreign.bookings.some(b=>b.id===second.id));
  const p=(await s.workspace(admin)).templates.find(t=>t.weekday===3&&t.local_time.startsWith('10:'));await s.saveTemplate(admin,p.id,{meet_url:p.meet_url,confirmed:true,duration_minutes:60,reason:'Recurrencia verificada por administrador'});await s.rebuildEmpty(admin);
  const target=(await s.landing(invite)).sessions.find(x=>new Date(x.starts_at).toISOString()==='2027-01-06T15:00:00.000Z');assert.ok(target);assert.equal((await s.reserve(body(target))).session.meet_url,'https://meet.google.com/hmm-bwho-vxy');
 });
 await t.test('no contact preference blocks further invitations from that CRM contact',async()=>{
  await s.change(second.token,{action:'STOP_CONTACT'});const b=await s.booking({query},second.id);await assert.rejects(s.invite(seller,{prospect_id:b.prospect_id}),/Respeta/);
 });
 await t.test('reminders dispatch once with current session and skip obsolete reminders',async()=>{
  const target=(await s.landing(invite)).sessions.find(x=>new Date(x.starts_at)>new Date('2027-01-07T13:00:00Z'));const r=await s.reserve(body(target)),w=worker(s);await w.tick();const prior=sent.length;
  time=new Date(new Date(target.starts_at).getTime()-3600000);await w.tick();assert.ok(sent.length>prior);const count=sent.length;await w.tick();assert.equal(sent.length,count);assert.equal(new Set(sent.map(x=>x.k)).size,sent.length);
  const state=await s.manage(r.token);assert.ok(state.communications.some(x=>x.kind==='REMINDER_1'&&x.status==='ACCEPTED'));
 });
 await t.test('administrative cancellation offers an atomic move and additional confirmation remains distinct',async()=>{
  time=new Date('2027-01-04T15:00:00Z');const target=(await s.landing(invite)).sessions.find(x=>new Date(x.starts_at)>new Date('2027-01-12T00:00:00Z'));const r=await s.reserve(body(target)),session=await s.session({query},target.id);await s.changeSession(admin,session.id,sessionEdit(session,{status:'CANCELLED'}));assert.equal((await s.manage(r.token)).status,'CANCELLED');
  const next=(await s.landing(invite)).sessions.find(x=>x.id!==target.id);assert.equal((await s.change(r.token,{action:'MOVE',session_id:next.id})).status,'CONFIRMED');
  await s.saveConfig(admin,{settings:{...policy.DEFAULTS,additional_confirmation:true},enabled:true,accept_proposals:true});const pending=await s.reserve(body(next));assert.equal(pending.status,'PENDING_CONFIRMATION');assert.equal((await s.change(pending.token,{action:'CONFIRM'})).status,'CONFIRMED');
  await s.saveConfig(admin,{settings:{...policy.DEFAULTS,email_enabled:true},enabled:true,accept_proposals:true});
 });
 await t.test('verified payment conversion deduplicates canonical businesses and excludes uncredited/refunded orders',async()=>{
  const b=await s.booking({query},second.id),business=(await query("insert into businesses(name,slug,plan_code,plan_type,portal_status,subscription_status,subscription_started_at,subscription_current_period_ends_at,settings) values('Demo conversion QA',$1,'STARTER','premium_monthly','ACTIVE','ACTIVE',now()-interval '1 day',now()+interval '30 days','{}') returning *",[uuid()])).rows[0];
  await query('insert into qori_sales_accounts(business_id,seller_id,assigned_by) values($1,$2,$3)',[business.id,seller.id,admin.id]);await query("update qori_sales_prospects set business_id=$2,stage='WON' where id=$1",[b.prospect_id,business.id]);
  // The reservation/visit fixtures are moved to a past cohort; canonical verifier retains its real clock.
  const start=new Date(Date.now()-5*86400000),end=new Date(Date.now()-2*86400000);await query('update qori_demo_bookings set created_at=$2 where id=$1',[b.id,start]);
  const order=(await query("insert into qr_credit_purchase_orders(business_id,package_code,package_size,package_title,price_cop,external_reference,status,credited_at,metadata) values($1,'STARTER',0,'Demo QA',120000,$2,'APPROVED',now()-interval '1 day',$3) returning *",[business.id,uuid(),{signup:{type:'portal_monthly_subscription',plan_code:'STARTER'}}])).rows[0];
  const v=(await query('select * from qori_demo_visits where booking_id=$1 and active',[b.id])).rows[0];await query("update qori_demo_visits set attendance='ATTENDED',expected=true where id=$1",[v.id]);await query("update qori_demo_sessions set starts_at=$2,ends_at=$3,status='FINISHED' where id=$1",[v.session_id,end,new Date(end.getTime()+3600000)]);
  const m=await require('../backend/src/services/demonstrationMetrics').metrics(s,admin,{from:start.toISOString().slice(0,10),to:'2027-01-31'});assert.equal(m.conversion.paid_reservations,1);assert.equal(m.conversion.paid_attendees,1);
  await query("update qr_credit_purchase_orders set credited_at=null where id=$1",[order.id]);assert.equal((await require('../backend/src/services/demonstrationMetrics').metrics(s,admin,{from:start.toISOString().slice(0,10),to:'2027-01-31'})).conversion.paid_reservations,0);
  // Account reassignment alone must not expose the old prospect record to either seller.
  await query('update qori_sales_accounts set seller_id=$2 where business_id=$1',[business.id,other.id]);for(const u of [seller,other])assert.ok(!(await s.workspace(u)).bookings.some(x=>x.id===b.id));
 });
 await t.test('December opening has no final date, rolls forward and uses one stable link per ambassador',async()=>{
  time=new Date('2026-11-24T15:00:00Z');await query("update qori_demo_templates set confirmed=not(weekday in(3,4) and local_time='10:00')");await s.saveConfig(admin,{settings:{...policy.DEFAULTS,email_enabled:false},enabled:true,accept_proposals:true});
  const canonical=await s.invite(seller,{}),token=new URL(canonical.url).searchParams.get('i');const list=(await s.landing(token)).sessions;assert.equal(policy.START,'2026-12-01');assert.equal(policy.DEFAULTS.end_date,null);assert.equal(list[0].starts_at.toISOString?.()||new Date(list[0].starts_at).toISOString(),'2026-12-01T13:00:00.000Z');assert.equal(list.filter(x=>policy.colombiaDate(x.starts_at)==='2026-12-01').length,4);assert.equal(list.filter(x=>policy.colombiaDate(x.starts_at)==='2026-12-02').length,3);
  const fromSession=await s.invite(seller,{session_id:list[2].id});assert.equal(fromSession.url,canonical.url);const reservation=await s.reserve(body(list[2],{invitation:token}));assert.equal(reservation.session.meet_url,'https://meet.google.com/djh-wqny-ggd');const contact=await s.booking({query},reservation.id);assert.equal((await s.invite(seller,{prospect_id:contact.prospect_id})).url,canonical.url);assert.equal(contact.owner_id,seller.id);
  await assert.rejects(query("update qori_demo_sessions set local_date='2026-11-30' where id=$1",[list[0].id]),/check constraint/);
  time=new Date('2028-05-01T15:00:00Z');const later=(await s.landing(token)).sessions;assert.ok(later.length);assert.ok(later.every(x=>new Date(x.starts_at)>time));assert.ok(later.every(x=>new Date(x.starts_at)<=new Date(time.getTime()+15*86400000)));assert.equal((await s.config()).settings.end_date,null);
  time=new Date('2027-01-04T15:00:00Z');
 });

 await t.test('15-day migration preserves existing bookings and settings; server rejects outside window and rolls daily',async()=>{
  const fs=require('node:fs'),file='20261124173537_qori_demo_fifteen_day_booking_window.sql',sql=fs.readFileSync('database/migrations/'+file,'utf8');
  assert.equal(sql,fs.readFileSync('supabase/migrations/'+file,'utf8'));assert.equal(policy.DEFAULTS.horizon_days,15);
  await s.saveConfig(admin,{settings:{...policy.DEFAULTS,horizon_days:60,email_enabled:true},enabled:true,accept_proposals:true});
  const far=(await s.landing(invite)).sessions.find(x=>new Date(x.starts_at)>new Date(time.getTime()+16*86400000));assert.ok(far);const existing=await s.reserve(body(far));
  const before=await s.config(),count=(await query('select count(*) n from qori_demo_bookings')).rows[0].n;
  await s.tx(db=>db.query(sql));const after=await s.config();assert.deepEqual(after.settings,{...before.settings,horizon_days:15});assert.equal(after.enabled,before.enabled);assert.equal(after.approved,before.approved);
  assert.equal((await query('select count(*) n from qori_demo_bookings')).rows[0].n,count);assert.equal((await s.manage(existing.token)).session.id,far.id);
  const landing=await s.landing(invite);assert.equal(landing.booking_window.days,15);assert.equal(landing.booking_window.until,new Date(time.getTime()+15*86400000).toISOString());assert.ok(landing.sessions.every(x=>new Date(x.starts_at)<=new Date(landing.booking_window.until)));
  const result=await api('/reserve',body(far));assert.equal(result.status,400);assert.equal(result.data.token,undefined);
  const boundary={...slots[0],starts_at:new Date(time.getTime()+15*86400000),status:'ENABLED',confirmed_template:true,meet_url:'https://meet.google.com/apc-mdfv-pjz',capacity:8};assert.equal(policy.available(boundary,after,time,0),true);assert.equal(policy.available({...boundary,starts_at:new Date(new Date(boundary.starts_at).getTime()+1)},after,time,0),false);
  time=new Date(time.getTime()+86400000);const tomorrow=await s.landing(invite);assert.equal(tomorrow.booking_window.until,new Date(time.getTime()+15*86400000).toISOString());assert.ok(tomorrow.sessions.every(x=>new Date(x.starts_at)>time));
  time=new Date('2027-01-04T15:00:00Z');
 });

});

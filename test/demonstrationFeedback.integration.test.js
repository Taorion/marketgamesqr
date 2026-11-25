'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('fs'),{JSDOM}=require('jsdom'),jwt=require('jsonwebtoken');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_demonstrations_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='demonstrations-local-tests';process.env.PUBLIC_APP_URL='http://127.0.0.1:4877';process.env.QORI_DEMO_EMAIL_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{createService,policy}=require('../backend/src/services/demonstrationService');
let now=new Date('2027-03-01T15:00:00Z');const s=createService({now:()=>new Date(now),mailOperational:()=>false,deliver:()=>{throw Error('No real delivery in QA');}});
require('../backend/src/services/demonstrationRuntime').service=s;
const key=()=>crypto.randomBytes(32).toString('base64url'),id=()=>crypto.randomUUID();
let server,base,seller,other,admin,host,session,secondSession,formToken,invite;
const fixtures={};const doms=[];
async function user(role='QORI_SELLER'){
 if(role==='QORI_SUPERADMIN')return (await query("select * from app_users where email='cbotero@gosqori.com'")).rows[0];
 const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,'qa','Feedback QA',$2) returning *",[id()+'@example.test',role])).rows[0];
 if(role==='QORI_SELLER')await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1','APPROVED','DOCUMENTS')",[u.id,id()]);return u;
}
async function reserve(name,owner=seller,legacy=false,slot=session){const invitation=new URL((await s.invite(owner,{})).url).searchParams.get('i');const data={invitation,session_id:slot.id,request_key:key(),name:'Cliente '+name,business_name:'Negocio '+name,email:id()+'@example.test',privacy_accepted:true,...(!legacy?{document_id:String(crypto.randomInt(10000000,99999999))}:{})};const result=await s.reserve(data);return {...data,...result,document_id:data.document_id||String(crypto.randomInt(10000000,99999999))};}
const response=(b,over={})=>({document_id:b.document_id,email:b.email,interests:['FOLLOWUP','SALES'],findings:'Descubrí cómo continuar una conversación con un cliente.',application:'Organizar las cotizaciones de mi negocio.',questions:'¿Cómo empiezo?',next_step:'CONTACT_ME',attended:true,consent:true,...over});
async function http(url,body,user){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+jwt.sign({sub:user.id,password_version:user.password_version||0},process.env.JWT_SECRET)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function until(fn){for(let i=0;i<160;i++){if(fn())return;await new Promise(r=>setTimeout(r,15));}throw Error('UI timeout');}
function dom(html,url){const d=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});doms.push(d);d.window.fetch=(p,o)=>fetch(new URL(p,base),o);d.window.HTMLElement.prototype.scrollIntoView=function(){};d.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};d.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new d.window.Event('close'));};return d;}
after(async()=>{doms.forEach(d=>d.window.close());if(server)await new Promise(r=>server.close(r));await pool.end();});
test('closing feedback: document capture, attendance evidence and ownership enforced by server',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_demonstrations_qa');
 seller=await user();other=await user();host=await user();admin=await user('QORI_SUPERADMIN');
 await s.saveConfig(admin,{settings:{...policy.DEFAULTS,capacity:30,attendance_owner:'HOST',host_ids:[host.id]},enabled:true,accept_proposals:true});
 const sessions=(await s.workspace(admin)).sessions.filter(x=>new Date(x.starts_at)>now&&x.status==='ENABLED');session=sessions[0];secondSession=sessions[1];
 for(const name of ['one','manual','pending','ui','cancelled','moved'])fixtures[name]=await reserve(name);
 fixtures.other=await reserve('other',other);fixtures.legacy=await reserve('legacy',seller,true);fixtures.second=await reserve('second',seller,false,secondSession);
 const uiToken=new URL((await s.invite(seller,{})).url).searchParams.get('i');invite=uiToken;
 server=require('../backend/src/app').app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 await t.test('only Admin or assigned hosts can open; cannot open before session starts',async()=>{
  await assert.rejects(s.feedbackForm(seller,session.id,{action:'OPEN'}),e=>e.status===403);
  await assert.rejects(s.feedbackForm(admin,session.id,{action:'OPEN'}),e=>e.status===400);
  await s.change(fixtures.cancelled.token,{action:'CANCEL'});await s.change(fixtures.moved.token,{action:'MOVE',session_id:secondSession.id});
  now=new Date(new Date(session.ends_at).getTime()-60000);
  const forms=await Promise.all([s.feedbackForm(admin,session.id,{action:'OPEN'}),s.feedbackForm(host,session.id,{action:'OPEN'})]);assert.equal(forms[0].url,forms[1].url);formToken=new URLSearchParams(new URL(forms[0].url).hash.slice(1)).get('formulario');
 });
 await t.test('public form metadata never discloses people, document numbers, owner IDs or answers',async()=>{
  const data=await s.feedbackLanding(formToken);assert.deepEqual(Object.keys(data).sort(),['title','starts_at','ends_at','expires_at','zone'].sort());
  const workspace=await s.workspace(other);assert.ok(!JSON.stringify(workspace).includes(formToken));assert.ok(!workspace.bookings.some(b=>b.id===fixtures.one.id));
 });
 await t.test('wrong document, email, session, cancelled and moved bookings cannot mark attendance',async()=>{
  for(const body of [response(fixtures.one,{document_id:'9999'}),response(fixtures.one,{email:fixtures.other.email}),response(fixtures.second),response(fixtures.cancelled),response(fixtures.moved)])await assert.rejects(s.submitFeedback(formToken,body),e=>e.status===400);
 });
 await t.test('required consent, answers and strict payload reject forged owners before writes',async()=>{
  for(const body of [response(fixtures.one,{consent:false}),response(fixtures.one,{attended:false}),response(fixtures.one,{interests:[]}),response(fixtures.one,{findings:' '}),response(fixtures.one,{seller_id:other.id}),response(fixtures.one,{booking_id:fixtures.other.id})])await assert.rejects(s.submitFeedback(formToken,body),e=>e.status===400);
  assert.equal((await query('select count(*)::int n from qori_demo_feedback where booking_id=$1',[fixtures.one.id])).rows[0].n,0);
 });
 await t.test('concurrent duplicate responses create one immutable answer and attendance record',async()=>{
  const results=await Promise.all([1,2,3].map(()=>s.submitFeedback(formToken,response(fixtures.one))));assert.ok(results.every(r=>r.ok));assert.equal(Object.keys(results[0]).join(','),'ok,message');
  assert.equal((await query('select count(*)::int n from qori_demo_feedback where booking_id=$1',[fixtures.one.id])).rows[0].n,1);
  const v=(await query('select * from qori_demo_visits where booking_id=$1 and active',[fixtures.one.id])).rows[0];assert.equal(v.attendance,'ATTENDED');assert.equal(v.attendance_source,'FORM');assert.equal(v.recorded_by,null);
  await s.submitFeedback(formToken,response(fixtures.one,{findings:'Esto no debe reemplazar mi primera respuesta.'}));assert.equal((await s.feedbackAnswers(seller,fixtures.one.id)).responses[0].answers.findings,response(fixtures.one).findings);
  assert.equal((await query("select count(*)::int n from qori_demo_events where booking_id=$1 and action='FEEDBACK_SUBMITTED'",[fixtures.one.id])).rows[0].n,1);
 });
 await t.test('each ambassador can read only owned answers; host privileges do not grant CRM access',async()=>{
  assert.equal((await s.feedbackAnswers(seller,fixtures.one.id)).responses.length,1);assert.equal((await s.feedbackAnswers(admin,fixtures.one.id)).responses.length,1);
  for(const u of [other,host])await assert.rejects(s.feedbackAnswers(u,fixtures.one.id),e=>e.status===403);
  const w=await s.workspace(other);assert.ok(!w.feedback.some(f=>f.booking_id===fixtures.one.id));assert.ok(!w.visits.some(v=>v.booking_id===fixtures.one.id));assert.ok(!w.events.some(v=>v.booking_id===fixtures.one.id));
 });
 await t.test('HTTP blocks anonymous access and guessed booking IDs from other sellers',async()=>{
  const route='/api/seller/demonstrations/bookings/'+fixtures.one.id+'/feedback';assert.equal((await http(route)).status,401);assert.equal((await http(route,null,other)).status,403);assert.equal((await http(route,null,seller)).status,200);
  assert.equal((await http('/api/seller/demonstrations/sessions/'+session.id+'/feedback-form',{action:'OPEN'},seller)).status,403);
 });
 await t.test('current CRM ownership controls historical answers after reassignment',async()=>{
  const b=await s.booking({query},fixtures.one.id);await query('update qori_sales_prospects set seller_id=$2 where id=$1',[b.prospect_id,other.id]);
  await assert.rejects(s.feedbackAnswers(seller,b.id),e=>e.status===403);assert.equal((await s.feedbackAnswers(other,b.id)).responses.length,1);assert.ok(!(await s.workspace(seller)).feedback.some(f=>f.booking_id===b.id));
  await query('update qori_sales_prospects set seller_id=$2 where id=$1',[b.prospect_id,seller.id]);
 });
 await t.test('older bookings without document require their own private reservation access',async()=>{
  await assert.rejects(s.submitFeedback(formToken,response(fixtures.legacy)),e=>e.status===400);
  await assert.rejects(s.submitFeedback(formToken,response(fixtures.legacy,{reservation_access:fixtures.other.token})),e=>e.status===400);
  await s.submitFeedback(formToken,response(fixtures.legacy,{reservation_access:fixtures.legacy.token}));assert.equal((await s.booking({query},fixtures.legacy.id)).document_id,fixtures.legacy.document_id);
 });
 await t.test('form records evidence but preserves an explicit staff absence correction',async()=>{
  const v=(await query('select id from qori_demo_visits where booking_id=$1 and active',[fixtures.manual.id])).rows[0];await s.attendance(admin,v.id,{attendance:'ABSENT',reason:'Confirmación manual de ausencia para QA.'});
  await s.submitFeedback(formToken,response(fixtures.manual));const result=(await s.feedbackAnswers(seller,fixtures.manual.id)).responses[0];assert.equal(result.attendance,'ABSENT');assert.equal(result.attendance_source,'STAFF');
 });
 await t.test('non-response remains pending and declining contact closes followup',async()=>{
  assert.equal((await query('select attendance from qori_demo_visits where booking_id=$1 and active',[fixtures.pending.id])).rows[0].attendance,'PENDING');
  await s.submitFeedback(formToken,response(fixtures.other,{next_step:'NO_CONTACT'}));const b=await s.booking({query},fixtures.other.id);assert.equal(b.contact_stopped,true);assert.equal(b.followup_status,'CLOSED');
 });
 await t.test('public UI preserves answers after network failure and submits to the real local server',async()=>{
  const d=dom(fs.readFileSync('demostraciones/cierre.html','utf8'),base+'/demostraciones/cierre.html#formulario='+formToken),w=d.window;w.eval(fs.readFileSync('demostraciones/feedback.js','utf8'));await until(()=>w.document.querySelector('#feedbackForm'));
  const f=w.document.querySelector('form');f.elements.document_id.value=fixtures.ui.document_id;f.elements.email.value=fixtures.ui.email;f.querySelector('[value=FOLLOWUP]').checked=true;f.elements.findings.value='<script>NO_EJECUTAR</script> Aprendí a organizar el seguimiento.';f.elements.application.value='Aplicarlo en mi tienda.';f.elements.next_step.value='CONTACT_ME';f.elements.attended.checked=true;f.elements.consent.checked=true;assert.equal(f.checkValidity(),true);
  const fetchReal=w.fetch;let fail=true;w.fetch=(p,o)=>{if(o.method==='POST'&&fail){fail=false;throw TypeError('Failed to fetch');}return fetchReal(p,o);};
  f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>f.querySelector('[role=status]').textContent.includes('Conservamos tus datos'));assert.match(f.elements.findings.value,/NO_EJECUTAR/);
  f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.body.textContent.includes('Respuesta registrada'));assert.equal((await s.feedbackAnswers(seller,fixtures.ui.id)).responses.length,1);
 });
 await t.test('Seller UI shows owned responses safely as text and no form-opening controls',async()=>{
  const d=dom('<main id="workspace"></main>',base+'/seller/'),w=d.window;w.eval(fs.readFileSync('demostraciones/workspace.js','utf8'));
  const request=async(p,body)=>{const r=await http(p,body,seller);if(r.status!==200)throw Error(r.data.error.message);return r.data;};await w.QoriDemonstrations.render(w.document.querySelector('main'),{request});
  assert.equal(w.document.querySelector('[data-action=feedback-form]'),null);assert.equal(w.document.querySelector('[data-action=feedback-answers][data-id="'+fixtures.other.id+'"]'),null);
  w.document.querySelector('[data-action=feedback-answers][data-id="'+fixtures.ui.id+'"]').click();await until(()=>w.document.querySelector('dialog'));assert.match(w.document.querySelector('dialog').textContent,/NO_EJECUTAR/);assert.equal(w.document.querySelector('dialog script'),null);assert.match(w.document.querySelector('dialog').textContent,/Confirmada por formulario/);
 });
 await t.test('Admin UI opens the session closing QR and can explicitly close reception',async()=>{
  const d=dom('<main></main>',base+'/admin/'),w=d.window;w.eval(fs.readFileSync('demostraciones/workspace.js','utf8'));const request=async(p,body)=>{const r=await http(p,body,admin);if(r.status!==200)throw Error(r.data.error.message);return r.data;};await w.QoriDemonstrations.render(w.document.querySelector('main'),{request});
  w.document.querySelector('[data-action=feedback-form][data-id="'+session.id+'"]').click();await until(()=>w.document.querySelector('[data-feedback-url]'));assert.match(w.document.querySelector('[data-feedback-url]').value,/cierre.html#formulario=/);assert.ok(w.document.querySelector('dialog .demo-qr'));
  w.document.querySelector('[data-close-feedback]').click();await until(()=>w.document.body.textContent.includes('Recepción de respuestas cerrada'));await assert.rejects(s.feedbackLanding(formToken),e=>e.status===404);
 });
 await t.test('reopening rotates the shared token; closed, expired and cancelled sessions cannot receive answers',async()=>{
  const opened=await s.feedbackForm(admin,session.id,{action:'OPEN'}),newToken=new URLSearchParams(new URL(opened.url).hash.slice(1)).get('formulario');assert.notEqual(newToken,formToken);await assert.rejects(s.submitFeedback(formToken,response(fixtures.pending)),e=>e.status===404);
  const before=now;now=new Date(now.getTime()+25*3600000);await assert.rejects(s.submitFeedback(newToken,response(fixtures.pending)),e=>e.status===404);now=before;
  await query("update qori_demo_sessions set status='CANCELLED' where id=$1",[session.id]);await assert.rejects(s.submitFeedback(newToken,response(fixtures.pending)),e=>e.status===404);
 });
 await t.test('new tables are private with RLS and no direct anonymous or authenticated grants',async()=>{
  const tables=(await query("select relname,relrowsecurity from pg_class where relname in('qori_demo_feedback','qori_demo_feedback_forms')")).rows;assert.equal(tables.length,2);assert.ok(tables.every(t=>t.relrowsecurity));
  assert.equal((await query("select 1 from information_schema.role_table_grants where table_name in('qori_demo_feedback','qori_demo_feedback_forms') and grantee in('PUBLIC','anon','authenticated')")).rowCount,0);
 });
});

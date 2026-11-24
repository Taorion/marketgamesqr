'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('fs'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_demonstrations_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='demonstrations-local-tests';process.env.PUBLIC_APP_URL='http://127.0.0.1:4877';process.env.QORI_DEMO_EMAIL_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{createService}=require('../backend/src/services/demonstrationService');
const s=createService({now:()=>new Date('2027-01-04T15:00:00Z'),mailOperational:()=>false});require('../backend/src/services/demonstrationRuntime').service=s;
let server,base,seller,admin;const doms=[];
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,15));}throw Error('UI condition timed out');}
function dom(){const d=new JSDOM('<!doctype html><main id="demoPublic" class="q-demo"></main>',{url:base+'/demostraciones/',runScripts:'outside-only',pretendToBeVisual:true});doms.push(d);d.window.HTMLElement.prototype.scrollIntoView=function(){};d.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};d.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new d.window.Event('close'));};d.window.fetch=(path,opts)=>fetch(new URL(path,base),opts);return d;}
const source=path=>fs.readFileSync(path,'utf8');
after(async()=>{for(const d of doms)d.window.close();if(server)await new Promise(r=>server.close(r));await pool.end();});
test('Public and staff UI use real local API: booking, confirmation, move, CRM and admin settings',async t=>{
 assert.equal((await query('select current_database() db')).rows[0].db,'qori_demonstrations_qa');
 seller=(await query("select u.* from app_users u join qori_seller_applications a on a.user_id=u.id where a.status='APPROVED' and u.role='QORI_SELLER' order by u.created_at desc limit 1")).rows[0];admin=(await query("select * from app_users where email='cbotero@gosqori.com'")).rows[0];
 server=require('../backend/src/app').app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const inv=await s.invite(seller,{}),token=new URL(inv.url).searchParams.get('i'),d=dom(),w=d.window;d.reconfigure({url:base+'/demostraciones/?i='+token});w.eval(source('demostraciones/public.js'));
 let reservation;
 await t.test('form remains anonymous and shows full Colombia schedule',async()=>{await until(()=>w.document.querySelector('#reservationForm'));assert.ok(w.document.querySelector('#selectedSchedule').textContent.includes('Colombia'));assert.equal(w.document.querySelector('[name=password]'),null);});
 await t.test('a failed request preserves input, then retry confirms Meet and signed subscription',async()=>{
  const f=w.document.querySelector('#reservationForm');f.elements.name.value='UI Prospect';f.elements.business_name.value='UI Business';f.elements.email.value=crypto.randomUUID()+'@example.test';f.elements.privacy_accepted.checked=true;
  const real=w.fetch;let fail=true;w.fetch=(p,o)=>{if(String(p).endsWith('/reserve')&&fail){fail=false;return Promise.resolve({ok:false,json:async()=>({error:{message:'Error simulado; intenta nuevamente.'}})});}return real(p,o);};
  f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>f.querySelector('[role=status]').textContent.includes('Error simulado'));assert.equal(f.elements.name.value,'UI Prospect');
  f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.querySelector('#managementLink'));assert.ok(w.document.body.textContent.includes('Reserva confirmada'));assert.ok(w.document.querySelector('a[href*="meet.google.com"]'));assert.ok(w.document.querySelector('a[href*="prospect_ref="]'));assert.ok(w.document.body.textContent.includes('no están operativos'));
  reservation=new URL(w.document.querySelector('#managementLink').value).hash.slice(9);
 });
 await t.test('reprogramming changes session without losing prospect or ambassador',async()=>{
  const before=await s.manage(reservation),f=w.document.querySelector('#move');assert.ok(f.elements.session_id.options.length);const target=f.elements.session_id.value;f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.document.querySelector('#move')!==f);const after=await s.manage(reservation);assert.equal(after.session.id,target);assert.equal(after.id,before.id);assert.equal(new URL(after.subscription.url).searchParams.get('advisor'),seller.id);
 });
 await t.test('staff agenda shows this prospect and opens canonical CRM; QR uses personal invitation',async()=>{
  const staff=dom(),sw=staff.window;sw.eval(source('demostraciones/workspace.js'));const host=sw.document.querySelector('main');let opened;
  const jwt=require('jsonwebtoken').sign({sub:seller.id,password_version:seller.password_version||0},process.env.JWT_SECRET);
  const request=async(p,b)=>{const r=await fetch(base+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},...(b?{body:JSON.stringify(b)}:{})});const result=await r.json();if(!r.ok)throw Error(result.error?.message);return result;};
  await sw.QoriDemonstrations.render(host,{request,openCrm:id=>opened=id});assert.ok(host.textContent.includes('UI Business'),host.textContent);const b=host.querySelector('[data-action=crm]');b.click();await until(()=>opened);assert.ok(opened.includes('@example.test'));
  host.querySelector('[data-action=invite]').click();await until(()=>host.querySelector('dialog img'));assert.ok(host.querySelector('dialog input').value.includes('/demostraciones/?i='));assert.ok(host.querySelector('dialog a[download]'));
 });
 await t.test('admin interface loads pending templates and saves only with explicit checkbox',async()=>{
  const staff=dom(),sw=staff.window;sw.eval(source('demostraciones/workspace.js'));const host=sw.document.querySelector('main'),jwt=require('jsonwebtoken').sign({sub:admin.id,password_version:admin.password_version||0},process.env.JWT_SECRET);
  const request=async(p,b)=>{const r=await fetch(base+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt},...(b?{body:JSON.stringify(b)}:{})});const result=await r.json();if(!r.ok)throw Error(result.error?.message);return result;};
  await sw.QoriDemonstrations.render(host,{request});const f=host.querySelector('#demoConfig');assert.ok(f);assert.equal(f.elements.accept_proposals.checked,false);assert.ok(host.textContent.includes('Miércoles y jueves a las 10:00'));f.dispatchEvent(new sw.Event('submit',{bubbles:true,cancelable:true}));await until(()=>f.querySelector('[role=status]').textContent);assert.ok(host.contains(f));
  f.elements.accept_proposals.checked=true;f.dispatchEvent(new sw.Event('submit',{bubbles:true,cancelable:true}));await until(()=>host.querySelector('#demoConfig')!==f);assert.ok(host.textContent.includes('Configuración guardada expresamente'));
 });
 await t.test('real Seller navigation renders Demonstrations and CRM invite actions',async()=>{
  const jwt=require('jsonwebtoken').sign({sub:seller.id,password_version:seller.password_version||0},process.env.JWT_SECRET);
  const page=await JSDOM.fromURL(base+'/seller/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){w.fetch=(p,o)=>fetch(new URL(p,base),o);w.sessionStorage.setItem('qori-seller-token',jwt);w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.remove();};}});doms.push(page);
  await until(()=>page.window.document.querySelector('[data-view=demonstrations]'));page.window.document.querySelector('[data-view=demonstrations]').click();await until(()=>page.window.document.querySelector('#demoBookings'));assert.ok(page.window.document.querySelector('#demoBookings').textContent.includes('UI Business'));
  page.window.document.querySelector('[data-view=crm]').click();await until(()=>page.window.document.querySelector('[data-demo-prospect]'));assert.ok(page.window.document.querySelector('[data-demo-prospect]').textContent.includes('Invitar'));
 });
 await t.test('existing Admin navigation opens the integrated module',async()=>{
  const jwt=require('jsonwebtoken').sign({sub:admin.id,password_version:admin.password_version||0},process.env.JWT_SECRET);
  const page=await JSDOM.fromURL(base+'/admin/',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){w.fetch=(p,o)=>fetch(new URL(p,base),o);w.localStorage.setItem('market_games_admin_app_version','admin-exclusive-20261113');w.localStorage.setItem('market_games_admin_session_v1',JSON.stringify({token:jwt,user:{...admin,admin_access:true}}));w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.remove();};}});doms.push(page);
  await until(()=>page.window.document.querySelector('[data-action=tab][data-id=demonstrations]'));page.window.document.querySelector('[data-action=tab][data-id=demonstrations]').click();await until(()=>page.window.document.querySelector('#demoConfig'));assert.ok(page.window.document.querySelector('#commercialContent').textContent.includes('Franjas y Meet'));
 });
});

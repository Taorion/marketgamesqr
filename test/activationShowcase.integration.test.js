const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),jwt=require('jsonwebtoken'),{JSDOM}=require('jsdom');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='activation-showcase-qa';process.env.PUBLIC_APP_URL='http://127.0.0.1:3141';
const {query,pool}=require('../backend/src/config/db'),svc=require('../backend/src/services/activationShowcaseService'),catalog=require('../backend/src/services/smartCatalogService'),games=require('../backend/src/services/interactiveActivationService'),{app}=require('../backend/src/app');
let server,base;const id=()=>crypto.randomUUID();
before(async()=>{assert.equal((await query('select current_database() db')).rows[0].db,'qori_customer_qa');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server?.closeAllConnections();if(server)await new Promise(r=>server.close(r));await pool.end();});
async function fixture(){
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status) values('Juegos QA',$1,'GLOBAL','ACTIVE') returning *",['games-'+id()])).rows[0];
 const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'qa','QA','BUSINESS_OWNER') returning *",[b.id,id()+'@example.invalid'])).rows[0];
 const create=async body=>(await games.createInteractiveActivation(b.id,u,{capture_config:{collect_participant_data:false},...body})).activation;
 const a=await create({title:'Cumbre del café',activation_type:'QORI_SUMMIT',game_config:{floors:8,duration_seconds:45},reward_config:{reward_type:'FREE_GIFT',reward_label:'Un café gratis'},terms:'Redime en la tienda.'});
 const a2=await create({title:'Culebrita de descuentos',activation_type:'SNAKE',reward_mode:'by_score',game_config:{duration_seconds:45},score_rewards:[{min_score:10,max_score:49,reward_type:'PERCENT_DISCOUNT',reward_label:'10% de descuento',reward_value:{percent:10}},{min_score:50,reward_type:'FREE_GIFT',reward_label:'Un postre gratis',reward_value:{label:'Postre'}}]});
 const c=await catalog.createCatalog(b.id,u,{title:'Juega y gana',status:'ACTIVE',whatsapp_number:'00000000',metadata:{redemption_mode:'ACTIVATIONS',activation_ids:[a.id,a2.id]}});
 return {b,u,a,a2,c};
}
const auth=f=>'Bearer '+jwt.sign({sub:f.u.id,session_version:require('../backend/src/config/env').env.appSessionVersion},process.env.JWT_SECRET);
test('public directory shows selected games, canonical benefits and play links without private configs',async()=>{
 const f=await fixture(),other=await fixture(),r=await svc.activations(f.c.slug);assert.deepEqual(r.activations.map(a=>a.id),[f.a.id,f.a2.id]);
 assert.equal(r.activations[0].benefits[0].label,'Un café gratis');assert.equal(r.activations[1].benefits[0].condition,'10 a 49 puntos');assert.equal(r.activations[1].benefits[1].condition,'50 o más puntos');
 assert.equal(r.activations[0].play_url,'/activacion/'+f.a.public_slug);assert.match(r.activations[0].goal,/primero/);
 for(const value of [other.a.id,'game_session_token','reward_value','capture_config','scoring_rules'])assert.equal(JSON.stringify(r).includes(value),false);
 const landing=await fetch(base+r.activations[0].play_url);assert.equal(landing.status,200);
});
test('cannot publish foreign, malformed, repeated, archived or empty selections',async()=>{
 const f=await fixture(),other=await fixture();for(const ids of [[other.a.id],['bad'],[f.a.id,f.a.id],[]])await assert.rejects(()=>catalog.updateCatalog(f.b.id,f.c.id,{metadata:{redemption_mode:'ACTIVATIONS',activation_ids:ids}}));
 await query("update interactive_activations set status='archived' where id=$1",[f.a.id]);await assert.rejects(()=>catalog.updateCatalog(f.b.id,f.c.id,{metadata:{redemption_mode:'ACTIVATIONS',activation_ids:[f.a.id]}}));
 assert.equal((await catalog.catalogDetail(f.b.id,f.c.id)).catalog.metadata.activation_ids.length,2);
});
test('paused, closed, scheduled and expired games disappear, even if stale metadata contains another tenant',async()=>{
 const f=await fixture(),other=await fixture();await query('update smart_catalogs set metadata=$2 where id=$1',[f.c.id,{redemption_mode:'ACTIVATIONS',activation_ids:[f.a.id,f.a2.id,other.a.id]}]);
 for(const state of ['paused','closed','archived']){await query('update interactive_activations set status=$2 where id=$1',[f.a.id,state]);assert.equal((await svc.activations(f.c.slug)).activations.length,1);}
 await query("update interactive_activations set status='active',starts_at=now()+interval '1 day' where id=$1",[f.a.id]);assert.equal((await svc.activations(f.c.slug)).activations.length,1);
 await query("update interactive_activations set starts_at=null,ends_at=now()-interval '1 day' where id=$1",[f.a.id]);assert.equal((await svc.activations(f.c.slug)).activations.length,1);
 await query("update interactive_activations set ends_at=now()-interval '1 day' where id=$1",[f.a2.id]);assert.equal((await svc.activations(f.c.slug)).activations.length,0);
});
test('catalog visibility and current plan apply to the activation directory',async()=>{
 const f=await fixture();await query("update smart_catalogs set status='DRAFT' where id=$1",[f.c.id]);await assert.rejects(()=>svc.activations(f.c.slug));
 await query("update smart_catalogs set status='ACTIVE' where id=$1",[f.c.id]);await query('update businesses set is_active=false where id=$1',[f.b.id]);await assert.rejects(()=>svc.activations(f.c.slug));
 await query("update businesses set is_active=true,plan_code='FREE_PERSONAL_GIFT' where id=$1",[f.b.id]);await assert.rejects(()=>svc.activations(f.c.slug));await assert.rejects(()=>catalog.updateCatalog(f.b.id,f.c.id,{description:'Cambio'}));
});
test('HTTP saves the selected games, QR access consumes nothing and orders are unavailable',async()=>{
 const f=await fixture(),other=await fixture();await query('insert into business_qr_credit_accounts(business_id,qr_balance) values($1,8)',[f.b.id]);
 const update='/api/business/catalogs/'+f.c.id,body={metadata:{redemption_mode:'ACTIVATIONS',activation_ids:[f.a2.id,f.a.id]}};
 assert.equal((await fetch(base+update,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:auth(other)},body:JSON.stringify(body)})).status,404);
 assert.equal((await fetch(base+update,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:auth(f)},body:JSON.stringify(body)})).status,200);
 const response=await fetch(base+'/api/public/catalogs/'+f.c.slug+'/activations');assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.json()).activations[0].id,f.a2.id);
 const qr=await(await fetch(base+'/api/public/catalogs/'+f.c.slug+'/access-qr')).json();assert.equal(qr.credits_consumed,0);assert.match(qr.url,new RegExp('/c/'+f.c.slug+'$'));
 await assert.rejects(()=>catalog.createWhatsappIntent(f.c.slug,null,{}),/activación/);assert.equal((await require('../backend/src/services/catalogOrderService').publicConfig(f.c.slug)).enabled,false);
 assert.equal((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[f.b.id])).rows[0].qr_balance,8);assert.equal((await query('select count(*)::int n from interactive_activation_participants where activation_id=$1',[f.a.id])).rows[0].n,0);
});
test('choice benefits exclude losing slots and reveal no winning indices, odds or redemption secrets',()=>{
 const benefits=svc.benefitsFor({reward_mode:'by_choice',reward_config:{choices:[{label:'Nada',is_winner:false},{label:'No entrega',delivery_mode:'none'},{reward_label:'Premio',value:'secret-slot',weight:90,reward_value:{ecommerce_code:'secret-code'}},{reward_label:'Premio',value:'other'}]}});
 assert.deepEqual(benefits,[{label:'Premio',condition:null,terms:null}]);
});
test('public cards render safe text, rewards, search and direct play links without checkout',async()=>{
 const f=await fixture();await query('update interactive_activations set title=$2 where id=$1',[f.a.id,'<img src=x onerror=alert(1)>']);
 const d=new JSDOM(fs.readFileSync('smart-catalog/index.html','utf8'),{url:base+'/c/'+f.c.slug,runScripts:'outside-only'});
 try{d.window.fetch=(p,o)=>fetch(new URL(p,base),o);d.window.eval(fs.readFileSync('smart-catalog/activations.js','utf8'));await d.window.QoriActivationShowcase.init(f.c);
  assert.equal(d.window.document.querySelectorAll('.qa-game-card').length,2);assert.equal(d.window.document.querySelector('.qa-game-card img'),null);assert.match(d.window.document.querySelector('.qa-benefits').textContent,/café/);
  const search=d.window.document.querySelector('.qs-search input');search.value='postre';search.dispatchEvent(new d.window.Event('input'));assert.equal(d.window.document.querySelectorAll('.qa-game-card').length,1);assert.match(d.window.document.querySelector('.qs-button').href,new RegExp(f.a2.public_slug));assert.equal(d.window.document.querySelector('#floatingWhatsappButton').hidden,true);
 }finally{d.window.close();}
});
test('business picker edits activations and preserves selections when switching directory modes',async()=>{
 const f=await fixture(),d=new JSDOM('<form id="smartCatalogForm"><label><select name="redemption_mode"><option>COMMERCE</option><option>STAMP_PROGRAMS</option><option>ACTIVATIONS</option></select></label><label><input name="whatsapp_number" required></label><label><input name="default_cta_label"></label></form>',{runScripts:'outside-only'}),w=d.window;
 try{w.authHeaders=()=>({Authorization:auth(f)});w.api=async p=>p.includes('stamp-cards')?{programs:[]}:(await fetch(base+p,{headers:w.authHeaders()})).json();w.eval(fs.readFileSync('empresa/js/catalog-showcases.js','utf8'));const form=w.document.querySelector('form');form.elements.redemption_mode.value='ACTIVATIONS';await w.QoriCatalogShowcases.setupForm(f.c);
  assert.deepEqual(Array.from(w.QoriCatalogShowcases.formMetadata().activation_ids),[f.a2.id,f.a.id]);assert.equal(form.elements.whatsapp_number.required,false);
  form.elements.redemption_mode.value='STAMP_PROGRAMS';form.elements.redemption_mode.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,20));form.elements.redemption_mode.value='ACTIVATIONS';form.elements.redemption_mode.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,80));assert.equal(w.QoriCatalogShowcases.formMetadata().activation_ids.length,2);
 }finally{w.close();}
});

const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),bcrypt=require('bcryptjs');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='exclusive-admin-isolated-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),{VERSION}=require('../backend/src/services/qoriSellerPolicy');
let server,base,camilo,sandra,seller,other,legacy,pretender,pending;const password='Local-Only-QA-Password!2026';
const token=u=>jwt.sign({sub:u.id,password_version:u.password_version||0,role:'QORI_SUPERADMIN',email:'cbotero@gosqori.com'},process.env.JWT_SECRET);
async function api(path,u,body,method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+token(u)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function account(role,approved=true){const u=(await query("insert into app_users(email,password_hash,full_name,role) values($1,$2,'Acceso aislado QA',$3) returning *",[crypto.randomUUID()+'@example.test',await bcrypt.hash(password,4),role])).rows[0];if(role==='QORI_SELLER'){await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status) values($1,$2,'3105550000','Bogotá','4610',$3,$4)",[u.id,crypto.randomUUID(),VERSION,approved?'APPROVED':'DRAFT']);await query('insert into qori_sales_profiles(user_id,created_by) values($1,$1)',[u.id]);}return u;}
before(async()=>{camilo=await require('./helpers/adminIdentity').admin(query);sandra=await require('./helpers/adminIdentity').admin(query,'scasallas@gosqori.com');for(const u of [camilo,sandra])await query('update app_users set password_hash=$2 where id=$1',[u.id,await bcrypt.hash(password,4)]);camilo=(await query('select * from app_users where id=$1',[camilo.id])).rows[0];sandra=(await query('select * from app_users where id=$1',[sandra.id])).rows[0];seller=await account('QORI_SELLER');other=await account('QORI_SELLER');pending=await account('QORI_SELLER',false);legacy=await account('ADMIN_MARKET_GAMES');pretender=await account('QORI_SUPERADMIN');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();});
test('only the two configured identities enter Admin; a role or forged JWT email cannot authorize it',async()=>{
 for(const u of [camilo,sandra]){const r=await api('/api/auth/admin/login',null,{email:u.email,password});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.user.admin_access,true);assert.equal((await api('/api/admin/session',u)).status,200);assert.equal((await api('/api/admin/accounts/bootstrap',u)).status,200);}
 for(const u of [seller,legacy,pretender]){const r=await api('/api/auth/admin/login',null,{email:u.email,password});assert.equal(r.status,403);assert.equal(r.data.token,undefined);for(const path of ['/api/admin/session','/api/admin/accounts/bootstrap','/api/admin/commercial/bootstrap','/api/admin/commercial/prospects','/api/admin/users','/api/seller/admin/queue'])assert.equal((await api(path,u)).status,403,path);}
 const ordinary=await api('/api/auth/login',null,{email:seller.email,password});assert.equal(ordinary.status,200);assert.equal(ordinary.data.user.admin_access,false);assert.equal((await api('/api/seller/dashboard',seller)).status,200);
});
test('Seller CRM keeps its own records without any Admin route or team privilege',async()=>{
 const create=async(u,label)=>api('/api/seller/commercial/prospects',u,{business_name:'Negocio '+label,contact_name:'Contacto QA',email:crypto.randomUUID()+'@example.test',phone:'3105550000',notes:'Conversación autorizada'});
 const own=await create(seller,'propio'),foreign=await create(other,'otro');assert.equal(own.status,200,JSON.stringify(own.data));assert.equal(foreign.status,200);const id=own.data.prospect.id;
 const list=await api('/api/seller/commercial/prospects',seller);assert.equal(list.status,200);assert.ok(list.data.rows.some(p=>p.id===id));assert.ok(list.data.rows.every(p=>p.seller_id===seller.id));
 assert.equal((await api('/api/seller/commercial/prospects?seller_id='+other.id,seller)).status,403);
 const update={business_name:'Negocio editado',contact_name:'Contacto QA',email:own.data.prospect.email,stage:'CONTACTED',notes:'Nuevo seguimiento',next_contact_at:'2026-12-01T15:00:00.000Z'};
 assert.equal((await api('/api/seller/commercial/prospects/'+id,seller,update,'PATCH')).status,200);
 assert.equal((await api('/api/seller/commercial/prospects/'+id,other,update,'PATCH')).status,403);
 assert.equal((await api('/api/seller/commercial/prospects/'+id+'/referral',other)).status,403);
 assert.equal((await api('/api/seller/commercial/prospects',pending)).status,403);
 for(const path of ['/api/admin/commercial/prospects','/api/admin/commercial/bootstrap'])assert.equal((await api(path,seller)).status,403);
});
test('old privileged sessions stop working immediately after the persisted identity changes',async()=>{
 const previous=camilo.email;await query('update app_users set email=$2 where id=$1',[camilo.id,crypto.randomUUID()+'@example.test']);try{assert.equal((await api('/api/admin/session',camilo)).status,403);}finally{await query('update app_users set email=$2 where id=$1',[camilo.id,previous]);}
 assert.equal((await api('/api/admin/session',camilo)).status,200);
 await query("update app_users set platform_role='QORI_SUPERADMIN' where id=$1",[other.id]);try{assert.equal((await api('/api/admin/session',other)).status,403);assert.equal((await api('/api/seller/admin/queue',other)).status,403);}finally{await query('update app_users set platform_role=null where id=$1',[other.id]);}
});
test('even an authorized administrator cannot grant Admin to another ambassador or create a legacy admin',async()=>{
 const r=await api('/api/admin/commercial/sellers/'+seller.id+'/access',camilo,{role:'QORI_SUPERADMIN',permissions:[],reason:'Prueba de restricción de identidad'},'PATCH');assert.equal(r.status,403,JSON.stringify(r.data));
 const persisted=(await query('select role,platform_role from app_users where id=$1',[seller.id])).rows[0];assert.equal(persisted.role,'QORI_SELLER');assert.equal(persisted.platform_role,null);
 const create=await api('/api/admin/users',camilo,{email:crypto.randomUUID()+'@example.test',full_name:'Admin no autorizado',password,role:'ADMIN_MARKET_GAMES'});assert.equal(create.status,403,JSON.stringify(create.data));
});
test('a cached forged Admin workspace is cleared before loading administrative data',async()=>{
 const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom'),calls=[];
 const dom=await JSDOM.fromURL(base+'/admin/',{resources:new class extends ResourceLoader{fetch(url,options){return url.startsWith(base)?super.fetch(url,options):null;}},runScripts:'dangerously',virtualConsole:new VirtualConsole(),beforeParse(w){w.fetch=(url,options)=>{calls.push(String(url));return fetch(new URL(url,base),options);};w.HTMLElement.prototype.scrollIntoView=function(){};w.localStorage.setItem('market_games_admin_app_version','admin-exclusive-20261113');w.localStorage.setItem('market_games_admin_session_v1',JSON.stringify({user:{...seller,role:'QORI_SUPERADMIN',admin_access:true},token:token(seller)}));}});
 try{for(let i=0;i<100;i++){if(calls.includes('/api/admin/session')&&!dom.window.localStorage.getItem('market_games_admin_session_v1'))break;await new Promise(r=>setTimeout(r,20));}assert.ok(calls.includes('/api/admin/session'));assert.equal(dom.window.localStorage.getItem('market_games_admin_session_v1'),null);assert.equal(dom.window.document.querySelector('#workspace').classList.contains('hidden'),true);assert.equal(calls.some(p=>p.startsWith('/api/admin/commercial/')||p.startsWith('/api/admin/accounts/')),false);}finally{dom.window.close();}
});

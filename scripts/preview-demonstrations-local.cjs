'use strict';
// LOCAL QA ONLY: loopback, dedicated fixtures, simulated date, no providers or background workers.
// Not imported by app.js/server.js. Never mount these QA login routes on a deployed server.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_demonstrations_preview_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='demonstrations-preview-local-only';
process.env.PUBLIC_APP_URL='http://127.0.0.1:4877';process.env.QORI_DEMO_EMAIL_ENABLED='false';
const express=require('express'),{query}=require('../backend/src/config/db'),{randomUUID}=require('node:crypto');
const {createService,policy}=require('../backend/src/services/demonstrationService');
const service=createService({now:()=>new Date('2027-01-04T15:00:00Z'),mailOperational:()=>false});
require('../backend/src/services/demonstrationRuntime').service=service;
async function main(){
 if((await query('select current_database() db')).rows[0].db!=='qori_demonstrations_preview_qa')throw Error('Base no autorizada para vista previa.');
 const seller=(await query("insert into app_users(email,password_hash,full_name,role) values('demonstrations-preview@example.test','!local-preview-no-password','Embajador de demostración','QORI_SELLER') on conflict(email) do update set is_active=true returning *")).rows[0];
 await query("insert into qori_seller_applications(user_id,document_key,phone,city,ciiu,terms_version,status,approval_mode) values($1,$2,'3100000000','Bogotá','4610','2026-11-11-comisiones-vf1','APPROVED','DOCUMENTS') on conflict(user_id) do nothing",[seller.id,randomUUID()]);
 const admin=(await query("insert into app_users(email,password_hash,full_name,role) values('cbotero@gosqori.com','!local-preview-no-password','Admin de prueba local','QORI_SUPERADMIN') on conflict(email) do update set role='QORI_SUPERADMIN',is_active=true,password_setup_required=false returning *")).rows[0];
 if(!(await service.config()).approved)await service.saveConfig(admin,{settings:policy.DEFAULTS,enabled:true,accept_proposals:true});
 const url=(await service.invite(seller,{})).url,outer=express();
 outer.get('/qa',(_r,res)=>res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Qori · Demostraciones locales</title><style>body{font:16px system-ui;background:#edf2f7;color:#012268;margin:24px;line-height:1.6}.row{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}iframe{border:1px solid #b6c5d9;border-radius:16px;height:820px;background:white}h2{font-size:16px}a{display:inline-block;margin:8px;padding:12px;background:white;border-radius:12px}</style></head><body><h1>Qori · Demostraciones locales</h1><p>Datos ficticios · Reloj de prueba: 4 de enero de 2027 · Sin correos reales · Sin publicación</p><nav><a href="${url}">Invitación pública de prueba</a><a href="/qa/seller">Seller de prueba</a><a href="/qa/admin">Admin de prueba</a></nav><div class="row"><section><h2>390 px</h2><iframe title="Demostración 390 px" width="390" src="${url}"></iframe></section><section><h2>320 px</h2><iframe title="Demostración 320 px" width="320" src="${url}"></iframe></section></div></body></html>`));
 for(const kind of ['seller','admin'])outer.get('/qa/'+kind,(_req,res)=>{
  const who=kind==='seller'?seller:admin,token=require('jsonwebtoken').sign({sub:who.id,password_version:who.password_version||0},process.env.JWT_SECRET,{expiresIn:'2h'});
  const setup=kind==='seller'?`sessionStorage.setItem('qori-seller-token',${JSON.stringify(token)});`:`localStorage.setItem('market_games_admin_app_version','admin-exclusive-20261113');localStorage.setItem('market_games_admin_session_v1',${JSON.stringify(JSON.stringify({token,user:{...who,admin_access:true,password_hash:undefined}}))});`;
  res.set('Cache-Control','no-store').type('html').send(`<!doctype html><html><head><title>QA ${kind}</title></head><body><script>${setup}location.replace('/${kind}/');</script></body></html>`);
 });
 outer.use(require('../backend/src/app').app);outer.listen(4877,'127.0.0.1',()=>console.log('Vista previa local: http://127.0.0.1:4877/qa'));
}
main().catch(e=>{console.error(e.message);process.exit(1);});

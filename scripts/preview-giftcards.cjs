// Loopback QA only; no real provider requests or production credentials.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='giftcards-preview-local-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3141';
for(const key of ['RESEND_API_KEY','SMTP_HOST','SMTP_USER','SMTP_PASS','MERCADO_PAGO_ACCESS_TOKEN'])process.env[key]='';
const {query}=require('../backend/src/config/db'),{app}=require('../backend/src/app'),jwt=require('jsonwebtoken'),{randomUUID:uuid}=require('node:crypto'),express=require('express');
(async()=>{
 if((await query('select current_database() db')).rows[0].db!=='qori_customer_qa')throw Error('QA only');
 const signup=await require('../backend/src/services/penseEnTiService').signup({free_program:'UN_REGALO_PERSONAL',company_name:'Casa de Regalos · QA',contact_name:'Responsable QA',email:uuid()+'@example.test',nit:uuid(),phone:'3100000000',city:'Bogotá',address:'Calle QA',password:'PruebaLocal!2026',password_confirm:'PruebaLocal!2026',terms_accepted:true,privacy_accepted:true});
 const u=(await query('select * from app_users where business_id=$1',[signup.business_id])).rows[0],b=(await query('select * from businesses where id=$1',[signup.business_id])).rows[0];
 const token=jwt.sign({sub:u.id,password_version:0},process.env.JWT_SECRET,{expiresIn:'4h'}),subscription=await require('../backend/src/services/subscriptionService').getBusinessSubscription(b.id);
 const session={token,user:{id:u.id,business_id:b.id,email:u.email,full_name:u.full_name,role:u.role,business:b,subscription}};
 const server=express();server.get('/__giftcards_qa',(_req,res)=>res.type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><title>Qori · Gift Cards QA</title><body><h1>Un regalo personal · QA local</h1><p>Cuenta ficticia con cinco emisiones iniciales. Los pagos reales están deshabilitados.</p><a href="/empresa/?view=reward-passes">Abrir Gift Cards</a><p><a href="/pense-en-ti/?program=UN_REGALO_PERSONAL">Ver registro público</a></p><script>localStorage.setItem("qr_business_portal_session_v1",JSON.stringify('+JSON.stringify(session)+'));</script></body></html>'));
 server.use(app);server.listen(3141,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:3141/__giftcards_qa'));
})().catch(e=>{console.error(e);process.exit(1);});

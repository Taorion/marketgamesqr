const crypto=require('node:crypto');
const {query}=require('../../backend/src/config/db'),cfg=require('../../backend/src/play/config'),svc=require('../../backend/src/play/service'),dev=require('../../backend/src/invoice/service');
const id=()=>crypto.randomUUID();
async function person(){
 if(!cfg.enabled())throw Error('ISOLATED_PLAY_DATABASE_REQUIRED');
 const a=(await query("insert into customer_accounts(email,full_name,declared_document_key,document_locked_at,finance_setup_state) values($1,'Persona de prueba',$2,now(),'LEGACY') returning *",[id()+'@example.invalid','sbx'+id().replaceAll('-','')])).rows[0];
 a.token=cfg.token();await query("insert into customer_sessions(customer_id,token_hash,expires_at) values($1,$2,now()+interval '4 hours')",[a.id,cfg.hash(a.token)]);
 await require('../../backend/src/services/customerFinanceBooks').ensure(a);return a;
}
async function fixture({game='secuencia',cap=1}={}){
 const owner=await person(),buyer=await person(),partner=(await dev.register(owner,'Operador sintético')).partner;
 const app=(await dev.createApp(owner,partner.id,'Play de prueba')).app;await svc.enable(owner,app.id);
 const key=await dev.createKey(owner,app.id,['play:manage','play:analytics']);
 const machine=await require('../../backend/src/invoice/oauth').issue(key.client_id,key.client_secret);
 const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values('Patrocinador sintético',$1,'PRO','ACTIVE',$2) returning *",['play-'+id(),{qori_play_synthetic:true,subscription:{lifetime_access:true,monthly_payment_required:false}}])).rows[0];
 const user=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,'no-interactive-login','Patrocinador de prueba','BUSINESS_OWNER') returning *",[b.id,id()+'@example.invalid'])).rows[0];
 await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,100,100)',[b.id]);
 const g=(await query("insert into games(business_id,name,slug) values($1,'Qori Play','play') returning id",[b.id])).rows[0];
 const r=(await query("insert into rewards(business_id,name,description) values($1,'Beneficio sintético','Sin valor comercial; prueba local') returning id",[b.id])).rows[0];
 const source=(await query("insert into campaigns(business_id,game_id,reward_id,name,public_slug,requires_document_check,max_qr_total) values($1,$2,$3,'Campaña sintética','play-demo',false,100) returning *",[b.id,g.id,r.id])).rows[0];
 const sponsor=await svc.sponsor(user,app.id,source.id);
 const campaign=await svc.createCampaign(app.id,{sponsor_id:sponsor.id,game_key:game,max_sessions:100,config:{layout:'ad70',headline:'Tu próxima pausa tiene juego',description:'Demostración Qori Play. Participa desde tu teléfono.',cta_url:null,start_hour_utc:0,end_hour_utc:24}});
 await svc.approve(user,campaign.id,{reward_cap:cap,reward_cost_minor:100,budget_minor:cap*100,min_score:0});
 const location=await svc.location(app.id,'Sede de prueba'),screen=await svc.screen(app.id,{location_id:location.id,name:'Pantalla demo',orientation:'landscape'});
 await svc.assign(app.id,screen.id,campaign.id);
 return {owner,buyer,partner,app,key,token:machine.access_token,business:b,user,source,campaign,location,screen};
}
async function pair(f){const p=await svc.pairing();await svc.confirmPair(f.app.id,f.screen.id,p.code);return {...await svc.claimPair(p.challenge),pair:p};}
async function join(device){const s=await svc.snapshot(device.device_token);return svc.join(new URL(s.join.url).hash.slice(1));}
module.exports={fixture,person,pair,join};

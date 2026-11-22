const crypto=require('node:crypto'),{query,withTransaction}=require('../config/db');
const cfg=require('./config'),games=require('./games'),dev=require('../invoice/service');
const rows=async(db,sql,args=[])=> (await db.query(sql,args)).rows;
const one=async(db,sql,args)=> (await rows(db,sql,args))[0];
const terminal=s=>['COMPLETED','FAILED','EXPIRED'].includes(s);
async function event(db,type,s={},suffix='',metadata={}){
 await db.query('insert into play_events(app_id,screen_id,campaign_id,session_id,event_type,dedupe_key,metadata) values($1,$2,$3,$4,$5,$6,$7) on conflict(dedupe_key) do nothing',
 [s.app_id||null,s.screen_id||null,s.campaign_id||null,s.session_id||null,type,[type,s.session_id||s.screen_id||s.app_id||'system',suffix].join(':'),metadata]);
}
async function activeApp(db,id){
 const a=await one(db,`select a.* from invoice_apps a join invoice_partners p on p.id=a.partner_id join play_organizations o on o.partner_id=a.partner_id
 where a.id=$1 and a.active and a.environment='sandbox' and p.verification_state<>'REVOKED' and o.enabled`,[id]);
 if(!a)throw cfg.fault(403,'APPLICATION_DISABLED');return a;
}
async function enable(account,appId){
 return withTransaction(async db=>{const app=await dev.ownApp(db,account,appId);
 await db.query('insert into play_organizations(partner_id) values($1) on conflict do nothing',[app.partner_id]);await activeApp(db,appId);return {ok:true};});
}
async function owner(account,appId,write=true){return dev.ownApp({query},account,appId,{owner:write});}
async function location(appId,name){return withTransaction(async db=>{const a=await activeApp(db,appId);
 return one(db,'insert into play_locations(partner_id,name) values($1,$2) returning id,name',[a.partner_id,name]);});}
async function screen(appId,data){return withTransaction(async db=>{
 const a=await activeApp(db,appId);
 await db.query('select id from invoice_apps where id=$1 for update',[appId]);
 if(!(await one(db,'select id from play_locations where id=$1 and partner_id=$2',[data.location_id,a.partner_id])))throw cfg.fault(404,'NOT_FOUND');
 if(Number((await one(db,'select count(*) n from play_screens where app_id=$1',[appId])).n)>=25)throw cfg.fault(429,'SCREEN_LIMIT');
 return one(db,'insert into play_screens(partner_id,app_id,location_id,name,orientation) values($1,$2,$3,$4,$5) returning id,name,orientation',[a.partner_id,appId,data.location_id,data.name,data.orientation]);});}
async function ownedScreen(db,appId,id,lock=false){await activeApp(db,appId);const s=await one(db,'select * from play_screens where id=$1 and app_id=$2'+(lock?' for update':''),[id,appId]);if(!s)throw cfg.fault(404,'NOT_FOUND');return s;}
async function pairing(){
 const challenge=cfg.token(),code=crypto.randomBytes(6).toString('hex').toUpperCase();
 const p=await one({query},"insert into play_pairings(code_hash,challenge_hash,expires_at) values($1,$2,now()+interval '2 minutes') returning id,expires_at",[cfg.hash(code),cfg.hash(challenge)]);
 return {...p,challenge,code};
}
async function confirmPair(appId,screenId,code){return withTransaction(async db=>{
 const s=await ownedScreen(db,appId,screenId,true);if(!s.active)throw cfg.fault(409,'SCREEN_REVOKED');
 const p=await one(db,"update play_pairings set screen_id=$2 where code_hash=$1 and screen_id is null and consumed_at is null and expires_at>now() returning id",[cfg.hash(code),screenId]);
 if(!p)throw cfg.fault(409,'PAIRING_UNAVAILABLE');await event(db,'screen_pairing_confirmed',{app_id:appId,screen_id:screenId},p.id);return {ok:true};
 });}
async function claimPair(challenge){return withTransaction(async db=>{
 const p=await one(db,'select * from play_pairings where challenge_hash=$1 for update',[cfg.hash(challenge)]);
 if(!p||p.consumed_at||new Date(p.expires_at)<=new Date())throw cfg.fault(409,'PAIRING_UNAVAILABLE');
 if(!p.screen_id)return {status:'WAITING'};
 const s=await one(db,'select * from play_screens where id=$1 for update',[p.screen_id]);await activeApp(db,s.app_id);
 if(!s.active)throw cfg.fault(409,'SCREEN_REVOKED');const token=cfg.token();
 await db.query("update play_screens set device_hash=$2,device_expires_at=now()+interval '1 day',last_seen_at=now() where id=$1",[s.id,cfg.hash(token)]);
 await db.query('update play_pairings set consumed_at=now() where id=$1',[p.id]);await event(db,'screen_online',{app_id:s.app_id,screen_id:s.id},p.id);
 return {status:'PAIRED',screen_id:s.id,device_token:token,expires_in:86400};
 });}
async function device(db,token,lock=false){
 if(!cfg.validToken(token))throw cfg.fault(401,'INVALID_DEVICE');
 const s=await one(db,'select * from play_screens where device_hash=$1 and active and device_expires_at>now()'+(lock?' for update':''),[cfg.hash(token)]);
 if(!s)throw cfg.fault(401,'INVALID_DEVICE');await activeApp(db,s.app_id);return s;
}
async function rotateDevice(token){return withTransaction(async db=>{const s=await device(db,token,true),next=cfg.token();
 await db.query("update play_screens set device_hash=$2,device_expires_at=now()+interval '1 day' where id=$1",[s.id,cfg.hash(next)]);await event(db,'device_rotated',{app_id:s.app_id,screen_id:s.id},crypto.randomUUID());return {device_token:next};});}
async function sponsor(user,appId,campaignId){
 return withTransaction(async db=>{
 await activeApp(db,appId);
 const c=await one(db,`select c.id from campaigns c join businesses b on b.id=c.business_id where c.id=$1 and c.business_id=$2 and b.settings @> '{"qori_play_synthetic":true}'::jsonb and b.is_active`,[campaignId,user.business_id]);
 if(!c)throw cfg.fault(404,'NOT_FOUND');
 return one(db,"insert into play_sponsors(app_id,campaign_id,granted_by,expires_at) values($1,$2,$3,now()+interval '7 days') on conflict(app_id,campaign_id) do update set revoked_at=null,expires_at=excluded.expires_at returning id,campaign_id",[appId,campaignId,user.id]);});
}
async function createCampaign(appId,data){return withTransaction(async db=>{
 await activeApp(db,appId);const grant=await one(db,'select id from play_sponsors where id=$1 and app_id=$2 and revoked_at is null and expires_at>now()',[data.sponsor_id,appId]);if(!grant)throw cfg.fault(404,'NOT_FOUND');
 return one(db,'insert into play_campaigns(app_id,sponsor_id,game_key,config,max_sessions) values($1,$2,$3,$4,$5) returning id,active,config',[appId,grant.id,data.game_key,data.config,data.max_sessions]);});}
async function approve(user,id,data){return withTransaction(async db=>{
 const c=await one(db,`select p.*,c.business_id,c.reward_id from play_campaigns p join play_sponsors g on g.id=p.sponsor_id
 join campaigns c on c.id=g.campaign_id join businesses b on b.id=c.business_id where p.id=$1 and c.business_id=$2 and b.settings @> '{"qori_play_synthetic":true}'::jsonb for update of p`,[id,user.business_id]);
 if(!c)throw cfg.fault(404,'NOT_FOUND');
 if(data.reward_cap>0&&(!c.reward_id||data.reward_cost_minor<1||data.budget_minor<data.reward_cost_minor))throw cfg.fault(409,'REWARD_BUDGET_REQUIRED');
 const used=await one(db,"select count(*)::int n,coalesce(sum(cost_minor),0)::bigint cost from play_reward_grants where campaign_id=$1 and (status='ISSUED' or (status='RESERVED' and expires_at>now()))",[id]);
 if(data.reward_cap<used.n||data.budget_minor<Number(used.cost))throw cfg.fault(409,'EXISTING_COMMITMENTS');
 await db.query('update play_campaigns set approved_hash=$2,active=true,reward_cap=$3,reward_cost_minor=$4,budget_minor=$5,min_score=$6 where id=$1',[id,cfg.hash(JSON.stringify(c.config)),data.reward_cap,data.reward_cost_minor,data.budget_minor,data.min_score]);
 await event(db,'campaign_approved',{app_id:c.app_id,campaign_id:id},crypto.randomUUID(),{actor_id:user.id});
 return {ok:true,real_rewards:false};});}
async function campaign(db,id){
 const c=await one(db,`select p.*,g.campaign_id source_id,c.business_id,c.game_id source_game_id,c.reward_id,c.starts_at,c.ends_at,c.name source_name
 from play_campaigns p join play_sponsors g on g.id=p.sponsor_id join campaigns c on c.id=g.campaign_id join businesses b on b.id=c.business_id
 where p.id=$1 and p.active and g.revoked_at is null and g.expires_at>now() and c.status='ACTIVE' and b.is_active and b.settings @> '{"qori_play_synthetic":true}'::jsonb
 and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())`,[id]);
 if(!c||c.approved_hash!==cfg.hash(JSON.stringify(c.config)))throw cfg.fault(409,'CAMPAIGN_UNAVAILABLE');
 await activeApp(db,c.app_id);
 const hour=new Date().getUTCHours();if(hour<c.config.start_hour_utc||hour>=c.config.end_hour_utc)throw cfg.fault(409,'OUTSIDE_SCHEDULE');
 if((process.env.QORI_PLAY_DISABLED_GAMES||'').split(',').includes(c.game_key))throw cfg.fault(409,'GAME_DISABLED');return c;
}
async function assign(appId,screenId,campaignId){return withTransaction(async db=>{
 await ownedScreen(db,appId,screenId,true);const c=await campaign(db,campaignId);if(c.app_id!==appId)throw cfg.fault(404,'NOT_FOUND');
 if(await one(db,"select id from play_sessions where screen_id=$1 and status in ('READY','PLAYING','PAUSED','DISCONNECTED','QUEUED')",[screenId]))throw cfg.fault(409,'SCREEN_BUSY');
 await db.query('insert into play_assignments(screen_id,app_id,campaign_id) values($1,$2,$3) on conflict(screen_id) do update set campaign_id=excluded.campaign_id',[screenId,appId,campaignId]);return {ok:true};
 });}
async function screenState(appId,id,{active,paused}){return withTransaction(async db=>{
 const s=await ownedScreen(db,appId,id,true);
 await db.query('update play_screens set active=$2,paused=$3,device_hash=case when $2 then device_hash else null end where id=$1',[id,active??s.active,paused??s.paused]);await event(db,'screen_state_changed',{app_id:appId,screen_id:id},crypto.randomUUID());return {ok:true};});}
async function campaignState(appId,id,active){return withTransaction(async db=>{await activeApp(db,appId);const c=await one(db,'select * from play_campaigns where id=$1 and app_id=$2',[id,appId]);if(!c)throw cfg.fault(404,'NOT_FOUND');if(active&&!c.approved_hash)throw cfg.fault(409,'SPONSOR_APPROVAL_REQUIRED');await db.query('update play_campaigns set active=$2 where id=$1',[id,active]);return {ok:true};});}
async function ticket(db,s,c){
 let t=await one(db,"select * from play_join_tickets where screen_id=$1 and campaign_id=$2 and consumed_at is null and expires_at>now()+interval '10 seconds' order by expires_at desc limit 1",[s.id,c.id]);
 if(!t){const id=crypto.randomUUID(),value=cfg.token();t=await one(db,"insert into play_join_tickets(id,screen_id,campaign_id,token_hash,token_box,expires_at) values($1,$2,$3,$4,$5,now()+interval '60 seconds') returning *",[id,s.id,c.id,cfg.hash(value),cfg.seal({value},id)]);}
 return {url:cfg.origin()+'/play/controller/#'+cfg.unseal(t.token_box,t.id).value,expires_at:t.expires_at};
}
async function snapshot(token){
 return withTransaction(async db=>{const s=await device(db,token,true);await db.query('update play_screens set last_seen_at=now() where id=$1',[s.id]);
 const assignment=await one(db,'select campaign_id from play_assignments where screen_id=$1',[s.id]);
 const empty={screen_id:s.id,orientation:s.orientation,status:'idle',campaign:null,game:null,queue:0,join:null};
 if(!assignment)return empty;
 let c;try{c=await campaign(db,assignment.campaign_id);}catch(e){if(e.status===409||e.status===403)return {...empty,status:'unavailable'};throw e;}
 const session=await one(db,"select * from play_sessions where screen_id=$1 and status in ('READY','PLAYING','PAUSED','DISCONNECTED')",[s.id]);
 const queue=Number((await one(db,"select count(*) n from play_sessions where screen_id=$1 and status='QUEUED'",[s.id])).n);
 await event(db,'campaign_displayed',{app_id:s.app_id,screen_id:s.id,campaign_id:c.id},c.id+':'+new Date().toISOString().slice(0,13));
 return {...empty,status:s.paused?'paused':session?.status.toLowerCase()||'idle',campaign:{id:c.id,game_key:c.game_key,...c.config},game:games.visible(session?.game_state,'screen'),queue,join:queue<5&&!s.paused?await ticket(db,s,c):null};
 });}
async function promote(db,s){
 if(s.paused||!s.active||!s.last_seen_at||Date.now()-new Date(s.last_seen_at)>15000)return;
 if(await one(db,"select id from play_sessions where screen_id=$1 and status in ('READY','PLAYING','PAUSED','DISCONNECTED')",[s.id]))return;
 const next=await one(db,"select * from play_sessions where screen_id=$1 and status='QUEUED' and controller_expires_at>now() order by created_at,id for update skip locked limit 1",[s.id]);
 if(!next)return;const c=await campaign(db,next.campaign_id);
 const state=games.initial(c.game_key,crypto.randomBytes(4).readUInt32LE());
 await db.query("update play_sessions set status='READY',game_state=$2,last_tick_at=now() where id=$1",[next.id,state]);
}
async function join(value){
 return withTransaction(async db=>{
 const t0=await one(db,'select screen_id from play_join_tickets where token_hash=$1',[cfg.hash(value)]);if(!t0)throw cfg.fault(409,'JOIN_UNAVAILABLE');
 const s=await one(db,'select * from play_screens where id=$1 for update',[t0.screen_id]);await activeApp(db,s.app_id);
 const t=await one(db,'select * from play_join_tickets where token_hash=$1 for update',[cfg.hash(value)]);
 if(t.consumed_at||new Date(t.expires_at)<=new Date()||!s.active||s.paused||Date.now()-new Date(s.last_seen_at)>15000)throw cfg.fault(409,'JOIN_UNAVAILABLE');
 const a=await one(db,'select campaign_id from play_assignments where screen_id=$1',[s.id]);if(a?.campaign_id!==t.campaign_id)throw cfg.fault(409,'JOIN_UNAVAILABLE');
 const c=await campaign(db,t.campaign_id);await db.query('select id from play_campaigns where id=$1 for update',[c.id]);
 const total=Number((await one(db,'select count(*) n from play_sessions where campaign_id=$1',[c.id])).n);if(total>=c.max_sessions)throw cfg.fault(429,'CAMPAIGN_SESSION_LIMIT');
 const waiting=Number((await one(db,"select count(*) n from play_sessions where screen_id=$1 and status='QUEUED'",[s.id])).n);if(waiting>=5)throw cfg.fault(409,'QUEUE_FULL');
 const secret=cfg.token(),session=await one(db,"insert into play_sessions(app_id,screen_id,campaign_id,controller_hash,controller_expires_at,status,consent_version) values($1,$2,$3,$4,now()+interval '15 minutes','QUEUED',$5) returning *",[s.app_id,s.id,c.id,cfg.hash(secret),cfg.consent.version]);
 await db.query('update play_join_tickets set consumed_at=now() where id=$1',[t.id]);
 const e={app_id:s.app_id,screen_id:s.id,campaign_id:c.id,session_id:session.id};await event(db,'qr_scanned',e);await event(db,'session_joined',e);
 await promote(db,s);const state=await one(db,'select status from play_sessions where id=$1',[session.id]);if(state.status==='QUEUED')await event(db,'queued',e);
 return {session_id:session.id,controller_token:secret,status:state.status,expires_in:900};
 });}
async function controller(db,token,lock=false){
 if(!cfg.validToken(token))throw cfg.fault(401,'INVALID_CONTROLLER');
 const s=await one(db,'select * from play_sessions where controller_hash=$1 and controller_expires_at>now()'+(lock?' for update':''),[cfg.hash(token)]);
 if(!s)throw cfg.fault(401,'INVALID_CONTROLLER');await activeApp(db,s.app_id);
 const screen=await one(db,'select active from play_screens where id=$1',[s.screen_id]);if(!screen?.active)throw cfg.fault(401,'SCREEN_REVOKED');return s;
}
async function personal(token){
 const s=await controller({query},token),grant=await one({query},'select status,expires_at from play_reward_grants where session_id=$1',[s.id]);
 const position=s.status==='QUEUED'?Number((await one({query},"select count(*) n from play_sessions where screen_id=$1 and status='QUEUED' and (created_at,id)<=(select created_at,id from play_sessions where id=$2)",[s.screen_id,s.id])).n):0;
 const c=await one({query},'select config,game_key from play_campaigns where id=$1',[s.campaign_id]);
 return {session_id:s.id,status:s.status,last_seq:s.last_seq,position,game:games.visible(s.game_state,'controller'),controls:games.manifests[c.game_key].controls,
 result:s.verified_result,reward:grant&&new Date(grant.expires_at)>new Date()?grant.status:'NONE',cta_url:terminal(s.status)?c.config.cta_url:null};
}
async function reserve(db,s){
 await db.query('select id from play_campaigns where id=$1 for update',[s.campaign_id]);
 const c=await campaign(db,s.campaign_id);if(!s.game_state.won||s.game_state.score<c.min_score||c.reward_cap<1)return;
 const used=await one(db,"select count(*)::int n,coalesce(sum(cost_minor),0)::bigint total from play_reward_grants where campaign_id=$1 and (status='ISSUED' or (status='RESERVED' and expires_at>now()))",[c.id]);
 if(used.n>=c.reward_cap||Number(used.total)+Number(c.reward_cost_minor)>Number(c.budget_minor))return;
 await db.query("insert into play_reward_grants(session_id,campaign_id,status,expires_at,cost_minor) values($1,$2,'RESERVED',now()+interval '10 minutes',$3) on conflict do nothing",[s.id,c.id,c.reward_cost_minor]);
}
async function finish(db,s){
 const status=s.game_state.won?'COMPLETED':'FAILED',result={score:s.game_state.score,won:s.game_state.won,method:'SERVER_SIMULATION',game_version:1};
 await db.query('update play_sessions set status=$2,game_state=$3,verified_result=$4,finished_at=now() where id=$1',[s.id,status,s.game_state,result]);
 const e={...s,session_id:s.id};await event(db,'game_finished',e);await event(db,'score_verified',e);
 if(status==='COMPLETED')await reserve(db,s);
}
async function input(token,data){
 return withTransaction(async db=>{
 const initial=await controller(db,token);const screen=await one(db,'select * from play_screens where id=$1 for update',[initial.screen_id]);
 const s=await controller(db,token,true);await campaign(db,s.campaign_id);
 if(data.seq!==s.last_seq+1)throw cfg.fault(409,'SEQUENCE_CONFLICT');
 if(screen.paused||!screen.last_seen_at||Date.now()-new Date(screen.last_seen_at)>15000)throw cfg.fault(409,'SCREEN_NOT_READY');
 if(data.action==='start'&&s.status==='READY'){s.status='PLAYING';await db.query("update play_sessions set status='PLAYING',started_at=now(),last_tick_at=now() where id=$1",[s.id]);await event(db,'game_started',{...s,session_id:s.id});}
 else{
 if(s.status!=='PLAYING')throw cfg.fault(409,'SESSION_NOT_PLAYING');
 if(!games.manifests[s.game_state.game].controls.includes(data.action))throw cfg.fault(400,'INVALID_CONTROL');
 games.step(s.game_state,data.action);await db.query('update play_sessions set game_state=$2 where id=$1',[s.id,s.game_state]);if(s.game_state.done)await finish(db,s);
 }
 await db.query('update play_sessions set last_seq=$2,last_seen_at=now() where id=$1',[s.id,data.seq]);
 return {accepted:true,seq:data.seq};
 });}
async function heartbeat(token,role){
 if(role==='screen'){const s=await device({query},token);await query('update play_screens set last_seen_at=now() where id=$1',[s.id]);return s.id;}
 const s=await controller({query},token);await query('update play_sessions set last_seen_at=now() where id=$1',[s.id]);
 if(s.status==='DISCONNECTED')await query("update play_sessions set status='PLAYING',disconnected_at=null,last_tick_at=now() where id=$1 and status='DISCONNECTED'",[s.id]);return s.id;
}
async function tickScreen(id){
 return withTransaction(async db=>{
 const screen=await one(db,'select * from play_screens where id=$1 for update',[id]);if(!screen)return;
 const sessions=await rows(db,"select * from play_sessions where screen_id=$1 and status in ('READY','PLAYING','PAUSED','DISCONNECTED','QUEUED') for update",[id]);
 for(const s of sessions){
 let allowed=true;try{await activeApp(db,s.app_id);await campaign(db,s.campaign_id);}catch(e){if(e.status===403||e.status===409)allowed=false;else throw e;}
 const stale=Date.now()-new Date(s.last_seen_at),age=Date.now()-new Date(s.created_at);
 if(!allowed||!screen.active||Date.now()-new Date(screen.last_seen_at)>45000||new Date(s.controller_expires_at)<=new Date()||stale>30000||(['QUEUED','READY'].includes(s.status)&&age>120000)){
 await db.query("update play_sessions set status='EXPIRED',finished_at=now() where id=$1",[s.id]);await event(db,'session_dropped',{...s,session_id:s.id});continue;
 }
 if(s.status==='QUEUED'||s.status==='READY')continue;
 if(screen.paused||Date.now()-new Date(screen.last_seen_at)>15000){await db.query("update play_sessions set status='PAUSED',last_tick_at=now() where id=$1",[s.id]);continue;}
 if(stale>12000){await db.query("update play_sessions set status='DISCONNECTED',disconnected_at=coalesce(disconnected_at,now()),last_tick_at=now() where id=$1",[s.id]);continue;}
 if(['PAUSED','DISCONNECTED'].includes(s.status)){await db.query("update play_sessions set status='PLAYING',last_tick_at=now() where id=$1",[s.id]);continue;}
 const steps=Math.min(20,Math.floor((Date.now()-new Date(s.last_tick_at))/100));
 for(let n=0;n<steps&&!s.game_state.done;n++)games.step(s.game_state);
 if(s.game_state.done)await finish(db,s);
 else if(steps)await db.query("update play_sessions set game_state=$2,last_tick_at=last_tick_at+($3::int*interval '100 milliseconds') where id=$1",[s.id,s.game_state,steps]);
 }
 try{await promote(db,screen);}catch(e){if(![403,409].includes(e.status))throw e;}
 });
}
async function tick(){const active=await rows({query},"select distinct screen_id from play_sessions where status in ('READY','PLAYING','PAUSED','DISCONNECTED','QUEUED') limit 100");for(const s of active)await tickScreen(s.screen_id);}
async function telemetry(token,type){
 const s=await controller({query},token);if(type!=='cta_opened'||!terminal(s.status))throw cfg.fault(409,'EVENT_NOT_ALLOWED');await event({query},type,{...s,session_id:s.id});return {ok:true};
}
async function overview(account){
 const d=await dev.overview(account),apps=d.apps;
 for(const a of apps){a.play=(await one({query},'select enabled from play_organizations where partner_id=$1',[a.partner_id]))?.enabled||false;}
 return {apps,partners:d.partners,games:Object.values(games.manifests),real_rewards:false};
}
async function dashboard(appId){
 const a=await activeApp({query},appId);
 return {locations:await rows({query},'select id,name from play_locations where partner_id=$1',[a.partner_id]),
 screens:await rows({query},'select s.id,s.name,s.orientation,s.active,s.paused,s.last_seen_at,a.campaign_id from play_screens s left join play_assignments a on a.screen_id=s.id where s.app_id=$1',[appId]),
 sponsors:await rows({query},'select g.id,g.campaign_id,c.name from play_sponsors g join campaigns c on c.id=g.campaign_id where g.app_id=$1 and g.revoked_at is null',[appId]),
 campaigns:await rows({query},'select id,game_key,config,active,approved_hash is not null approved,reward_cap,max_sessions from play_campaigns where app_id=$1',[appId])};
}
async function analytics(appId,filters={}){
 await activeApp({query},appId);
 const args=[appId,filters.from||'2000-01-01',filters.to||'2100-01-01',filters.screen_id||null,filters.campaign_id||null];
 const events=await rows({query},`select event_type,count(*)::int count from play_events where app_id=$1 and created_at>=$2::date and created_at<($3::date+1)
 and ($4::uuid is null or screen_id=$4) and ($5::uuid is null or campaign_id=$5) group by event_type order by event_type`,args);
 const redeemed=await one({query},`select count(distinct r.id)::int count from redemptions r join play_reward_grants g on g.qr_code_id=r.qr_code_id join play_sessions s on s.id=g.session_id
 where s.app_id=$1 and r.redeemed_at>=$2::date and r.redeemed_at<($3::date+1) and ($4::uuid is null or s.screen_id=$4) and ($5::uuid is null or s.campaign_id=$5)`,args);
 return {events,verified_redemptions:redeemed.count,active_screens:Number((await one({query},"select count(*) n from play_screens where app_id=$1 and active and last_seen_at>now()-interval '15 seconds'",[appId])).n),billing_enabled:false,measurement:'campaign_displayed = una ventana de presencia por pantalla/campaña/hora; qr_scanned = unión consentida, no visitas crudas ni ventas'};
}
async function blockOrganization(partnerId,enabled,adminId){await query('update play_organizations set enabled=$2 where partner_id=$1',[partnerId,enabled]);await event({query},'organization_state_changed',{},crypto.randomUUID(),{partner_id:partnerId,enabled,actor_id:adminId});return {ok:true};}
async function retention(){
 await query("delete from play_join_tickets where expires_at<now()-interval '1 hour'");
 await query("delete from play_pairings where expires_at<now()-interval '1 day'");
 await query("update play_reward_grants set status='EXPIRED' where status='RESERVED' and expires_at<now()");
 const days=Math.max(1,Math.min(90,Number.parseInt(process.env.QORI_PLAY_EVENT_RETENTION_DAYS,10)||30));
 await query("delete from play_events where created_at<now()-($1::int*interval '1 day')",[days]);
 await query("update play_sessions set game_state='{}' where status in ('COMPLETED','FAILED','EXPIRED') and finished_at<now()-interval '1 day' and game_state<>'{}'::jsonb");
}
module.exports={enable,owner,activeApp,location,screen,pairing,confirmPair,claimPair,device,rotateDevice,sponsor,createCampaign,approve,campaign,assign,screenState,campaignState,snapshot,join,controller,personal,input,heartbeat,tick,tickScreen,event,overview,dashboard,analytics,blockOrganization,retention,terminal};

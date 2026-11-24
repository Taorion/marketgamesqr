'use strict';
const crypto=require('node:crypto');
const {z}=require('zod');
const QRCode=require('qrcode');
const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {validate}=require('../utils/validators');
const {badRequest,notFound,forbidden}=require('../utils/http');
const {requireSuperadmin,requireOwner}=require('./commercialAuthorization');
const {requireApproved}=require('./qoriSellerService');
const {advisorById}=require('./commercialAdvisorService');
const policy=require('./demonstrationPolicy');
const uuid=z.string().uuid(),secret=z.string().regex(/^[A-Za-z0-9_-]{43}$/),email=z.string().trim().toLowerCase().email().max(180);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const key=()=>crypto.createHash('sha256').update('qori-demo-access-v1\0'+(process.env.SELLER_DOCUMENT_ENCRYPTION_KEY||env.jwtSecret)).digest();
function encrypt(value){const n=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),n);return Buffer.concat([n,c.update(JSON.stringify(value)),c.final(),c.getAuthTag()]);}
function decrypt(v){const d=crypto.createDecipheriv('aes-256-gcm',key(),v.subarray(0,12));d.setAuthTag(v.subarray(-16));return JSON.parse(Buffer.concat([d.update(v.subarray(12,-16)),d.final()]).toString());}
const clock=()=>new Date();
function createService({now=clock,deliver=require('./sellerWelcomeMailService').deliver,mailOperational=()=>process.env.QORI_DEMO_EMAIL_ENABLED==='true'&&!!env.resendApiKey}={}){
 async function config(db={query}){return (await db.query('select * from qori_demo_config where singleton')).rows[0];}
 // One scheduling lock, always first, also shared by the worker. Volume is twelve sessions/week.
 // This serializes cup allocation, moves, administrative changes and notification dispatch.
 async function tx(fn){return withTransaction(async db=>{await db.query("select pg_advisory_xact_lock(hashtext('qori-demonstrations-v1'))");return fn(db);});}
 async function event(db,action,{booking=null,session=null,actor=null,kind='SYSTEM',detail={}}={}){
  const e=(await db.query('insert into qori_demo_events(booking_id,session_id,action,actor_id,actor_kind,detail,created_at) values($1,$2,$3,$4,$5,$6,$7) returning id',[booking,session,action,actor,kind,detail,now()])).rows[0];
  await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,'demonstration',$3,$4)",[actor,'DEMO_'+action,booking||session||e.id,detail]);
 }
 async function snapshot(db){await db.query(`update qori_demo_visits v set expected=(v.active and b.status in('CONFIRMED','PENDING_CHANGE')) from qori_demo_sessions s,qori_demo_bookings b where v.session_id=s.id and v.booking_id=b.id and v.expected is null and s.starts_at<=$1 and s.status<>'CANCELLED'`,[now()]);}
 async function generate(db,c){
  const templates=(await db.query('select * from qori_demo_templates order by weekday,local_time')).rows;
  for(const s of policy.recurrence(templates,c.settings,now()))await db.query(`insert into qori_demo_sessions(template_id,local_date,starts_at,ends_at,meet_url,confirmed_template,capacity,status) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(template_id,local_date) do nothing`,[s.template_id,s.local_date,s.starts_at,s.ends_at,s.meet_url,s.confirmed_template,s.capacity,c.approved&&s.confirmed_template&&s.meet_url?'ENABLED':'DRAFT']);
 }
 async function session(db,id){validate(uuid,id);const s=(await db.query('select * from qori_demo_sessions where id=$1',[id])).rows[0];if(!s)throw notFound('Sesión no encontrada.');return s;}
 async function occupied(db,id){return Number((await db.query("select count(*) n from qori_demo_bookings where session_id=$1 and status<>'CANCELLED'",[id])).rows[0].n);}
 async function assertAvailable(db,id,c){const s=await session(db,id);if(!policy.available(s,c,now(),await occupied(db,id)))throw badRequest('Esta sesión ya no está disponible. Conservamos tus datos: elige otra fecha.',{code:'SESSION_UNAVAILABLE'});return s;}
 async function available(db,c){
  if(!c.approved||!c.enabled)return [];
  const rows=(await db.query(`select s.*,count(b.id)::int occupied from qori_demo_sessions s left join qori_demo_bookings b on b.session_id=s.id and b.status<>'CANCELLED' where s.starts_at>$1 and s.starts_at<=$2 group by s.id order by s.starts_at`,[now(),new Date(now().getTime()+c.settings.horizon_days*86400000)])).rows;
  return rows.filter(s=>policy.available(s,c,now(),s.occupied)).map(s=>({id:s.id,starts_at:s.starts_at,ends_at:s.ends_at,title:policy.TITLE,zone:policy.ZONE}));
 }
 async function invitation(db,token){validate(secret,token);const i=(await db.query('select * from qori_demo_invitations where token=$1 and revoked_at is null',[token])).rows[0];if(!i)throw notFound('Invitación no disponible. Solicita un enlace actualizado.');return {...i,advisor:await advisorById(i.seller_id,db)};}
 async function invite(user,body){await requireApproved(user);const d=validate(z.object({session_id:uuid.nullable().default(null),prospect_id:uuid.nullable().default(null)}).strict(),body);
  const result=await tx(async db=>{if(d.prospect_id){const p=(await db.query('select seller_id,stage from qori_sales_prospects where id=$1',[d.prospect_id])).rows[0];if(!p)throw notFound();requireOwner(user,p.seller_id);if(p.stage==='LOST'||(await db.query('select 1 from qori_demo_bookings where prospect_id=$1 and contact_stopped',[d.prospect_id])).rowCount)throw badRequest('Este contacto no continúa. Respeta su preferencia.');}
   if(d.session_id)await assertAvailable(db,d.session_id,await config(db));
   const seller=d.prospect_id?(await db.query('select seller_id from qori_sales_prospects where id=$1',[d.prospect_id])).rows[0].seller_id:user.id;
   await advisorById(seller,db);
   const existing=(await db.query('select token from qori_demo_invitations where seller_id=$1 and prospect_id is not distinct from $2 and session_id is not distinct from $3 and revoked_at is null limit 1',[seller,d.prospect_id,d.session_id])).rows[0];
   const token=existing?.token||crypto.randomBytes(32).toString('base64url');
   if(!existing)await db.query('insert into qori_demo_invitations(token,seller_id,prospect_id,session_id) values($1,$2,$3,$4)',[token,seller,d.prospect_id,d.session_id]);
   return {url:new URL('/demostraciones/?i='+token,env.publicAppUrl).toString(),seller_id:seller};});
  return {...result,qr_data_url:await QRCode.toDataURL(result.url,{width:768,margin:4,errorCorrectionLevel:'M',color:{dark:'#012268',light:'#ffffff'}})};
 }
 async function landing(token){return tx(async db=>{const i=await invitation(db,token),c=await config(db);await generate(db,c);const sessions=await available(db,c);return {title:policy.TITLE,description:policy.DESCRIPTION,ambassador:i.advisor.name,sessions,proposed_session:sessions.some(s=>s.id===i.session_id)?i.session_id:null,proposal_unavailable:!!i.session_id&&!sessions.some(s=>s.id===i.session_id),enabled:c.approved&&c.enabled,zone:policy.ZONE,email_operational:c.settings.email_enabled&&mailOperational()};});}
 async function issueAccess(db,id,days=180){const token=crypto.randomBytes(32).toString('base64url');const a=(await db.query('insert into qori_demo_access(booking_id,token_hash,encrypted_token,expires_at,created_at) values($1,$2,$3,$4,$5) returning id',[id,hash(token),encrypt(token),new Date(now().getTime()+days*86400000),now()])).rows[0];return {...a,token};}
 async function lookupAccess(db,token){validate(secret,token);const a=(await db.query('select * from qori_demo_access where token_hash=$1 and expires_at>$2',[hash(token),now()])).rows[0];if(!a)throw notFound('El acceso venció o no es válido. Recupera tu confirmación.');return a;}
 async function booking(db,id){return (await db.query('select b.*,case when p.business_id is null then p.seller_id when sa.seller_id=p.seller_id then p.seller_id else null end current_owner,p.stage prospect_stage,p.business_id from qori_demo_bookings b left join qori_sales_prospects p on p.id=b.prospect_id left join qori_sales_accounts sa on sa.business_id=p.business_id where b.id=$1',[id])).rows[0];}
 async function incident(db,b,kind,detail){await db.query('insert into qori_demo_incidents(booking_id,kind,detail,created_at) values($1,$2,$3,$4)',[b.id,kind,detail,now()]);}
 async function enqueue(db,b,kind,accessId=null,due=now(),suffix=''){
  const c=await config(db);if(!c.settings.email_enabled)return;
  if(kind.startsWith('REMINDER')&&(b.status!=='CONFIRMED'||b.contact_stopped))return;
  await db.query('insert into qori_demo_messages(booking_id,access_id,kind,revision,dedupe_key,due_at,created_at) values($1,$2,$3,$4,$5,$6,$7) on conflict(dedupe_key) do nothing',[b.id,accessId,kind,b.revision,`${b.id}/${b.revision}/${kind}/${suffix}`,due,now()]);
 }
 async function reminders(db,b){const c=await config(db),s=await session(db,b.session_id);for(const h of [...new Set(c.settings.reminder_hours)]){const due=new Date(new Date(s.starts_at).getTime()-h*3600000);if(due>now())await enqueue(db,b,'REMINDER_'+h,null,due);}}
 async function obsolete(db,id){await db.query("update qori_demo_messages set status='CANCELLED',encrypted_payload=null where booking_id=$1 and status in('PENDING','FAILED')",[id]);}
 async function subscription(db,b){
  if(!b.prospect_id)return {url:null,message:'La asociación comercial está en revisión administrativa.'};
  const owner=b.current_owner||b.owner_id;if(b.business_id)return {url:new URL('/empresa/',env.publicAppUrl).toString(),message:'Ya existe una cuenta vinculada. Ingresa para gestionar tu suscripción con tu embajador.'};
  if(!['NEW','CONTACTED','NEGOTIATING'].includes(b.prospect_stage))return {url:null,message:'Consulta a tu embajador para continuar.'};
  try{const p=(await db.query('select email from qori_sales_prospects where id=$1',[b.prospect_id])).rows[0];if(p.email.trim().toLowerCase()!==b.email)return {url:null,message:'Solicita al embajador revisar los datos del contacto.'};
   const r=await require('./prospectReferralService').referral({id:owner,role:'QORI_SELLER'},b.prospect_id,db);return {url:r.plan_referral_url,message:'Suscribirte es opcional. Usa el mismo correo de tu reserva; tu inscripción conservará la asociación comercial.'};
  }catch{return {url:null,message:'El enlace de suscripción requiere revisión del embajador.'};}
 }
 async function confirmation(db,b,a){const s=await session(db,b.session_id),c=await config(db),communications=(await db.query('select kind,status,last_error,accepted_at from qori_demo_messages where booking_id=$1 and revision=$2 order by created_at desc',[b.id,b.revision])).rows;
  return {id:b.id,title:policy.TITLE,name:b.contact_name,business_name:b.business_name,status:b.status,session:{id:s.id,starts_at:s.starts_at,ends_at:s.ends_at,status:s.status,meet_url:s.status==='CANCELLED'||b.status==='CANCELLED'?null:s.meet_url||null},zone:policy.ZONE,manage_url:new URL('/demostraciones/#reserva='+a.token,env.publicAppUrl).toString(),token:a.token,subscription:await subscription(db,b),communications,email_operational:c.settings.email_enabled&&mailOperational(),contact_stopped:b.contact_stopped,sessions:await available(db,c)};
 }
 const bookingSchema=z.object({invitation:secret,session_id:uuid,request_key:secret,name:z.string().trim().min(2).max(160),business_name:z.string().trim().min(2).max(160),email,phone:z.string().trim().max(40).default(''),business_type:z.string().trim().max(120).default(''),city:z.string().trim().max(120).default(''),need:z.enum(['ATTRACTION','FOLLOWUP','REPEAT','OTHER']).default('OTHER'),contact_preference:z.enum(['NONE','EMAIL','WHATSAPP']).default('NONE'),privacy_accepted:z.literal(true),whatsapp_authorized:z.boolean().default(false),marketing_authorized:z.boolean().default(false)}).strict().superRefine((d,c)=>{if(d.contact_preference==='WHATSAPP'&&(!d.whatsapp_authorized||!/^[+]?[0-9 ()-]{7,25}$/.test(d.phone)||d.phone.replace(/\D/g,'').length<7))c.addIssue({code:'custom',message:'Para WhatsApp indica un número válido y autoriza ese contacto.'});});
 async function reserve(body){const d=validate(bookingSchema,body),requestHash=hash(d.request_key),payloadHash=hash(JSON.stringify({...d,request_key:undefined}));
  return tx(async db=>{const c=await config(db),i=await invitation(db,d.invitation);await snapshot(db);
   const previous=(await db.query('select id,payload_hash from qori_demo_bookings where request_hash=$1',[requestHash])).rows[0];
   if(previous){if(previous.payload_hash!==payloadHash)throw badRequest('Usa una nueva solicitud para cambiar los datos.');const a=(await db.query('select * from qori_demo_access where booking_id=$1 and expires_at>$2 order by created_at limit 1',[previous.id,now()])).rows[0];if(!a)return {recovery_required:true};return confirmation(db,await booking(db,previous.id),{token:decrypt(a.encrypted_token)});}
   // Email coincidence never returns an existing booking, its management secret or contact details.
   if((await db.query("select 1 from qori_demo_bookings where email=$1 and session_id=$2 and status<>'CANCELLED'",[d.email,d.session_id])).rowCount)return {recovery_required:true,message:'Si ya tienes una reserva, utiliza su confirmación o solicita recuperación.'};
   await assertAvailable(db,d.session_id,c);
   const matches=(await db.query('select * from qori_sales_prospects where lower(trim(email))=$1 order by created_at,id',[d.email])).rows;
   let p=matches.length===1?matches[0]:null;let ambiguous=matches.length>1;
   // An invitation-specific prospect is used only after the submitted email matches it exactly.
   if(i.prospect_id){const candidate=matches.find(p=>p.id===i.prospect_id);if(candidate&&matches.length===1)p=candidate;}
   if(!p&&!ambiguous){
    p=(await db.query("insert into qori_sales_prospects(seller_id,business_name,contact_name,email,phone,stage,notes) values($1,$2,$3,$4,$5,'NEW',$6) returning *",[i.seller_id,d.business_name,d.name,d.email,d.phone.replace(/[^+0-9]/g,''),'Origen: reserva de Qori - Ideas para tu negocio.'])).rows[0];
    await require('./commercialContactSyncService').syncCommercialContact(db,{prospect:p,sellerId:p.seller_id});
   }
   const account=p?.business_id?(await db.query('select seller_id from qori_sales_accounts where business_id=$1',[p.business_id])).rows[0]:null;
   const owner=account?.seller_id||p?.seller_id||null;
   const b=(await db.query(`insert into qori_demo_bookings(session_id,prospect_id,owner_id,invitation_token,origin_seller_id,request_hash,payload_hash,contact_name,business_name,email,phone,details,consent,status,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`,[d.session_id,p?.id||null,owner,d.invitation,i.seller_id,requestHash,payloadHash,d.name,d.business_name,d.email,d.phone.replace(/[^+0-9]/g,''),{business_type:d.business_type,city:d.city,need:d.need,contact_preference:d.contact_preference},{privacy_accepted:true,privacy_url:'/privacidad/',purpose:'RESERVATION',accepted_at:now().toISOString(),whatsapp_authorized:d.whatsapp_authorized,marketing_authorized:d.marketing_authorized},c.settings.additional_confirmation?'PENDING_CONFIRMATION':'CONFIRMED',now()])).rows[0];
   if(p&&((await db.query('select 1 from qori_demo_bookings where prospect_id=$1 and contact_stopped',[p.id])).rowCount||p.stage==='LOST')){await db.query("update qori_demo_bookings set contact_stopped=true,followup_status='CLOSED' where id=$1",[b.id]);b.contact_stopped=true;}
   await db.query('insert into qori_demo_visits(booking_id,session_id,created_at) values($1,$2,$3)',[b.id,b.session_id,now()]);
   if(ambiguous)await incident(db,b,'AMBIGUOUS_IDENTITY',{candidate_ids:matches.map(p=>p.id),origin_seller_id:i.seller_id});
   if(owner&&owner!==i.seller_id)await incident(db,b,'ATTRIBUTION_CONFLICT',{owner_id:owner,origin_seller_id:i.seller_id});
   const a=await issueAccess(db,b.id);await event(db,'RESERVED',{booking:b.id,session:b.session_id,kind:'PUBLIC',detail:{origin_seller_id:i.seller_id,owner_id:owner,prospect_id:p?.id||null}});
   await enqueue(db,b,'CONFIRMATION',a.id);await reminders(db,b);
   return confirmation(db,await booking(db,b.id),a);
  });
 }
 async function manage(token){return tx(async db=>{const a=await lookupAccess(db,token);await snapshot(db);await generate(db,await config(db));return confirmation(db,await booking(db,a.booking_id),{token});});}
 async function change(token,body){const d=validate(z.object({action:z.enum(['CANCEL','MOVE','ACCEPT','CONFIRM','STOP_CONTACT']),session_id:uuid.optional()}).strict(),body);
  return tx(async db=>{const a=await lookupAccess(db,token);await snapshot(db);let b=await booking(db,a.booking_id);const old=await session(db,b.session_id),c=await config(db);
   if(d.action==='STOP_CONTACT'){await db.query('update qori_demo_bookings set contact_stopped=true,followup_status=\'CLOSED\' where id=$1',[b.id]);await event(db,'CONTACT_STOPPED',{booking:b.id,kind:'PUBLIC'});return confirmation(db,await booking(db,b.id),{token});}
   if(b.status==='CANCELLED'&&!(b.cancel_actor==='ADMIN'&&d.action==='MOVE')){if(d.action==='CANCEL')return confirmation(db,b,{token});throw badRequest('La reserva está cancelada. Crea una nueva invitación.');}
   if(d.action==='MOVE'){
    if(d.session_id===b.session_id)return confirmation(db,b,{token});
    const target=await assertAvailable(db,d.session_id,c);
    if((await db.query("select 1 from qori_demo_bookings where id<>$1 and session_id=$2 and status<>'CANCELLED' and (email=$3 or prospect_id=$4)",[b.id,target.id,b.email,b.prospect_id])).rowCount)throw badRequest('Ya tienes una reserva en ese horario.');
    await db.query('update qori_demo_visits set active=false,expected=coalesce(expected,false) where booking_id=$1 and active',[b.id]);
    await db.query('insert into qori_demo_visits(booking_id,session_id,created_at) values($1,$2,$3)',[b.id,target.id,now()]);
    await db.query("update qori_demo_bookings set session_id=$2,status='CONFIRMED',revision=revision+1 where id=$1",[b.id,target.id]);
    await event(db,'RESCHEDULED',{booking:b.id,session:target.id,kind:'PUBLIC',detail:{from:old.id,to:target.id,from_start:old.starts_at,to_start:target.starts_at}});
   }else if(d.action==='CANCEL'){
    await db.query("update qori_demo_bookings set status='CANCELLED',cancel_actor='PUBLIC',cancelled_at=$2,revision=revision+1 where id=$1",[b.id,now()]);
    await db.query('update qori_demo_visits set active=false,expected=coalesce(expected,false) where booking_id=$1 and active',[b.id]);
    await event(db,'CANCELLED',{booking:b.id,session:old.id,kind:'PUBLIC'});
   }else{
    if(!['PENDING_CHANGE','PENDING_CONFIRMATION'].includes(b.status))return confirmation(db,b,{token});
    if(old.status==='CANCELLED'||!old.meet_url||new Date(old.starts_at)<=now())throw badRequest('Elige otra sesión disponible.');
    await db.query("update qori_demo_bookings set status='CONFIRMED',revision=revision+1 where id=$1",[b.id]);
    await event(db,'ACCEPTED',{booking:b.id,session:old.id,kind:'PUBLIC'});
   }
   b=await booking(db,b.id);await obsolete(db,b.id);await enqueue(db,b,d.action==='CANCEL'?'CANCELLATION':'CONFIRMATION',a.id);if(b.status==='CONFIRMED')await reminders(db,b);
   return confirmation(db,b,{token});
  });
 }
 async function recover(body){const d=validate(z.object({email}).strict(),body);return tx(async db=>{const c=await config(db);if(c.settings.email_enabled&&mailOperational()){
   const rows=(await db.query("select * from qori_demo_bookings where coalesce(details->>'delivery_email',email)=$1 and created_at>$2 order by created_at desc limit 5",[d.email,new Date(now().getTime()-365*86400000)])).rows;
   for(const b of rows){if((await db.query("select 1 from qori_demo_messages where booking_id=$1 and kind='RECOVERY' and created_at>$2",[b.id,new Date(now().getTime()-15*60000)])).rowCount)continue;const a=await issueAccess(db,b.id,7);await enqueue(db,b,'RECOVERY',a.id,now(),a.id);}
  }return {message:c.settings.email_enabled&&mailOperational()?'Si el correo tiene reservas, recibirá un enlace de acceso.':'La recuperación por correo no está operativa. Conserva el enlace de gestión que recibiste al reservar; contacta a Qori si lo perdiste.',available:c.settings.email_enabled&&mailOperational()};});}
 async function saveConfig(user,body){requireSuperadmin(user);const d=validate(z.object({settings:policy.settingsSchema,enabled:z.boolean(),accept_proposals:z.literal(true)}).strict(),body);
  return tx(async db=>{const old=await config(db);if(d.settings.attendance_owner==='HOST'){if(!d.settings.host_ids.length)throw badRequest('Selecciona al menos un anfitrión.');for(const id of d.settings.host_ids)await advisorById(id,db);}
   await db.query('update qori_demo_config set settings=$1,approved=true,enabled=$2,updated_by=$3,updated_at=$4 where singleton',[d.settings,d.enabled,user.id,now()]);const c=await config(db);
   // Existing occurrences remain snapshots. No template/config edit silently changes reservations.
   await generate(db,c);
   if(!old.approved)await db.query("update qori_demo_sessions s set status='ENABLED',capacity=$1 where status='DRAFT' and confirmed_template and meet_url<>'' and not exists(select 1 from qori_demo_bookings b where b.session_id=s.id)",[d.settings.capacity]);
   await event(db,'CONFIG_SAVED',{actor:user.id,kind:'ADMIN',detail:{before:old.settings,after:d.settings,enabled:d.enabled}});return {ok:true};});}
 async function saveTemplate(user,id,body){requireSuperadmin(user);validate(uuid,id);const d=validate(z.object({meet_url:policy.meet,confirmed:z.boolean(),duration_minutes:z.number().int().min(15).max(240),reason:z.string().trim().min(5).max(1000)}).strict(),body);
  return tx(async db=>{const t=(await db.query('select * from qori_demo_templates where id=$1',[id])).rows[0];if(!t)throw notFound();await db.query('update qori_demo_templates set meet_url=$2,confirmed=$3,duration_minutes=$4 where id=$1',[id,d.meet_url,d.confirmed,d.duration_minutes]);await event(db,'TEMPLATE_CHANGED',{actor:user.id,kind:'ADMIN',detail:{template_id:id,before:t,after:d}});return {ok:true,message:'Plantilla guardada. Las ocurrencias ya creadas conservan su configuración; actualízalas explícitamente.'};});}
 async function rebuildEmpty(user){requireSuperadmin(user);return tx(async db=>{const c=await config(db);await generate(db,c);
  const r=await db.query(`update qori_demo_sessions s set meet_url=t.meet_url,confirmed_template=t.confirmed,ends_at=s.starts_at+make_interval(mins=>t.duration_minutes),capacity=$1,status=case when $2 and t.confirmed and t.meet_url<>'' then 'ENABLED' else 'DRAFT' end,revision=s.revision+1 from qori_demo_templates t where t.id=s.template_id and s.starts_at>$3 and not s.is_exception and not exists(select 1 from qori_demo_bookings b where b.session_id=s.id) and not exists(select 1 from qori_demo_visits v where v.session_id=s.id)`,[c.settings.capacity,c.approved,now()]);await event(db,'EMPTY_OCCURRENCES_REFRESHED',{actor:user.id,kind:'ADMIN',detail:{count:r.rowCount}});return {ok:true,count:r.rowCount};});}
 async function changeSession(user,id,body){requireSuperadmin(user);const d=validate(z.object({meet_url:policy.meet,status:z.enum(['DRAFT','ENABLED','CLOSED','CANCELLED','FINISHED']),capacity:z.number().int().min(1).max(500),date:z.string().date().refine(v=>v>=policy.START),time:z.string().regex(/^\d{2}:\d{2}$/),duration_minutes:z.number().int().min(15).max(240),reason:z.string().trim().min(5).max(1000)}).strict(),body);
  return tx(async db=>{await snapshot(db);const s=await session(db,id),c=await config(db),starts=policy.instant(d.date,d.time),ends=new Date(starts.getTime()+d.duration_minutes*60000),count=await occupied(db,id);
   if(!Number.isFinite(starts.getTime()))throw badRequest('Hora no válida.');if(d.capacity<count)throw badRequest('El cupo no puede ser menor que las reservas activas. Resuelve primero las reservas.');
   if(d.status==='ENABLED'&&(!d.meet_url||!c.approved||!s.confirmed_template))throw badRequest('Confirma la configuración y la franja antes de habilitarla.');
   const moved=new Date(s.starts_at).getTime()!==starts.getTime()||new Date(s.ends_at).getTime()!==ends.getTime();
   if(moved&&(new Date(s.starts_at)<=now()||starts<=now()))throw badRequest('No cambies fechas de sesiones ya iniciadas ni las muevas al pasado.');
   if(d.status==='FINISHED'&&new Date(s.ends_at)>now())throw badRequest('La sesión aún no ha terminado.');
   if(s.status==='CANCELLED'&&d.status!=='CANCELLED')throw badRequest('Una sesión cancelada conserva su historial. Habilita otra ocurrencia.');
   await db.query('update qori_demo_sessions set starts_at=$2,ends_at=$3,meet_url=$4,status=$5,capacity=$6,revision=revision+1,is_exception=true where id=$1',[id,starts,ends,d.meet_url,d.status,d.capacity]);
   const affected=moved||s.meet_url!==d.meet_url||d.status==='CANCELLED';
   if(affected){const rows=(await db.query("select * from qori_demo_bookings where session_id=$1 and status<>'CANCELLED'",[id])).rows;for(let b of rows){
    await db.query("update qori_demo_bookings set revision=revision+1,status=$2,cancel_actor=$3,cancelled_at=$4 where id=$1",[b.id,d.status==='CANCELLED'?'CANCELLED':moved?'PENDING_CHANGE':b.status,d.status==='CANCELLED'?'ADMIN':null,d.status==='CANCELLED'?now():null]);
    if(d.status==='CANCELLED')await db.query('update qori_demo_visits set active=false,expected=coalesce(expected,false) where booking_id=$1 and active',[b.id]);
    await event(db,moved?'ADMIN_RESCHEDULED':d.status==='CANCELLED'?'ADMIN_CANCELLED':'MEET_CHANGED',{booking:b.id,session:id,actor:user.id,kind:'ADMIN',detail:{before:{starts_at:s.starts_at,ends_at:s.ends_at,meet_url:s.meet_url},after:d}});
    await obsolete(db,b.id);b=await booking(db,b.id);await enqueue(db,b,d.status==='CANCELLED'?'CANCELLATION':moved?'CHANGE':'MEET_CHANGED');if(b.status==='CONFIRMED')await reminders(db,b);
   }}
   await event(db,'SESSION_CHANGED',{session:id,actor:user.id,kind:'ADMIN',detail:{before:s,after:d}});return {ok:true};});}
 async function staffAccess(user,b){await requireApproved(user);if(!b)throw notFound();requireOwner(user,b.prospect_id?b.current_owner:b.owner_id);}
 async function attendance(user,visitId,body){validate(uuid,visitId);const d=validate(z.object({attendance:z.enum(['PENDING','ATTENDED','ABSENT']),reason:z.string().trim().min(5).max(1000)}).strict(),body);
  return tx(async db=>{const c=await config(db);await requireApproved(user);if(user.role!=='QORI_SUPERADMIN'&&!(c.settings.attendance_owner==='HOST'&&c.settings.host_ids.includes(user.id)))throw forbidden('Solo Admin o un anfitrión autorizado puede registrar asistencia.');
   await snapshot(db);const v=(await db.query('select v.*,s.starts_at,s.status session_status from qori_demo_visits v join qori_demo_sessions s on s.id=v.session_id where v.id=$1',[visitId])).rows[0];if(!v)throw notFound();if(new Date(v.starts_at)>now()||v.session_status==='CANCELLED'||!v.expected)throw badRequest('Registra asistencia de una reserva esperada en una sesión ya iniciada.');
   await db.query('update qori_demo_visits set attendance=$2,recorded_at=$3,recorded_by=$4 where id=$1',[v.id,d.attendance,now(),user.id]);
   const b=await booking(db,v.booking_id);
   if(d.attendance!=='PENDING'&&!b.contact_stopped){const due=new Date(now().getTime()+c.settings.followup_hours*3600000);await db.query('update qori_demo_bookings set followup_due=coalesce(followup_due,$2) where id=$1',[b.id,due]);if(b.prospect_id)await db.query('update qori_sales_prospects set next_contact_at=coalesce(next_contact_at,$2) where id=$1',[b.prospect_id,due]);}
   await event(db,'ATTENDANCE_RECORDED',{booking:b.id,session:v.session_id,actor:user.id,kind:'STAFF',detail:{before:v.attendance,after:d.attendance,reason:d.reason,visit_id:v.id}});return {ok:true};});}
 async function followup(user,id,body){validate(uuid,id);const d=validate(z.object({status:z.enum(['PENDING','AGREED','COMPLETED','CLOSED']),next_contact_at:z.string().datetime().nullable(),notes:z.string().trim().max(2000),stop_contact:z.boolean().default(false)}).strict(),body);
  return tx(async db=>{const b=await booking(db,id);await staffAccess(user,b);if(d.status==='AGREED'&&!d.next_contact_at)throw badRequest('Indica la fecha acordada.');if(b.contact_stopped&&!d.stop_contact&&d.status!=='CLOSED')throw badRequest('El prospecto solicitó no recibir contactos.');
   await db.query("update qori_demo_bookings set followup_status=$2,followup_due=coalesce($3,followup_due),followup_completed_at=case when $2='COMPLETED' then coalesce(followup_completed_at,$4) else followup_completed_at end,contact_stopped=contact_stopped or $5 where id=$1",[id,d.stop_contact?'CLOSED':d.status,d.next_contact_at,now(),d.stop_contact]);
   if(b.prospect_id){await db.query("update qori_sales_prospects set notes=left(concat_ws(E'\n',nullif(notes,''),$2::text),4000),next_contact_at=$3,updated_at=$4 where id=$1",[b.prospect_id,'Demostración: '+d.notes+(d.stop_contact?' · No contactar.':''),d.stop_contact?null:d.next_contact_at,now()]);const p=(await db.query('select * from qori_sales_prospects where id=$1',[b.prospect_id])).rows[0];await require('./commercialContactSyncService').syncCommercialContact(db,{prospect:p,sellerId:p.seller_id,actorId:user.id});}
   await event(db,'FOLLOWUP_UPDATED',{booking:id,actor:user.id,kind:'STAFF',detail:d});return {ok:true};});}
 async function resolveIncident(user,id,body){requireSuperadmin(user);validate(uuid,id);const d=validate(z.object({prospect_id:uuid,reason:z.string().trim().min(15).max(2000)}).strict(),body);
  return tx(async db=>{const inc=(await db.query('select * from qori_demo_incidents where id=$1',[id])).rows[0];if(!inc)throw notFound();if(inc.status!=='OPEN')return {ok:true};const b=await booking(db,inc.booking_id),p=(await db.query('select * from qori_sales_prospects where id=$1',[d.prospect_id])).rows[0];
   if(!p||p.email.trim().toLowerCase()!==b.email)throw badRequest('Selecciona un prospecto con el correo exacto de la reserva. Corrige los datos en el CRM si es necesario.');
   // Reassignment of an existing prospect/account remains in the canonical commercial Admin flow.
   await db.query('update qori_demo_bookings set prospect_id=$2,owner_id=$3 where id=$1',[b.id,p.id,p.seller_id]);await db.query("update qori_demo_incidents set status='RESOLVED',resolved_at=$2,resolved_by=$3,reason=$4 where id=$1",[id,now(),user.id,d.reason]);await event(db,'INCIDENT_RESOLVED',{booking:b.id,actor:user.id,kind:'ADMIN',detail:{incident:id,previous_prospect:b.prospect_id,prospect_id:p.id,owner_id:p.seller_id,reason:d.reason}});return {ok:true};});}
 async function workspace(user){await requireApproved(user);return tx(async db=>{const c=await config(db);await snapshot(db);await generate(db,c);const admin=user.role==='QORI_SUPERADMIN',host=c.settings.attendance_owner==='HOST'&&c.settings.host_ids.includes(user.id);
  const sessions=(await db.query('select * from qori_demo_sessions where starts_at>=$1 order by starts_at',[new Date(now().getTime()-365*86400000)])).rows;
  const rows=(await db.query(`select b.id,b.session_id,b.prospect_id,b.contact_name,b.business_name,b.email,b.phone,b.details,b.status,b.followup_status,b.followup_due,b.contact_stopped,b.created_at,p.notes,p.next_contact_at,(case when p.id is null then b.owner_id when p.business_id is null then p.seller_id when sa.seller_id=p.seller_id then p.seller_id else null end) owner_id,u.full_name owner_name from qori_demo_bookings b left join qori_sales_prospects p on p.id=b.prospect_id left join qori_sales_accounts sa on sa.business_id=p.business_id left join app_users u on u.id=(case when p.id is null then b.owner_id when p.business_id is null then p.seller_id when sa.seller_id=p.seller_id then p.seller_id else null end) where ($1::boolean or (case when p.id is null then b.owner_id when p.business_id is null then p.seller_id when sa.seller_id=p.seller_id then p.seller_id else null end)=$2) order by b.created_at desc`,[admin,user.id])).rows;
  const ids=rows.map(b=>b.id),visits=(await db.query('select v.* from qori_demo_visits v where booking_id=any($1::uuid[]) order by created_at',[ids])).rows;
  const communications=(await db.query('select id,booking_id,kind,status,attempts,last_error,due_at,accepted_at from qori_demo_messages where booking_id=any($1::uuid[]) order by created_at desc',[ids])).rows;
  const events=(await db.query('select * from qori_demo_events where booking_id=any($1::uuid[]) order by created_at desc limit 500',[ids])).rows;
  return {admin,host,config:admin?c:{approved:c.approved,enabled:c.enabled},templates:admin?(await db.query('select * from qori_demo_templates order by weekday,local_time')).rows:[],sessions,available:await available(db,c),bookings:rows,visits,communications,events,incidents:admin?(await db.query("select * from qori_demo_incidents order by created_at desc limit 200")).rows:[],team:admin?(await db.query("select id,full_name from app_users where is_active and role in('QORI_SELLER','QORI_SUPERADMIN') order by full_name")).rows:[],email_operational:mailOperational(),whatsapp_operational:false};});}
 async function hostRoster(user,id){await requireApproved(user);return tx(async db=>{const c=await config(db);if(user.role!=='QORI_SUPERADMIN'&&!(c.settings.attendance_owner==='HOST'&&c.settings.host_ids.includes(user.id)))throw forbidden();await session(db,id);return {rows:(await db.query('select v.id,v.attendance,b.contact_name,b.business_name from qori_demo_visits v join qori_demo_bookings b on b.id=v.booking_id where v.session_id=$1 and v.active',[id])).rows};});}
 async function correctEmail(token,body){const d=validate(z.object({email}).strict(),body);return tx(async db=>{const a=await lookupAccess(db,token),b=await booking(db,a.booking_id);if(b.email===d.email)return {ok:true};
  // Preserve CRM identity; a changed delivery address never changes the prospect or commercial owner.
  await db.query("update qori_demo_bookings set details=jsonb_set(details,'{delivery_email}',to_jsonb($2::text)),revision=revision+1 where id=$1",[b.id,d.email]);await obsolete(db,b.id);const next=await booking(db,b.id);await enqueue(db,next,'CONFIRMATION',a.id);await reminders(db,next);await event(db,'DELIVERY_EMAIL_CHANGED',{booking:b.id,kind:'PUBLIC'});return {ok:true};});}
 return {config,tx,event,snapshot,generate,session,booking,available,invite,landing,reserve,manage,change,recover,saveConfig,saveTemplate,rebuildEmpty,changeSession,attendance,followup,resolveIncident,workspace,hostRoster,correctEmail,lookupAccess,issueAccess,confirmation,enqueue,reminders,obsolete,now,mailOperational,deliver};
}
module.exports={createService,encrypt,decrypt,hash,policy};

'use strict';
const crypto=require('node:crypto');
const QRCode=require('qrcode');
const {z}=require('zod');
const {env}=require('../config/env');
const {badRequest,forbidden,notFound}=require('../utils/http');
const {requireApproved}=require('./qoriSellerService');
const {requireOwner}=require('./commercialAuthorization');
const uuid=z.string().uuid(),tokenSchema=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const documentSchema=z.string().trim().regex(/^[0-9 .-]{4,30}$/).transform(v=>v.replace(/\D/g,'')).refine(v=>v.length>=4&&v.length<=20);
const interests=['ATTRACTION','FOLLOWUP','REPEAT','SALES','OTHER'];
const responseSchema=z.object({
 document_id:documentSchema,email:z.string().trim().toLowerCase().email().max(180),
 interests:z.array(z.enum(interests)).min(1).max(5).transform(v=>[...new Set(v)]),
 findings:z.string().trim().min(10).max(2000),application:z.string().trim().min(5).max(2000),
 questions:z.string().trim().max(2000).default(''),
 next_step:z.enum(['CONTACT_ME','TRY_QORI','LATER','NO_CONTACT']),
 attended:z.literal(true),consent:z.literal(true),reservation_access:tokenSchema.optional(),
}).strict();
function parse(schema,value){const r=schema.safeParse(value);if(r.success)return r.data;
 const labels={document_id:'Escribe tu cédula con entre 4 y 20 números.',email:'Escribe el correo con el que reservaste.',interests:'Selecciona al menos un tema que te interese.',findings:'Cuéntanos qué descubriste con al menos 10 caracteres.',application:'Describe qué aplicarías en tu negocio con al menos 5 caracteres.',questions:'Acorta tus preguntas a un máximo de 2000 caracteres.',next_step:'Selecciona cómo quieres continuar.',attended:'Confirma que participaste en esta demostración.',consent:'Autoriza compartir tus respuestas con Qori y el embajador responsable.',reservation_access:'Revisa el enlace privado de tu reserva.'};
 throw badRequest([...new Set(r.error.issues.map(i=>i.code==='unrecognized_keys'?'Actualiza el formulario y vuelve a intentarlo.':i.code==='too_big'&&['findings','application'].includes(i.path[0])?'Usa un máximo de 2000 caracteres en cada respuesta.':labels[i.path[0]]||'Revisa el enlace y los datos del formulario.'))].join(' '));
}
function createFeedbackService(s){
 async function hostAccess(db,user){await requireApproved(user);const c=await s.config(db);if(user.role!=='QORI_SUPERADMIN'&&!(c.settings.attendance_owner==='HOST'&&c.settings.host_ids.includes(user.id)))throw forbidden('Solo Administración o un anfitrión autorizado puede abrir el formulario de cierre.');}
 async function formResult(f,session){const url=new URL('/demostraciones/cierre.html#formulario='+f.token,env.publicAppUrl).toString();return {url,qr_data_url:await QRCode.toDataURL(url,{width:768,margin:4}),enabled:f.enabled,expires_at:f.expires_at,session_id:session.id};}
 async function feedbackForm(user,id,body){parse(uuid,id);const d=parse(z.object({action:z.enum(['OPEN','CLOSE'])}).strict(),body);
  const result=await s.tx(async db=>{await hostAccess(db,user);const session=await s.session(db,id);
   const existing=(await db.query('select * from qori_demo_feedback_forms where session_id=$1',[id])).rows[0];
   if(d.action==='CLOSE'){if(!existing)throw notFound('No hay un formulario abierto para esta sesión.');await db.query('update qori_demo_feedback_forms set enabled=false where session_id=$1',[id]);await s.event(db,'FEEDBACK_CLOSED',{session:id,actor:user.id,kind:'STAFF'});return {form:{...existing,enabled:false},session};}
   if(new Date(session.starts_at)>s.now()||['CANCELLED','DRAFT'].includes(session.status))throw badRequest('Abre el formulario al cerrar una demostración que ya haya comenzado.');
   if(existing?.enabled&&new Date(existing.expires_at)>s.now())return {form:existing,session};
   const token=crypto.randomBytes(32).toString('base64url'),expires=new Date(s.now().getTime()+86400000);
   const form=(await db.query(`insert into qori_demo_feedback_forms(session_id,token,enabled,opened_at,expires_at,opened_by) values($1,$2,true,$3,$4,$5)
    on conflict(session_id) do update set token=excluded.token,enabled=true,opened_at=excluded.opened_at,expires_at=excluded.expires_at,opened_by=excluded.opened_by returning *`,[id,token,s.now(),expires,user.id])).rows[0];
   await s.event(db,'FEEDBACK_OPENED',{session:id,actor:user.id,kind:'STAFF',detail:{expires_at:expires}});return {form,session};
  });return formResult(result.form,result.session);
 }
 async function openForm(db,token){parse(tokenSchema,token);const f=(await db.query(`select f.*,s.starts_at,s.ends_at,s.status from qori_demo_feedback_forms f join qori_demo_sessions s on s.id=f.session_id where f.token=$1`,[token])).rows[0];
  if(!f||!f.enabled||new Date(f.expires_at)<=s.now()||new Date(f.starts_at)>s.now()||['DRAFT','CANCELLED'].includes(f.status))throw notFound('Este formulario no está disponible. Solicita al anfitrión el enlace de cierre de tu sesión.');return f;
 }
 async function feedbackLanding(token){return s.tx(async db=>{const f=await openForm(db,token);return {title:'Lo que te llevas de la demostración',starts_at:f.starts_at,ends_at:f.ends_at,expires_at:f.expires_at,zone:'America/Bogota'};});}
 async function submitFeedback(token,body){const d=parse(responseSchema,body);return s.tx(async db=>{const f=await openForm(db,token);await s.snapshot(db);
   // The session token and document correlate a self-report; they never grant access to a booking or its answers.
   let access=null;if(d.reservation_access){try{access=await s.lookupAccess(db,d.reservation_access);}catch{throw badRequest('No pudimos asociar la respuesta. Revisa tus datos y el enlace privado de tu reserva.');}}
   const matches=(await db.query(`select b.id,b.document_id,v.id visit_id,v.attendance,v.recorded_by from qori_demo_bookings b join qori_demo_visits v on v.booking_id=b.id
     where b.session_id=$1 and v.session_id=$1 and v.active and v.expected and b.status='CONFIRMED' and b.email=$2
     and (b.document_id=$3 or (b.document_id is null and b.id=$4))`,[f.session_id,d.email,d.document_id,access?.booking_id||null])).rows;
   if(matches.length!==1)throw badRequest('No pudimos asociar la respuesta. Revisa la cédula, el correo y la sesión. Si reservaste sin cédula, agrega tu enlace privado de reserva.');
   const matched=matches[0];
   const previous=(await db.query('select id from qori_demo_feedback where visit_id=$1',[matched.visit_id])).rows[0];
   if(previous)return {ok:true,message:'Gracias. Tu respuesta de cierre quedó registrada. El embajador responsable podrá consultarla.'};
   if(!matched.document_id){
    if((await db.query("select 1 from qori_demo_bookings where session_id=$1 and document_id=$2 and id<>$3 and status<>'CANCELLED'",[f.session_id,d.document_id,matched.id])).rowCount)throw badRequest('No pudimos asociar la respuesta. Solicita al anfitrión revisar tu reserva.');
    await db.query('update qori_demo_bookings set document_id=$2 where id=$1',[matched.id,d.document_id]);
   }
   const answers={interests:d.interests,findings:d.findings,application:d.application,questions:d.questions,next_step:d.next_step};
   await db.query(`insert into qori_demo_feedback(visit_id,booking_id,session_id,document_id,answers,consent,submitted_at) values($1,$2,$3,$4,$5,$6,$7)`,
    [matched.visit_id,matched.id,f.session_id,d.document_id,answers,{version:1,attended:true,sharing_accepted:true,purpose:'Confirmar participación y compartir intereses y hallazgos con Qori y el embajador responsable.',accepted_at:s.now().toISOString()},s.now()]);
   if(matched.attendance==='PENDING'&&!matched.recorded_by)await db.query("update qori_demo_visits set attendance='ATTENDED',attendance_source='FORM',recorded_at=$2 where id=$1",[matched.visit_id,s.now()]);
   const b=await s.booking(db,matched.id),c=await s.config(db);
   if(d.next_step==='NO_CONTACT')await db.query("update qori_demo_bookings set contact_stopped=true,followup_status='CLOSED' where id=$1",[b.id]);
   else if(!b.contact_stopped){const due=new Date(s.now().getTime()+c.settings.followup_hours*3600000);await db.query('update qori_demo_bookings set followup_due=coalesce(followup_due,$2) where id=$1',[b.id,due]);if(b.prospect_id)await db.query('update qori_sales_prospects set next_contact_at=coalesce(next_contact_at,$2) where id=$1',[b.prospect_id,due]);}
   await s.event(db,'FEEDBACK_SUBMITTED',{booking:b.id,session:f.session_id,kind:'PUBLIC',detail:{visit_id:matched.visit_id,attendance_source:'FORM',staff_attendance_preserved:!!matched.recorded_by}});
   return {ok:true,message:'Gracias. Tu respuesta de cierre quedó registrada. El embajador responsable podrá consultarla.'};
  });
 }
 async function feedbackAnswers(user,id){parse(uuid,id);return s.tx(async db=>{await requireApproved(user);const b=await s.booking(db,id);if(!b)throw notFound();requireOwner(user,b.prospect_id?b.current_owner:b.owner_id);
   const responses=(await db.query(`select f.visit_id,f.session_id,f.document_id,f.answers,f.submitted_at,v.attendance,v.attendance_source,s.starts_at
    from qori_demo_feedback f join qori_demo_visits v on v.id=f.visit_id join qori_demo_sessions s on s.id=f.session_id where f.booking_id=$1 order by f.submitted_at desc`,[id])).rows;
   return {booking_id:id,responses};});}
 return {feedbackForm,feedbackLanding,submitFeedback,feedbackAnswers};
}
module.exports={createFeedbackService,documentSchema};

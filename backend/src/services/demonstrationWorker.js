'use strict';
const {env}=require('../config/env');
const {encrypt,decrypt,policy}=require('./demonstrationService');
function worker(service){
 async function tick(){
  if(!service.mailOperational())return {processed:0,disabled:true};
  let processed=0;
  // Each message is serialized with reservation changes; provider idempotency uses a stable key.
  for(let n=0;n<20;n++){
   const found=await service.tx(async db=>{
    const c=await service.config(db);if(!c.settings.email_enabled)return false;
    await service.snapshot(db);await service.generate(db,c);
    const m=(await db.query("select * from qori_demo_messages where status in('PENDING','FAILED') and due_at<=$1 and coalesce(next_attempt_at,due_at)<=$1 and attempts<5 order by due_at,id limit 1 for update",[service.now()])).rows[0];if(!m)return false;
    const b=await service.booking(db,m.booking_id),s=await service.session(db,b.session_id);
    const reminder=m.kind.startsWith('REMINDER');
    if(m.revision!==b.revision||(reminder&&(b.status!=='CONFIRMED'||s.status==='CANCELLED'||!s.meet_url||new Date(s.starts_at)<=service.now()))){await db.query("update qori_demo_messages set status='CANCELLED',encrypted_payload=null where id=$1",[m.id]);return true;}
    if(m.first_attempt_at&&service.now()-new Date(m.first_attempt_at)>23*3600000){await db.query("update qori_demo_messages set status='FAILED',attempts=5,last_error='Requiere revisión: venció la ventana segura de reintento.' where id=$1",[m.id]);return true;}
    let payload;
    if(m.encrypted_payload)payload=decrypt(m.encrypted_payload);
    else{
     let a=m.access_id?(await db.query('select * from qori_demo_access where id=$1 and expires_at>$2',[m.access_id,service.now()])).rows[0]:null;
     if(!a){a=await service.issueAccess(db,b.id);await db.query('update qori_demo_messages set access_id=$2 where id=$1',[m.id,a.id]);}else a.token=decrypt(a.encrypted_token);
     const url=new URL('/demostraciones/#reserva='+a.token,env.publicAppUrl).toString();
     const label=b.status==='CANCELLED'?'Reserva cancelada':b.status==='PENDING_CHANGE'?'Confirma el cambio de horario':b.status==='PENDING_CONFIRMATION'?'Confirma tu reserva':'Reserva confirmada';
     const text=[`Hola, ${b.contact_name}.`,`${policy.TITLE} — ${label}`,`Inicio: ${policy.dateLabel(s.starts_at)}.`, `Fin: ${policy.dateLabel(s.ends_at)}. Hora de Colombia.`,b.status==='CANCELLED'||s.status==='CANCELLED'?'Elige otra fecha desde tu invitación.':s.meet_url?`Entrar a Google Meet: ${s.meet_url}`:'El enlace Meet está en revisión. Consulta tu confirmación actualizada.',`Ver confirmación, aceptar cambios, reprogramar o cancelar: ${url}`,'Participar es gratuito y no activa ninguna suscripción ni compra.'].join('\n\n');
     payload={from:env.marketingMailFrom,to:[b.details.delivery_email||b.email],reply_to:env.contactRecipientEmail,subject:`${policy.TITLE} · ${reminder?'Recordatorio':label}`,text};
     await db.query('update qori_demo_messages set encrypted_payload=$2 where id=$1',[m.id,encrypt(payload)]);
    }
    try{const provider=await service.deliver(payload,'qori-demonstrations/'+m.id);await db.query("update qori_demo_messages set status='ACCEPTED',provider_id=$2,accepted_at=$3,attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,$3),encrypted_payload=null,last_error=null where id=$1",[m.id,provider,service.now()]);}
    catch{await db.query("update qori_demo_messages set status='FAILED',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,$2),next_attempt_at=$3,last_error='No se confirmó la aceptación del correo. La reserva sigue guardada.' where id=$1",[m.id,service.now(),new Date(service.now().getTime()+Math.min(60,2**m.attempts)*60000)]);}
    return true;
   });
   if(!found)break;processed++;
  }return {processed};
 }
 return {tick};
}
function start(){
 if(process.env.QORI_DEMO_EMAIL_ENABLED!=='true')return async()=>{};
 const w=worker(require('./demonstrationRuntime').service);let running=null;
 const timer=setInterval(()=>{if(!running)running=w.tick().catch(()=>console.error('Demonstrations worker: revisión requerida.')).finally(()=>{running=null;});},60000);timer.unref();
 return async()=>{clearInterval(timer);if(running)await running;};
}
module.exports={worker,start};

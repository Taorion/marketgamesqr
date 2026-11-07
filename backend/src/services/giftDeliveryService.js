const {query,withTransaction}=require('../config/db');
const {env}=require('../config/env');
const {notFound}=require('../utils/http');
const crypto=require('crypto');
const base=()=>env.publicAppUrl.replace(/\/$/,'');
function links(order){return {share_url:base()+'/customer/?gift='+order.id+'#invitations',receipt_url:order.receipt_token?base()+'/pense-en-ti/comprobante.html#'+order.receipt_token:null};}
async function invitation(db,o,recipient){
 if(o.invitation_id)return o.invitation_id;
 if((await db.query('select 1 from customer_business_blocks where customer_id=$1 and business_id=$2',[recipient.id,o.business_id])).rowCount)return null;
 const q=(await db.query('select expires_at,status from qr_codes where id=$1',[o.qr_code_id])).rows[0];
 if(!q||q.status!=='ACTIVE'||new Date(q.expires_at)<=new Date())return null;
 const i=(await db.query(`insert into customer_invitations(business_id,customer_id,created_by,request_id,kind,resource_id,title,message,terms,payload,expires_at)
  values($1,$2,$3,$4,'TICKET',$5,$6,$7,$8,$9::jsonb,$10) returning id`,[o.business_id,recipient.id,o.confirmed_by,o.id,o.qr_code_id,o.snapshot.product_name,o.buyer_name+' pensó en ti. '+(o.message||''),o.snapshot.terms,JSON.stringify({product_gift_order_id:o.id}),q.expires_at])).rows[0];
 await db.query('update customer_product_gift_orders set recipient_id=$2,invitation_id=$3 where id=$1',[o.id,recipient.id,i.id]);
 await require('./customerBenefitNotificationService').insert(db,{customer_id:recipient.id,business_id:o.business_id,event_key:'invitation:'+i.id+':PENDING',kind:'TICKET',title:'Alguien pensó en ti',body:o.snapshot.product_name,invitation_id:i.id});
 return i.id;
}
async function sync(account){
 await withTransaction(async db=>{
  const rows=(await db.query("select * from customer_product_gift_orders where state='ISSUED' and invitation_id is null and snapshot->>'recipient_email'=$1 order by id for update",[account.email.toLowerCase()])).rows;
  for(const o of rows)await invitation(db,o,account);
 });
}
async function queue(db,o,buyerEmail,recipientEmail){
 const l=links(o),name=(await db.query('select name from businesses where id=$1',[o.business_id])).rows[0].name;
 const invite=`${o.buyer_name} te regaló ${o.snapshot.product_name} en ${name}. ${o.message||''}\n\nPara disfrutarlo, inicia sesión o crea tu cuenta Qori Customer con el correo al que llegó esta invitación. Es gratis y también te ayuda a organizar tus ingresos, gastos y finanzas personales. Acepta la invitación y presenta tu ticket en el negocio.\n${l.share_url}\n\nCondiciones: ${o.snapshot.terms}\nSi no reconoces este regalo, puedes ignorar el mensaje.`;
 const receipt=`Tu regalo fue pagado y enviado.\nNegocio: ${name}\nProducto: ${o.snapshot.product_name}\nDestinatario: ${o.recipient_name}\nValor recibido: COP ${o.amount}\nComprobante: ${l.receipt_url}\n\nComparte este enlace con tu contacto: ${l.share_url}\nDebe entrar o crear su Customer gratis con su correo y aceptar el regalo. Customer también le ayuda a cuidar sus finanzas.\nEste es un comprobante de operación; no sustituye la factura del comercio.`;
 for(const [kind,email,subject,text] of [['RECIPIENT',recipientEmail,'Alguien pensó en ti · Tienes un regalo en Qori',invite],['BUYER',buyerEmail,'Tu comprobante y enlace para compartir el regalo · Qori',receipt]]){
  if(email)await db.query('insert into qori_gift_mail_outbox(order_id,kind,recipient,subject,body) values($1,$2,$3,$4,$5) on conflict(order_id,kind) do nothing',[o.id,kind,email,subject,text]);
 }
}
async function receipt(token){
 if(!/^[a-f0-9]{64}$/.test(token))throw notFound('Comprobante no disponible.');
 const row=(await query("select o.id,o.buyer_name,o.recipient_name,o.amount,o.paid_at,o.state,o.payment_reference,o.payment_method,o.snapshot,o.receipt_token,b.name business_name from customer_product_gift_orders o join businesses b on b.id=o.business_id where o.receipt_token=$1 and o.state='ISSUED'",[token])).rows[0];
 if(!row)throw notFound('Comprobante no disponible.');
 return {receipt:{id:row.id,business_name:row.business_name,buyer_name:row.buyer_name,recipient_name:row.recipient_name,amount:row.amount,paid_at:row.paid_at,payment_reference:row.payment_reference,payment_method:row.payment_method,product_name:row.snapshot.product_name,terms:row.snapshot.terms,...links(row)}};
}
async function processBatch(send=sendMail){
 const jobs=await withTransaction(async db=>(await db.query(`update qori_gift_mail_outbox set attempts=attempts+1,locked_until=now()+interval '2 minutes'
  where id in(select id from qori_gift_mail_outbox where sent_at is null and attempts<8 and next_attempt_at<=now() and (locked_until is null or locked_until<now()) order by created_at for update skip locked limit 10) returning *`)).rows);
 for(const job of jobs){try{await send(job);await query('update qori_gift_mail_outbox set sent_at=now(),locked_until=null,last_error=null where id=$1',[job.id]);}catch(e){await query("update qori_gift_mail_outbox set locked_until=null,last_error=$2,next_attempt_at=now()+interval '5 minutes' * attempts where id=$1",[job.id,String(e.message).slice(0,200)]);}}
 return jobs.length;
}
async function sendMail(job){
 const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+env.resendApiKey,'Content-Type':'application/json','Idempotency-Key':'qori-gift-'+job.id},body:JSON.stringify({from:env.contactMailFrom||env.marketingMailFrom,to:[job.recipient],subject:job.subject,text:job.body})});
 if(!r.ok)throw Error('Proveedor de correo: '+r.status);
}
function start(){if(!env.isProduction||!env.resendApiKey)return async()=>{};let running=null;const tick=()=>{if(!running)running=processBatch().catch(e=>console.error('Gift delivery worker:',e.message)).finally(()=>running=null);};const timer=setInterval(tick,15000);timer.unref();return async()=>{clearInterval(timer);if(running)await running;};}
module.exports={links,invitation,sync,queue,receipt,processBatch,start};

'use strict';
const {z}=require('zod');
const {validate}=require('../utils/validators');
const {requireSuperadmin}=require('./commercialAuthorization');
const {query}=require('../config/db');
// Only canonical prospect.business_id links identify a business; email/name matches are never business identity.
async function metrics(service,user,params={}){
 requireSuperadmin(user);const d=validate(z.object({from:z.string().date().default('2026-12-01'),to:z.string().date().default(service.now().toISOString().slice(0,10))}).strict(),params);
 const result=await service.tx(async db=>{
  await service.snapshot(db);const c=await service.config(db);
  const bookings=(await db.query(`select b.*,p.business_id from qori_demo_bookings b left join qori_sales_prospects p on p.id=b.prospect_id where b.created_at>=($1::date::timestamp at time zone 'America/Bogota') and b.created_at<(($2::date+1)::timestamp at time zone 'America/Bogota')`,[d.from,d.to])).rows;
  const ids=bookings.map(b=>b.id),visits=(await db.query('select v.*,s.starts_at,s.ends_at,s.status from qori_demo_visits v join qori_demo_sessions s on s.id=v.session_id where v.booking_id=any($1::uuid[])',[ids])).rows;
  const changes=(await db.query("select distinct booking_id,actor_kind from qori_demo_events where booking_id=any($1::uuid[]) and action in('RESCHEDULED','ADMIN_RESCHEDULED')",[ids])).rows;
  return {c,bookings,visits,changes};
 });
 const {c,bookings,visits,changes}=result,ended=visits.filter(v=>new Date(v.ends_at)<=service.now()&&v.status!=='CANCELLED'&&v.expected),attended=ended.filter(v=>v.attendance==='ATTENDED');
 const businesses=new Map();for(const b of bookings){if(!b.business_id)continue;let x=businesses.get(b.business_id);if(!x){x={id:b.business_id,prospect_id:b.prospect_id,first:new Date(b.created_at),attended_at:null};businesses.set(b.business_id,x);}if(new Date(b.created_at)<x.first)x.first=new Date(b.created_at);for(const v of attended.filter(v=>v.booking_id===b.id)){const at=new Date(v.starts_at);if(!x.attended_at||at<x.attended_at)x.attended_at=at;}}
 let paidReservations=0,paidAttendees=0,incomplete=0;const days=c.settings.conversion_days*86400000;
 for(const b of businesses.values()){
  if(service.now()<new Date(b.first.getTime()+days))incomplete++;
  // A conversion is historical: a later expiry must not erase a verified subscription purchase.
  // Reuse the closure's order validator, matching the purchased plan snapshot rather than today's plan.
  const orders=(await query("select * from qr_credit_purchase_orders where business_id=$1 and status='APPROVED' and credited_at is not null and price_cop>0",[b.id])).rows;
  const catalog=require('./subscriptionService').PLAN_CATALOG;
  const payments=orders.filter(o=>catalog[o.package_code]?.category==='subscription'&&Number(catalog[o.package_code]?.monthly_price_cop)>0&&require('./commercialClosureService').validPayment(o,{id:b.id},{plan_code:o.package_code})).map(o=>({paid_at:o.credited_at}));
  if(payments.some(p=>new Date(p.paid_at)>=b.first&&new Date(p.paid_at)<=new Date(b.first.getTime()+days)))paidReservations++;
  if(b.attended_at&&payments.some(p=>new Date(p.paid_at)>=b.attended_at&&new Date(p.paid_at)<=new Date(b.attended_at.getTime()+days)))paidAttendees++;
 }
 const due=bookings.filter(b=>b.followup_due&&new Date(b.followup_due)<=service.now());
 return {from:d.from,to:d.to,conversion_days:c.settings.conversion_days,definitions:{reservations:'Reservas originales de la cohorte por fecha de creación; excluye reenvíos y cambios.',attendance:'Asistencias registradas / visitas esperadas al inicio de sesiones terminadas. Pendientes separados.',reschedules:'Reservas originales con al menos un cambio / reservas originales; separado por actor.',conversion:'Negocios únicos con vínculo canónico y una compra de suscripción de pago aprobada y abonada dentro de la ventana, desde reserva o asistencia. Una expiración posterior no borra la conversión; un pago anulado no cuenta. Es correlación, no derecho a comisión.',followup:'Seguimientos completados a más tardar en su fecha / seguimientos vencidos.'},reservations:bookings.length,attendance:{attended:attended.length,absent:ended.filter(v=>v.attendance==='ABSENT').length,pending:ended.filter(v=>v.attendance==='PENDING').length,expected:ended.length},reschedules:{public:new Set(changes.filter(e=>e.actor_kind==='PUBLIC').map(e=>e.booking_id)).size,admin:new Set(changes.filter(e=>e.actor_kind==='ADMIN').map(e=>e.booking_id)).size,total:new Set(changes.map(e=>e.booking_id)).size,denominator:bookings.length},cancellations:{public:bookings.filter(b=>b.status==='CANCELLED'&&b.cancel_actor==='PUBLIC').length,admin:bookings.filter(b=>b.status==='CANCELLED'&&b.cancel_actor==='ADMIN').length,denominator:bookings.length},conversion:{paid_reservations:paidReservations,reservation_businesses:businesses.size,paid_attendees:paidAttendees,attendee_businesses:[...businesses.values()].filter(b=>b.attended_at).length,unidentified_reservations:bookings.filter(b=>!b.business_id).length,incomplete_businesses:incomplete},followup:{on_time:due.filter(b=>b.followup_completed_at&&new Date(b.followup_completed_at)<=new Date(b.followup_due)).length,due:due.length}};
}
module.exports={metrics};

const {planFromBusiness}=require('./subscriptionService');
const {activeTerms}=require('./commercialTerms');
const iso=value=>value&&Number.isFinite(new Date(value).getTime())?new Date(value).toISOString():null;
const day=86400000;

// Read-only projection of the same subscription dates that govern Empresa access.
// Neither ACTIVE nor a purchased ticket package proves payment for a SaaS plan.
function accountLifecycle(b,now=new Date()){
 const plan=planFromBusiness(b),terms=activeTerms(b,plan.code),sample=b.settings?.qori_descubre;
 const end=iso(plan.current_period_ends_at),payment=iso(b.last_subscription_paid_at);
 const commercialEnd=iso(terms?.trial_ends_at);
 const commercialTrial=Boolean(commercialEnd&&end&&new Date(end)<=new Date(commercialEnd));
 const currentTrial=plan.code==='DESCUBRE'||commercialTrial;
 const trialEnd=plan.code==='DESCUBRE'?end:(commercialEnd||iso(sample?.ends_at));
 const trialStart=iso(commercialEnd?terms?.benefits_starts_at:sample?.started_at)||(currentTrial?iso(plan.started_at):null);
 const hadTrial=Boolean(currentTrial||trialStart||trialEnd);
 const converted=Boolean(hadTrial&&!currentTrial&&payment&&trialStart&&new Date(payment)>=new Date(trialStart)&&plan.category==='subscription'&&plan.monthly_payment_required&&Number(plan.monthly_price_cop)>0);
 const remaining=trialEnd?Math.max(0,Math.ceil((new Date(trialEnd)-now)/day)):null;
 let phase='ACTIVE',label='Plan activo',tone='neutral',next='Revisa el uso del negocio y su próxima renovación.';
 if(b.is_active===false){phase='SUSPENDED';label='Negocio suspendido';tone='danger';next='Coordina con administración la reactivación.';}
 else if(['SUSPENDED','CANCELLED','CANCELED','INACTIVE'].includes(plan.raw_status)){phase='SUSPENDED';label=plan.raw_status.startsWith('CANCEL')?'Suscripción cancelada':'Suscripción suspendida';tone='danger';next='Revisa el estado de la cuenta con administración.';}
 else if(plan.lifetime_access){phase='LIFETIME';label='Convenio sin vencimiento';}
 else if(currentTrial){
  if(!trialEnd){phase='TRIAL_UNKNOWN';label='Freemium · fecha por definir';tone='warning';next='Solicita a administración revisar la fecha de vencimiento.';}
  else if(now>new Date(trialEnd)){phase='TRIAL_EXPIRED';label='Freemium vencido';tone='danger';next='Acompaña al negocio para contratar un plan y recuperar el acceso.';}
  else if(plan.raw_status!=='ACTIVE'){phase='PAYMENT_PENDING';label='Activación pendiente';tone='warning';next='Revisa la activación con administración.';}
  else if(remaining<=7){phase='TRIAL_ENDING';label='Freemium · vence pronto';tone='warning';next='Contacta al negocio antes del vencimiento para elegir su plan.';}
  else{phase='TRIAL_ACTIVE';label='Freemium activo';tone='info';next='Acompaña la prueba y prepara el paso a un plan pago.';}
 }else if(plan.raw_status==='PENDING_PAYMENT'){phase='PAYMENT_PENDING';label='Pago pendiente';tone='warning';next='Confirma con el negocio que complete el pago de su plan.';}
 else if(plan.access_status==='GRACE'){phase='RENEWAL_DUE';label='Renovación pendiente · en gracia';tone='warning';next='Gestiona la renovación antes de que termine el periodo de gracia.';}
 else if(!plan.portal_access_allowed&&plan.category==='subscription'){phase='EXPIRED';label='Suscripción vencida o bloqueada';tone='danger';next='Revisa la renovación y el estado de acceso.';}
 else if(plan.code==='PENSE_EN_TI'){phase='FREE';label='Cuenta gratuita permanente';next='Acompaña el uso de la cuenta; no tiene vencimiento de prueba.';}
 else if(payment&&plan.category==='subscription'&&Number(plan.monthly_price_cop)>0){phase='PAID_ACTIVE';label='Plan pago activo';tone='success';}
 else if(plan.category==='subscription'&&Number(plan.monthly_price_cop)>0){phase='ACTIVE_UNVERIFIED';label='Plan activo · sin pago registrado';next='El acceso activo no acredita un pago; revisa el acuerdo comercial.';}
 else if(plan.category!=='subscription'){phase='TICKETS';label='Acceso por tickets';}
 return {phase,label,tone,plan_code:plan.code,plan_name:plan.name,access_status:plan.access_status,
  access_allowed:b.is_active!==false&&plan.portal_access_allowed,started_at:iso(plan.started_at),
  current_period_ends_at:plan.lifetime_access?null:end,grace_period_ends_at:plan.grace_period_ends_at,
  days_until_due:plan.days_until_due,last_payment_at:payment,converted_to_paid:converted,
  trial:hadTrial?{started_at:trialStart,ends_at:trialEnd,days_remaining:currentTrial?remaining:null,
   status:converted?'CONVERTED':currentTrial?(trialEnd?(now>new Date(trialEnd)?'EXPIRED':'ACTIVE'):'UNKNOWN'):'ENDED'}:null,
  next_action:next,as_of:now.toISOString()};
}
module.exports={accountLifecycle};

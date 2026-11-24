'use strict';
const {z}=require('zod');
const TITLE='Qori - Ideas para tu negocio';
const DESCRIPTION='Descubre ideas prácticas para atraer clientes, organizar su seguimiento y motivarlos a volver a comprar. En esta demostración gratuita y sin compromiso verás, con ejemplos, cómo ejecutar estrategias con Qori y cuáles podrían servirle a tu negocio. Trae tus preguntas y una necesidad que quieras resolver. Te llevarás una idea concreta para poner en práctica, aunque decidas no suscribirte.';
const ZONE='America/Bogota';
const START='2026-12-01';
const DEFAULTS={mode:'GROUP',capacity:8,min_hours:2,horizon_days:15,additional_confirmation:false,email_enabled:false,reminder_hours:[24,1],attendance_owner:'ADMIN',host_ids:[],followup_hours:24,conversion_days:30,start_date:START,end_date:null};
const meet=z.string().regex(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/,'Usa el enlace canónico de Google Meet.').or(z.literal(''));
const settingsSchema=z.object({mode:z.enum(['GROUP','INDIVIDUAL']),capacity:z.number().int().min(1).max(500),min_hours:z.number().min(0).max(168),horizon_days:z.number().int().min(1).max(365),additional_confirmation:z.boolean(),email_enabled:z.boolean(),reminder_hours:z.array(z.number().min(0.1).max(168)).max(6),attendance_owner:z.enum(['ADMIN','HOST']),host_ids:z.array(z.string().uuid()).max(20),followup_hours:z.number().int().min(1).max(720),conversion_days:z.number().int().min(1).max(365),start_date:z.string().date().refine(v=>v>=START,'El inicio no puede ser anterior al 1 de diciembre de 2026.'),end_date:z.string().date().nullable()}).strict().refine(v=>!v.end_date||v.end_date>=v.start_date,'Revisa la fecha final.').refine(v=>v.mode!=='INDIVIDUAL'||v.capacity===1,'Una sesión individual debe tener cupo uno.');
function colombiaDate(value){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
function instant(date,time){return new Date(`${date}T${time}:00-05:00`);}
function dateLabel(value){return new Intl.DateTimeFormat('es-CO',{timeZone:ZONE,dateStyle:'full',timeStyle:'short'}).format(new Date(value));}
function available(s,c,now,count=0){const at=new Date(s.starts_at).getTime(),n=new Date(now).getTime(),date=colombiaDate(s.starts_at);return c.approved&&c.enabled&&date>=START&&date>=c.settings.start_date&&(!c.settings.end_date||date<=c.settings.end_date)&&s.status==='ENABLED'&&s.confirmed_template&&meet.safeParse(s.meet_url).success&&!!s.meet_url&&at>n&&at>=n+c.settings.min_hours*3600000&&at<=n+c.settings.horizon_days*86400000&&count<s.capacity;}
function recurrence(templates,settings,now){
 const from=colombiaDate(now),end=colombiaDate(new Date(new Date(now).getTime()+settings.horizon_days*86400000)),rows=[];
 for(let d=new Date(`${from}T12:00:00Z`);d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1)){
  const date=d.toISOString().slice(0,10);if(date<settings.start_date||date<START||(settings.end_date&&date>settings.end_date))continue;
  for(const t of templates.filter(t=>t.weekday===d.getUTCDay()))rows.push({template_id:t.id,local_date:date,starts_at:instant(date,t.local_time.slice(0,5)),ends_at:new Date(instant(date,t.local_time.slice(0,5)).getTime()+t.duration_minutes*60000),meet_url:t.meet_url,confirmed_template:t.confirmed,capacity:settings.capacity});
 }return rows;
}
module.exports={TITLE,DESCRIPTION,ZONE,START,DEFAULTS,meet,settingsSchema,colombiaDate,instant,dateLabel,available,recurrence};

const {query}=require('../config/db');
const {badRequest,forbidden,notFound}=require('../utils/http');
const {planFromBusiness}=require('./subscriptionService');
const {listActivationCatalog}=require('./interactiveActivationService');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isActivations=c=>c?.metadata?.redemption_mode==='ACTIVATIONS';
function typesFor(business){
 const plan=planFromBusiness(business);
 if(!plan.features.interactive_activations)throw forbidden('Tu plan no incluye activaciones.');
 return new Map(listActivationCatalog({allowedTypes:plan.limits?.allowed_interactive_activation_types}).items.map(a=>[a.type,a]));
}
async function validateConfig(db,businessId,payload){
 const business=(await db.query('select * from businesses where id=$1',[businessId])).rows[0];
 if(!business)throw notFound('Negocio no encontrado.');
 const types=typesFor(business),ids=payload.metadata.activation_ids;
 if(!Array.isArray(ids)||ids.length>50||ids.some(id=>typeof id!=='string'||!uuid.test(id))||new Set(ids).size!==ids.length)throw badRequest('Selecciona activaciones válidas de tu negocio.');
 if(payload.status==='ACTIVE'&&!ids.length)throw badRequest('Selecciona al menos una activación antes de publicar la vitrina.');
 const rows=(await db.query("select id,activation_type from interactive_activations where company_id=$1 and id=any($2::uuid[]) and status<>'archived'",[businessId,ids])).rows;
 if(rows.length!==ids.length)throw badRequest('Todas las activaciones deben pertenecer a este negocio y no estar eliminadas.');
 if(rows.some(a=>!types.has(a.activation_type)))throw forbidden('Una de las activaciones no está incluida en el plan actual.');
}
function benefitsFor(a,scoreRules=[],zones=[]){
 const config=a.reward_config||{};
 let rewards;
 if(a.activation_type==='QORI_SUMMIT')rewards=[config];
 else if(a.reward_mode==='by_score')rewards=scoreRules;
 else if(a.reward_mode==='by_position')rewards=zones;
 else if(a.reward_mode==='by_choice')rewards=Array.isArray(config.choices)?config.choices:[];
 else if(a.reward_mode==='by_profile')rewards=Array.isArray(config.profiles)?config.profiles:[];
 else if(a.reward_mode==='by_answer')rewards=Array.isArray(config.answer_rewards)?config.answer_rewards:[];
 else rewards=[config];
 const seen=new Set();
 return rewards.filter(r=>r.is_winner!==false&&r.reward_value?.is_winner!==false&&r.delivery_mode!=='none').map(r=>({
  label:String(r.reward_label||r.benefit_label||r.label||'').trim(),
  condition:a.reward_mode==='by_score'?`${Number(r.min_score||0)}${r.max_score==null?' o más':' a '+Number(r.max_score)} puntos`:null,
  terms:typeof r.reward_conditions==='string'?r.reward_conditions:null,
 })).filter(r=>{const key=JSON.stringify(r);if(!r.label||seen.has(key))return false;seen.add(key);return true;});
}
const goals={QORI_SUMMIT:'Llega al cofre en la cima. En multijugador, solo gana quien llegue primero.',TRIVIA_QUIZ:'Responde la trivia y alcanza la puntuación del beneficio.',SPACE_SHOOTER:'Derriba objetivos y suma puntos.',BREAKOUT:'Rompe los bloques y suma puntos.',SNAKE:'Guía la culebrita y suma puntos sin chocar.',MEMORY_PAIRS:'Encuentra las parejas para sumar puntos.',WHACK_A_MOLE:'Golpea los topos para sumar puntos.',DODGE_RUNNER:'Recoge frutas y evita los obstáculos.',ROULETTE_SPIN:'Gira la ruleta y descubre tu resultado.',SCRATCH_WIN:'Elige una casilla y raspa para descubrir tu resultado.',ORDER_OPTIONS:'Ordena correctamente la secuencia.',CONNECTORS:'Conecta las opciones correctas.',BATTLESHIP_COORDS:'Encuentra los barcos en el tablero.'};
async function activations(slug){
 const c=await require('./catalogShowcaseService').publicCatalog(slug);
 if(!isActivations(c))throw notFound('Vitrina de activaciones no disponible.');
 const types=typesFor(c.business),ids=Array.isArray(c.metadata.activation_ids)?c.metadata.activation_ids.filter(id=>typeof id==='string'&&uuid.test(id)):[];
 const rows=(await query(`select id,title,description,activation_type,category,public_slug,reward_mode,reward_config,game_config,terms,ends_at
  from interactive_activations where company_id=$1 and id=any($2::uuid[]) and status='active'
  and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
  order by array_position($2::uuid[],id)`,[c.business_id,ids])).rows.filter(a=>types.has(a.activation_type));
 const selected=rows.map(a=>a.id);
 const [scores,zones]=await Promise.all([
  query('select activation_id,min_score,max_score,reward_label,reward_conditions from interactive_score_reward_rules where activation_id=any($1::uuid[]) order by min_score',[selected]),
  query('select activation_id,reward_label,reward_conditions from interactive_touch_reward_zones where activation_id=any($1::uuid[])',[selected]),
 ]);
 return {catalog:{id:c.id,title:c.title,business_id:c.business_id,business_name:c.business.name},activations:rows.map(a=>({
  id:a.id,title:a.title,description:a.description,type:a.activation_type,type_label:types.get(a.activation_type).label,
  is_game:['minigame','touch'].includes(a.category)||a.activation_type==='TRIVIA_QUIZ',
  goal:goals[a.activation_type]||(a.reward_mode==='manual_approval'?'Completa la experiencia. El negocio revisa y aprueba el beneficio.':'Completa la experiencia y revisa las condiciones del beneficio.'),
  benefits:benefitsFor(a,scores.rows.filter(r=>r.activation_id===a.id),zones.rows.filter(r=>r.activation_id===a.id)),
  reward_mode:a.reward_mode,terms:a.terms,ends_at:a.ends_at,
  play_url:'/activacion/'+encodeURIComponent(a.public_slug),
 }))};
}
module.exports={isActivations,validateConfig,activations,benefitsFor};

const {query,withTransaction}=require('../config/db');
const {badRequest,notFound}=require('../utils/http');
const books=require('./customerFinanceBooks'),finance=require('./customerFinance');
const math=require('../../../customer-web/dream-math');
const today=a=>finance.dateKey(new Date(),a.timezone||'America/Bogota');
const amount=n=>(n/100).toFixed(2);
const columns='*,target_date::text target_date';
const conflict=()=>badRequest('El plan cambió en otra ventana. Actualiza y vuelve a intentar.');
function shape(g,day){const budget=g.budget_json||{base_amount:String(g.target)};return {...g,budget_json:budget,budget:math.budget(g.goal_type,budget),projection:math.projection(math.minor(g.target),math.minor(g.recorded_amount),math.minor(g.monthly_amount),day,g.target_date)};}
async function lock(a,db){await books.own(a,a.finance_book.id,db,true);}
async function own(a,id,db={query}){const g=(await db.query('select '+columns+' from customer_goals where customer_id=$1 and book_id=$2 and currency=$3 and id=$4 and not archived',[a.id,a.finance_book.id,a.finance_book.currency,id])).rows[0];if(!g)throw notFound('No se encontró el sueño en este bolsillo.');return g;}
async function plan(a,db={query}){return (await db.query('select * from customer_dream_plans where customer_id=$1 and book_id=$2',[a.id,a.finance_book.id])).rows[0]||{monthly_amount:'0',revision:0};}
async function bump(a,db){await db.query('insert into customer_dream_plans(customer_id,book_id) values($1,$2) on conflict(customer_id,book_id) do update set revision=customer_dream_plans.revision+1,updated_at=now()',[a.id,a.finance_book.id]);}
async function list(a){const day=today(a),p=await plan(a),rows=(await query('select '+columns+' from customer_goals where customer_id=$1 and book_id=$2 and currency=$3 and not archived order by priority,created_at,id',[a.id,a.finance_book.id,a.finance_book.currency])).rows;
 return {today:day,currency:a.finance_book.currency,plan:p,goals:rows.map(g=>shape(g,day)),schedule:math.portfolio(rows,math.minor(p.monthly_amount),day)};}
async function save(a,d,id){const calculated=math.budget(d.goal_type,d.budget_json);if(calculated.total_minor<=0)throw badRequest('Agrega al menos un importe a tu presupuesto.');if(calculated.total_minor>99999999999999)throw badRequest('El presupuesto es demasiado grande.');
 if(d.target_date)math.date(d.target_date);
 return withTransaction(async db=>{await lock(a,db);let g;
  if(id){g=await own(a,id,db);if(g.revision!==d.revision)throw conflict();}
  else{const retry=(await db.query('select '+columns+' from customer_goals where customer_id=$1 and request_id=$2',[a.id,d.request_id])).rows[0];if(retry){if(retry.book_id!==a.finance_book.id)throw badRequest('La solicitud pertenece a otro bolsillo.');return {goal:shape(retry,today(a))};}
   if((await db.query('select count(*)::int n from customer_goals where customer_id=$1 and book_id=$2 and not archived',[a.id,a.finance_book.id])).rows[0].n>=100)throw badRequest('Puedes mantener hasta 100 sueños activos por bolsillo.');}
  const values=[a.id,a.finance_book.id,d.name,a.finance_book.currency,amount(calculated.total_minor),d.goal_type,JSON.stringify(d.budget_json),d.target_date||null,d.monthly_amount,d.paused];
  if(id)g=(await db.query('update customer_goals set name=$3,currency=$4,target=$5,goal_type=$6,budget_json=$7::jsonb,target_date=$8,monthly_amount=$9,paused=$10,revision=revision+1,updated_at=now() where customer_id=$1 and book_id=$2 and id=$11 returning '+columns,[...values,id])).rows[0];
  else g=(await db.query('insert into customer_goals(customer_id,book_id,name,currency,target,goal_type,budget_json,target_date,monthly_amount,paused,request_id,priority) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,(select coalesce(max(priority),0)+1 from customer_goals where customer_id=$1 and book_id=$2)) returning '+columns,[...values,d.request_id])).rows[0];
  await bump(a,db);return {goal:shape(g,today(a))};
 });}
async function configure(a,d){return withTransaction(async db=>{await lock(a,db);const p=await plan(a,db);if(p.revision!==d.revision)throw conflict();await bump(a,db);await db.query('update customer_dream_plans set monthly_amount=$3 where customer_id=$1 and book_id=$2',[a.id,a.finance_book.id,d.monthly_amount]);return {plan:await plan(a,db)};});}
async function reorder(a,d){return withTransaction(async db=>{await lock(a,db);const p=await plan(a,db);if(p.revision!==d.revision)throw conflict();const rows=(await db.query('select id from customer_goals where customer_id=$1 and book_id=$2 and currency=$3 and not archived',[a.id,a.finance_book.id,a.finance_book.currency])).rows;if(rows.length!==d.ids.length||new Set(d.ids).size!==d.ids.length||rows.some(g=>!d.ids.includes(g.id)))throw badRequest('Actualiza la lista antes de cambiar el orden.');for(let i=0;i<d.ids.length;i++)await db.query('update customer_goals set priority=$4,revision=revision+1,updated_at=now() where customer_id=$1 and book_id=$2 and id=$3',[a.id,a.finance_book.id,d.ids[i],i]);await bump(a,db);return {ok:true};});}
async function progress(a,id,d){math.date(d.occurred_on);if(d.occurred_on>today(a))throw badRequest('Registra un ahorro que ya hayas separado, con fecha de hoy o anterior.');
 return withTransaction(async db=>{await lock(a,db);const g=await own(a,id,db);const old=(await db.query('select * from customer_goal_events where customer_id=$1 and request_id=$2',[a.id,d.request_id])).rows[0];if(old){if(old.goal_id!==id)throw badRequest('La solicitud ya se usó para otra meta.');return {goal:shape(g,today(a))};}if(g.revision!==d.revision)throw conflict();
 await db.query('insert into customer_goal_events(customer_id,goal_id,request_id,previous_amount,recorded_amount,occurred_on,note) values($1,$2,$3,$4,$5,$6,$7)',[a.id,id,d.request_id,g.recorded_amount,d.recorded_amount,d.occurred_on,d.note]);
 await db.query('update customer_goals set recorded_amount=$3,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2',[a.id,id,d.recorded_amount]);await bump(a,db);return {goal:shape(await own(a,id,db),today(a))};});}
async function detail(a,id){const g=await own(a,id);return {goal:shape(g,today(a)),events:(await query('select *,occurred_on::text occurred_on from customer_goal_events where customer_id=$1 and goal_id=$2 order by created_at desc,id desc limit 100',[a.id,id])).rows};}
async function archive(a,id,d){return withTransaction(async db=>{await lock(a,db);const g=await own(a,id,db);if(g.revision!==d.revision)throw conflict();await db.query('update customer_goals set archived=true,revision=revision+1,updated_at=now() where customer_id=$1 and id=$2',[a.id,id]);await bump(a,db);return {ok:true};});}
module.exports={list,save,configure,reorder,progress,detail,archive};

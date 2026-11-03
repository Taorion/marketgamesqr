// Fictitious, idempotent examples for the existing loopback QA account. Never production.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';
const {query,pool}=require('../backend/src/config/db'),crypto=require('crypto');
function id(key){const s=crypto.createHash('sha256').update('qori-finance-demo:'+key).digest('hex');return s.slice(0,8)+'-'+s.slice(8,12)+'-4'+s.slice(13,16)+'-8'+s.slice(17,20)+'-'+s.slice(20,32);}
(async()=>{
 const account=(await query("select * from customer_accounts where email='comprador-customer@example.test'")).rows[0];
 if(!account)throw Error('Create the existing Customer local demo account first.');
 const examples=[
  ['EXPENSE','Mercado de la semana · demo','supermercado','125000',1,'ESSENTIAL'],
  ['EXPENSE','Transporte al trabajo · demo','transporte','9500',2,'ESSENTIAL'],
  ['EXPENSE','Almuerzo · demo','alimentacion','24000',3,'ESSENTIAL'],
  ['EXPENSE','Cine con amigos · demo','entretenimiento','35000',4,'FLEXIBLE'],
  ['EXPENSE','Café y conversación · demo','alimentacion','16000',6,'FLEXIBLE'],
  ['EXPENSE','Una salida especial · demo','entretenimiento','48000',8,'FLEXIBLE'],
  ['INCOME','Ingreso mensual · demo','otros','1500000',2,'UNSET']
 ];
 // Keep examples within this month so the initial dashboard has a readable range.
 for(let i=0;i<examples.length;i++){
  const [kind,name,category,amount,days,priority]=examples[i];
  await query("insert into customer_entries(customer_id,kind,merchant,category,amount,currency,occurred_at,priority,note,request_id) values($1,$2,$3,$4,$5,'COP',greatest(date_trunc('month',now()),now()-($6::int*interval '1 day')),$7,'Ejemplo local ficticio. No corresponde a dinero real.',$8) on conflict(customer_id,request_id) do nothing",[account.id,kind,name,category,amount,days,priority,id(account.id+':entry:'+i)]);
 }
 await query("insert into customer_budgets(customer_id,category,period,currency,amount,threshold) values($1,'ALL','month','COP',350000,80) on conflict(customer_id,category,period,currency) do nothing",[account.id]);
 await query("insert into customer_goals(id,customer_id,name,currency,target,recorded_amount) values($1,$2,'Un viaje para recordar · demo','COP',2000000,650000) on conflict(id) do nothing",[id(account.id+':goal'),account.id]);
 await query("insert into customer_recurring(id,customer_id,name,amount,currency,kind,category,next_date,frequency) values($1,$2,'Internet de casa · demo',85000,'COP','EXPENSE','servicios',current_date,'month') on conflict(id) do nothing",[id(account.id+':recurring'),account.id]);
 console.log(JSON.stringify({demo:'Customer finance',manual_examples:examples.length,production:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());

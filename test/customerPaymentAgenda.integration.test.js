const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.JWT_SECRET='payment-agenda-qa';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const {query,pool}=require('../backend/src/config/db'),{app}=require('../backend/src/app');
const agenda=require('../backend/src/services/customerPaymentAgendaService'),push=require('../backend/src/services/customerPaymentPushService');
let server,base,buyer,other,rule,item;
async function account(){
 const a=(await query("insert into customer_accounts(email,full_name,currency,timezone) values($1,'Agenda QA','COP','America/Bogota') returning *",[crypto.randomUUID()+'@example.test'])).rows[0];
 const token=crypto.randomBytes(32).toString('base64url'),session=(await query("insert into customer_sessions(customer_id,token_hash,device_name,expires_at) values($1,$2,'QA',now()+interval '1 day') returning id",[a.id,crypto.createHash('sha256').update(token).digest('hex')])).rows[0];
 return {...a,session_id:session.id,token};
}
async function api(path,user=buyer,body,method=body?'POST':'GET'){
 const r=await fetch(base+'/api/customer'+path,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};
}
test('monthly obligations preserve estimates, payments, history and account isolation',async t=>{
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;buyer=await account();other=await account();
 await t.test('the 31st stays anchored across short months and plans do not create expenses',async()=>{
  assert.deepEqual(agenda.dates('2028-01-31','month','2028-03-31'),['2028-01-31','2028-02-29','2028-03-31']);
  assert.equal(agenda.cycleDate('2028-02-29','year',4),'2032-02-29');
  const r=await api('/recurring',buyer,{name:'Energía QA',amount:'120000',currency:'COP',kind:'EXPENSE',category:'servicios',frequency:'month',next_date:'2026-01-31',remind_days:3,reminders_enabled:true});
  assert.equal(r.status,200,JSON.stringify(r));rule=r.recurring;
  const d=await api('/payment-agenda?month=2026-03&currency=COP');assert.equal(d.status,200,JSON.stringify(d));
  assert.deepEqual(d.items.map(i=>i.scheduled_date),['2026-01-31','2026-02-28','2026-03-31']);item=d.items[2];
  assert.equal(d.summary.estimated_minor,12000000);assert.equal((await api('/dashboard')).total_minor,0);
  const again=await api('/payment-agenda?month=2026-03&currency=COP');assert.equal(again.items.length,3);
 });
 await t.test('a bill can change amount and due date without modifying the original estimate or other months',async()=>{
  const r=await api('/payment-agenda/'+item.id,buyer,{revision:item.revision,due_date:'2026-03-15',billed_amount:'128500',note:'Factura marzo'},'PUT');assert.equal(r.status,200,JSON.stringify(r));
  item=(await api('/payment-agenda/'+item.id)).item;assert.equal(Number(item.estimated_amount),120000);assert.equal(Number(item.billed_amount),128500);assert.equal(item.due_date,'2026-03-15');
  const d=await api('/payment-agenda?month=2026-03');assert.equal(d.items[0].billed_amount,null);assert.equal(d.summary.pending_minor,12850000);
  assert.equal((await api('/payment-agenda/'+item.id,buyer,{revision:1,due_date:'2026-03-16',billed_amount:'1',note:''},'PUT')).status,400);
 });
 await t.test('concurrent payment confirmation creates only one expense and requires a real past date',async()=>{
  assert.equal((await api('/payment-agenda/'+item.id+'/payment',buyer,{action:'PAY',revision:item.revision,amount:'128500',paid_on:'2099-01-01',confirmed:true})).status,400);
  const body={action:'PAY',revision:item.revision,amount:'128500',paid_on:'2026-03-14',confirmed:true};
  const result=await Promise.all([api('/payment-agenda/'+item.id+'/payment',buyer,body),api('/payment-agenda/'+item.id+'/payment',buyer,body)]);
  for(const r of result)assert.equal(r.status,200,JSON.stringify(r));assert.equal(result[0].entry_id,result[1].entry_id);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1',[buyer.id])).rows[0].n,1);
  item=(await api('/payment-agenda/'+item.id)).item;assert.equal(item.paid_on,'2026-03-14');assert.equal(item.status,'PAID');
  const d=await api('/dashboard?period=custom&from=2026-03-01&to=2026-03-31&currency=COP');assert.equal(d.total_minor,12850000);
 });
 await t.test('correction updates the same expense, preserves audit and blocks generic edits/deletion',async()=>{
  const before=item.entry_id,r=await api('/payment-agenda/'+item.id+'/payment',buyer,{action:'CORRECT',revision:item.revision,amount:'126000',paid_on:'2026-03-13',confirmed:true});assert.equal(r.status,200);
  const detail=await api('/payment-agenda/'+item.id);item=detail.item;assert.equal(item.entry_id,before);assert.equal(Number(item.actual_amount),126000);assert.equal(detail.changes[0].action,'CORRECT');
  assert.equal(Number(detail.changes[0].before_value.actual_amount),128500);
  assert.equal((await api('/entries/'+before,buyer,null,'DELETE')).status,400);
  assert.equal((await api('/entries/'+before)).entry.payment_item_id,item.id);
  assert.equal((await api('/dashboard?period=custom&from=2026-03-01&to=2026-03-31')).total_minor,12600000);
 });
 await t.test('another account cannot read, change or pay the obligation',async()=>{
  assert.equal((await api('/payment-agenda/'+item.id,other)).status,404);
  assert.equal((await api('/payment-agenda/'+item.id+'/payment',other,{action:'REOPEN',revision:item.revision,confirmed:true})).status,404);
  assert.equal((await api('/payment-agenda/'+item.id,other,{revision:item.revision,due_date:'2026-03-12',billed_amount:'1',note:''},'PUT')).status,404);
  assert.equal((await api('/payment-agenda?month=2026-03',other)).items.length,0);
 });
 await t.test('reopening removes the expense from totals without losing its audit and permits a single replacement',async()=>{
  assert.equal((await api('/payment-agenda/'+item.id+'/payment',buyer,{action:'REOPEN',revision:item.revision,confirmed:true})).status,200);
  assert.equal((await api('/dashboard?period=custom&from=2026-03-01&to=2026-03-31')).total_minor,0);
  item=(await api('/payment-agenda/'+item.id)).item;assert.equal(item.status,'PENDING');
  assert.equal((await api('/payment-agenda/'+item.id+'/payment',buyer,{action:'SKIP',revision:item.revision,confirmed:true})).status,200);
  item=(await api('/payment-agenda/'+item.id)).item;assert.equal(item.status,'SKIPPED');
  assert.equal((await api('/payment-agenda/'+item.id+'/payment',buyer,{action:'RESTORE',revision:item.revision,confirmed:true})).status,200);
  item=(await api('/payment-agenda/'+item.id)).item;assert.equal((await api('/payment-agenda/'+item.id+'/payment',buyer,{action:'PAY',revision:item.revision,amount:'128000',paid_on:'2026-03-15',confirmed:true})).status,200);
  assert.equal((await query('select count(*)::int n from customer_entries where customer_id=$1 and deleted_at is null',[buyer.id])).rows[0].n,1);
 });
 await t.test('future estimates can change while historical snapshots remain unchanged; paused rules keep history',async()=>{
  assert.equal((await api('/recurring/'+rule.id,buyer,{name:'Energía QA',amount:'130000',remind_days:5,reminders_enabled:true,active:true},'PUT')).status,200);
  const d=await api('/payment-agenda?month=2026-04');assert.equal(Number(d.items.find(i=>i.scheduled_date==='2026-04-30').estimated_amount),130000);
  assert.equal(Number((await api('/payment-agenda/'+item.id)).item.estimated_amount),120000);
  assert.ok((await api('/payment-agenda/notifications')).count>0);
  assert.equal((await api('/recurring/'+rule.id,buyer,null,'DELETE')).status,200);
  assert.equal((await api('/payment-agenda/notifications')).count,0);
  assert.equal((await api('/payment-agenda/'+item.id)).status,200);
 });
 await t.test('monthly reminder day can be configured privately, preserves the due date and names only pending obligations',async()=>{
  const date=agenda.today(other),day=Number(date.slice(8)),nextDay=day===1?2:1;
  const created=await api('/recurring',other,{name:'Seguridad social',amount:'400000',currency:'COP',kind:'EXPENSE',category:'salud',frequency:'month',next_date:date,remind_days:3,reminders_enabled:true,reminder_day:day});
  assert.equal(created.status,200,JSON.stringify(created));const rule=created.recurring;assert.equal(rule.reminder_day,day);
  let notice=await api('/payment-agenda/notifications',other);assert.equal(notice.count,1);assert.equal(notice.items[0].name,'Seguridad social');assert.equal(notice.items[0].amount,undefined);
  const update={name:rule.name,amount:'400000',remind_days:3,reminders_enabled:true,active:true,reminder_day:nextDay};
  assert.equal((await api('/recurring/'+rule.id,buyer,update,'PUT')).status,404);
  assert.equal((await api('/recurring/'+rule.id,other,update,'PUT')).status,200);
  assert.equal((await api('/payment-agenda/notifications',other)).count,0);
  await api('/recurring/'+rule.id,other,{...update,reminder_day:day},'PUT');
  const item=(await api('/payment-agenda',other)).items.find(i=>i.recurring_id===rule.id&&i.due_date===date);assert.ok(item);
  await api('/payment-agenda/'+item.id+'/payment',other,{revision:item.revision,action:'PAY',amount:'400000',paid_on:date,confirmed:true});
  assert.equal((await api('/payment-agenda/notifications',other)).count,0);
  assert.equal((await api('/recurring',other,{name:'Semanal',amount:'1',currency:'COP',kind:'EXPENSE',category:'otros',frequency:'week',next_date:date,reminder_day:5})).status,400);
 });
 await t.test('push delivery is private, deduplicated, and suppressed when the session is gone',async()=>{
  await query('update customer_recurring set active=true,reminders_enabled=true where id=$1',[rule.id]);
  const sub=(await query("insert into customer_payment_push_subscriptions(customer_id,session_id,endpoint,p256dh,auth) values($1,$2,$3,'qa','qa') returning id",[buyer.id,buyer.session_id,'https://fcm.googleapis.com/qa-'+crypto.randomUUID()])).rows[0];
  // Explicitly insert today's delivery so the test is independent of the local 09:00 schedule.
  await query("insert into customer_payment_push_deliveries(subscription_id,notice_date) values($1,(now() at time zone 'America/Bogota')::date)",[sub.id]);
  const sent=[];assert.equal(await push.processNext(async(s,p)=>sent.push(p)),true);assert.equal(sent.length,1);assert.equal(sent[0].public_id,buyer.public_id);assert.equal(sent[0].amount,undefined);
  assert.equal(await push.processNext(async(s,p)=>sent.push(p)),false);assert.equal(sent.length,1);
  await query('delete from customer_sessions where id=$1',[buyer.session_id]);
  assert.equal((await query('select count(*)::int n from customer_payment_push_subscriptions where id=$1',[sub.id])).rows[0].n,0);
 });
 await t.test('notification identity persists without exposing its private key to the buyer',async()=>{
  const previous=process.env.NODE_ENV;process.env.NODE_ENV='development';
  try{const first=await push.settings(other),again=await push.settings(other);assert.equal(first.configured,true);assert.equal(first.public_key,again.public_key);assert.equal(first.private_key,undefined);assert.match(first.public_key,/^[A-Za-z0-9_-]+$/);}finally{process.env.NODE_ENV=previous;}
 });
 await t.test('all agenda tables are protected from public Data API roles',async()=>{
  const tables=['customer_payment_items','customer_payment_changes','customer_payment_push_subscriptions','customer_payment_push_deliveries','customer_payment_push_config'];
  const r=await query('select relname,relrowsecurity from pg_class where relname=any($1)',[tables]);assert.equal(r.rowCount,5);assert.ok(r.rows.every(t=>t.relrowsecurity));
  const grants=await query("select count(*)::int n from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) acl left join pg_roles r on r.oid=acl.grantee where c.relname=any($1) and (acl.grantee=0 or r.rolname in ('anon','authenticated'))",[tables]);assert.equal(grants.rows[0].n,0);
 });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

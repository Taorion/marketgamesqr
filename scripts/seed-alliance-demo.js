/* Operator-only fixtures. Default: one rolled-back transaction. Never runs at startup.
 * --local uses the isolated QA database. --apply commits only the pinned demo tenants.
 * Existing services share this script's transaction; no alternate sales/credit ledger.
 */
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const SOURCE='qori_alliance_demo_20261124';
const DEMO_ID='5d24ac58-f0b8-4e22-8531-7c0de89b863a';
const key=s=>{const h=crypto.createHash('sha256').update(SOURCE+':'+s).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);};
async function run({local=false,apply=false}={}){
 if(local){process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_alliances_qa_v2';process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3057';process.env.JWT_SECRET='alliance-local-qa-only';}
 else require('dotenv').config({quiet:true});
 const moduleDB=require('../backend/src/config/db'),db=await moduleDB.pool.connect();
 const original={query:moduleDB.query,withTransaction:moduleDB.withTransaction};
 // Standalone process only. All service reads and nested transactions join this transaction.
 let queued=Promise.resolve();
 moduleDB.query=(sql,params)=>{const result=queued.then(()=>db.query(sql,params));queued=result.catch(()=>{});return result;};
 moduleDB.withTransaction=handler=>handler(db);
 const S=require('../backend/src/services/allianceService');
 const {redeemQr}=require('../backend/src/services/qrService');
 const {grantFirstSubscriptionCourtesyTickets}=require('../backend/src/services/qrCreditService');
 try{
  await db.query('begin');await db.query("set local lock_timeout='5s';set local statement_timeout='30s'");
  await db.query('select pg_advisory_xact_lock(hashtext($1))',[SOURCE]);
  const demo=(await db.query('select b.* from qori_seller_demo d join businesses b on b.id=d.business_id where d.singleton for update of b')).rows[0];
  assert.ok(demo?.is_seller_demo&&demo.slug==='demo-qori-seller'&&demo.is_active&&!demo.archived_at,'Only the existing active Demo Qori is allowed');
  if(!local)assert.equal(demo.id,DEMO_ID,'Unexpected production demo account');
  else assert.equal((await db.query('select current_database() n')).rows[0].n,'qori_alliances_qa_v2');
  const balance=async id=>Number((await db.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[id])).rows[0]?.qr_balance||0);
  async function actor(b){
   const email=b.slug+'-alliance-fixtures@demo-qori.invalid';
   let u=(await db.query('select * from app_users where email=$1',[email])).rows[0];
   if(!u)u=(await db.query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,$3,$4,'BUSINESS_OWNER') returning *",[b.id,email,'!no-login-'+crypto.randomBytes(32).toString('hex'),b.name+' · datos ficticios'])).rows[0];
   assert.equal(u.business_id,b.id);assert.equal(u.role,'BUSINESS_OWNER');return {...u,business:b};
  }
  async function partner(slug,name){
   let b=(await db.query('select * from businesses where slug=$1',[slug])).rows[0];
   if(!b)b=(await db.query("insert into businesses(name,slug,plan_code,subscription_status,settings) values($1,$2,'GLOBAL','ACTIVE',$3) returning *",[name,slug,{internal_account:true,alliance_demo:true,fixture_source:SOURCE,subscription:{lifetime_access:true,monthly_payment_required:false}}])).rows[0];
   assert.equal(b.settings.fixture_source,SOURCE);assert.equal(b.settings.alliance_demo,true);assert.equal(b.settings.internal_account,true);assert.ok(b.is_active&&!b.archived_at);
   const u=await actor(b);
   await grantFirstSubscriptionCourtesyTickets(db,{business_id:b.id,quantity:50,public_label:'Tickets ficticios de Alianzas',notes:'Dotación de demostración sin cobro · '+SOURCE,created_by_user_id:u.id});
   return u;
  }
  const owner=await actor(demo),naturista=await partner('demo-qori-alianzas-naturista','Naturista Vida · Demo'),panaderia=await partner('demo-qori-alianzas-panaderia','Panadería Origen · Demo');
  async function agreement(code,issuer,ally,changes,state='ACTIVE',quantity=0){
   const id=key('agreement:'+code);
   const now=Date.now();
   let a=await S.save(issuer,{ally_slug:ally.business.slug,rules:{name:'Demo · '+code,purpose:'Demostración con personas y compras ficticias. Sin valor comercial.',benefit_type:'FREE_GIFT',benefit_label:'Compra un pan de $12.000 y recibe un pan adicional de $3.000 · Demo',minimum_purchase:12000,terms:'Ejemplo de práctica, sin entrega de productos ni dinero real. Usa exclusivamente datos ficticios.',destination:issuer.business.name+' · establecimiento ficticio',starts_at:new Date(now-864e5).toISOString(),ends_at:new Date(now+180*864e5).toISOString(),ticket_valid_days:90,commission_type:'FIXED',commission_value:1000,settlement_terms:'Liquidación semanal de demostración. No se transfiere dinero.',...changes}});
   // Preserve the generated ID and keep the stable fixture key in the canonical audit event.
   await db.query("update qori_alliance_events set details=details||$2::jsonb where alliance_id=$1 and action='CREATED'",[a.id,{fixture_source:SOURCE,fixture_key:id}]);
   if(state!=='DRAFT'){await S.action(issuer,a.id,{action:'PROPOSE',revision:a.revision});a=(await S.detail(issuer,a.id)).alliance;}
   if(state==='ACTIVE'){
    await S.action(ally,a.id,{action:'ACCEPT',revision:a.revision});
    await S.personalize(ally,a.id,{display_name:ally.business.name,presentation:'Comercio ficticio para aprender Qori Alianzas.',message:'Un beneficio de demostración por venir de nuestra parte. No tiene valor comercial.',invitation:'Practica con un nombre y documento ficticios para recibir tu ticket demo.',logo_url:'https://gosqori.com/img/qori-logo-vf.png',collect_phone:false,collect_email:false});
    const beforeIssuer=await balance(issuer.business_id),beforeAlly=await balance(ally.business_id);
    await S.issue(issuer,a.id,{quantity,request_key:key('batch:'+code)});
    assert.equal(await balance(issuer.business_id),beforeIssuer-quantity);assert.equal(await balance(ally.business_id),beforeAlly);
   }
   return (await S.detail(issuer,a.id)).alliance;
  }
  async function getAgreement(code,issuer,ally,changes,state,quantity){
   const prior=(await db.query("select a.* from qori_alliances a join qori_alliance_events e on e.alliance_id=a.id where e.action='CREATED' and e.details->>'fixture_source'=$1 and e.details->>'fixture_key'=$2",[SOURCE,key('agreement:'+code)])).rows;
   assert.ok(prior.length<2);
   if(prior[0]){assert.equal(prior[0].issuer_id,issuer.business_id);assert.equal(prior[0].ally_id,ally.business_id);return prior[0];}
   return agreement(code,issuer,ally,changes,state,quantity);
  }
  async function example(a,issuer,code,name,amount,payment=0,voided=false){
   const document='DEMOAL'+code,request_key=key('enroll:'+code);
   const ticket=await S.enroll(a.public_token,{request_key,name:name+' · Demo',document_id:document,data_use_confirmed:true,marketing_issuer:false,marketing_ally:false});
   if(!amount)return {name,document,ticket_url:ticket.ticket_url,status:'Por canjear'};
   const qr=(await db.query('select status,sale_id from qr_codes where token=$1',[ticket.ticket_code])).rows[0];
   if(qr.status==='ACTIVE')await redeemQr(ticket.ticket_code,issuer,{idempotency_key:key('sale:'+code),mode:'PURCHASE',beneficiary:{name:name+' · Demo',document_id:document,data_use_confirmed:true,capture_source:'TICKET'},purchase:{subtotal:amount,currency:'COP',payment_method:'Simulado · sin cobro',product_or_service:'Pan de masa madre · Demo',line_items:[{name:'Pan de masa madre · Demo',quantity:1,unit_price:amount}]}});
   const c=(await db.query('select c.* from qori_alliance_commissions c join qori_alliance_tickets t on t.id=c.ticket_id where t.alliance_id=$1 and t.request_key=$2',[a.id,request_key])).rows[0];assert.ok(c);
   await db.query("update business_sales set metadata=metadata||$2::jsonb,notes=$3 where id=$1 and business_id=$4",[c.sale_id,{demo:true,fixture_source:SOURCE},'Venta ficticia de formación, sin cobro real.',issuer.business_id]);
   if(payment&&!((await db.query('select id from qori_alliance_payments where request_key=$1',[key('payment:'+code)])).rowCount))await S.pay(issuer,a.id,{commission_id:c.id,request_key:key('payment:'+code),amount:payment,paid_at:new Date().toISOString(),reference:'DEMO · pago ficticio '+code+' · sin transferencia'});
   if(voided){
    let result,error;
    await require('../backend/src/controllers/businessPortalController').voidAttributedSale({user:issuer,params:{saleId:c.sale_id},body:{reason:'Anulación de ejemplo ficticio. No hubo cobro ni devolución real.',idempotency_key:key('void:'+code)}},{json:r=>{result=r}},e=>{error=e});
    if(error)throw error;assert.equal(result.voided,true);
   }
   return {name,document,ticket_url:ticket.ticket_url,status:voided?'Compra anulada':payment?'Pago registrado':'Comisión pendiente'};
  }
  async function seed(){
   const sent=await getAgreement('Pan compartido',owner,naturista,{},'ACTIVE',20);
   const received=await getAgreement('Recomendación con 10%',panaderia,owner,{benefit_type:'FIXED_AMOUNT_DISCOUNT',benefit_amount:3000,benefit_label:'Recibe $3.000 de descuento en tu compra desde $12.000 · Demo',commission_type:'PERCENT',commission_value:10},'ACTIVE',15);
   const proposal=await getAgreement('Propuesta por aceptar',panaderia,owner,{commission_value:1500},'PROPOSED',0);
   const draft=await getAgreement('Mi primera alianza',owner,naturista,{},'DRAFT',0);
   const examples=[];
   for(const args of [[sent,owner,'001','Ana',12000,0],[sent,owner,'002','Mateo',12000,1000],[sent,owner,'003','Valentina',12000,400],[sent,owner,'004','Lucas',12000,1000,true],[sent,owner,'005','Sofía',0],[received,panaderia,'006','Camila',20000,1700],[received,panaderia,'007','Daniel',30000,0],[received,panaderia,'008','Juliana',0]])examples.push(await example(...args));
   const reports=[];
   for(const a of [sent,received,proposal,draft]){const d=await S.detail(owner,a.id);reports.push({id:a.id,name:d.alliance.rules.name,status:d.alliance.status,role:a.issuer_id===owner.business_id?'Emisor':'Aliado',totals:d.totals,tickets:d.tickets.length,commissions:d.commissions.length,capture_url:d.capture_url});}
   return {business:'Demo Qori',alliances:reports,examples};
  }
  const first=await seed();
  const snapshot=async()=>{const ids=[owner.business_id,naturista.business_id,panaderia.business_id];return {balances:(await db.query('select business_id,qr_balance,qr_used_total from business_qr_credit_accounts where business_id=any($1::uuid[]) order by business_id',[ids])).rows,sales:(await db.query("select id,sale_status,sale_amount from business_sales where business_id=any($1::uuid[]) and metadata->>'fixture_source'=$2 order by id",[ids,SOURCE])).rows};};
  const before=await snapshot(),second=await seed();assert.deepEqual(second,first,'Retry must not create or alter examples');assert.deepEqual(await snapshot(),before,'Retry must not debit credit or duplicate sales');
  assert.equal(before.sales.length,6);
  assert.deepEqual(first.alliances[0].totals,{earned:3000,paid:2400,pending:1600,recoverable:1000});
  assert.deepEqual(first.alliances[1].totals,{earned:4400,paid:1700,pending:2700,recoverable:0});
  await db.query(apply?'commit':'rollback');
  return {mode:apply?'applied':'dry-run-rolled-back',idempotency_verified:true,canonical_sales:before.sales.length,...first};
 }catch(e){await db.query('rollback');throw e;}finally{Object.assign(moduleDB,original);db.release();await moduleDB.pool.end();}
}
if(require.main===module)run({local:process.argv.includes('--local'),apply:process.argv.includes('--apply')}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.code||'ERROR',e.message);process.exitCode=1});
module.exports={run};

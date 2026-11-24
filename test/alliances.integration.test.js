const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('crypto');
// Deliberately independent of developer .env and hosted databases.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_alliances_qa_v2';
process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3057';process.env.JWT_SECRET='alliance-local-qa-only';
const {query,pool}=require('../backend/src/config/db');
const S=require('../backend/src/services/allianceService');
const {getQrDetails,redeemQr}=require('../backend/src/services/qrService');
const {rulesSchema}=require('../backend/src/services/allianceRules');
let owner,ally,third,validator,a,ticket,ticket2,commission,server,base;
const key=()=>crypto.randomUUID();
const rules={name:'Pan de masa madre',purpose:'Recomendaciones desde la tienda naturista',benefit_type:'FREE_GIFT',benefit_label:'Compra tu pan de $12.000 y recibe otro pan de $3.000',benefit_amount:0,minimum_purchase:12000,purchase_product_id:null,terms:'Una compra pagada. Beneficio personal, no acumulable.',destination:'Panadería Origen, Calle 12 # 3-45',branch_ids:[],starts_at:new Date(Date.now()-864e5).toISOString(),ends_at:new Date(Date.now()+30*864e5).toISOString(),ticket_valid_days:20,per_customer_limit:1,commission_type:'FIXED',commission_value:1000,commission_base:'NET_PAID',settlement_terms:'Liquidación semanal.',unused_policy:'RETURN_UNUSED'};
const branding={display_name:'Naturista Vida',presentation:'Alimentos de nuestra comunidad.',message:'Un beneficio por venir de nuestra parte.',invitation:'Completa tus datos y recibe tu ticket.',logo_url:'',collect_phone:false,collect_email:false};
const person=(doc=key().replace(/-/g,''))=>({request_key:key(),name:'Cliente Alianza',document_id:doc,phone:'',email:'',data_use_confirmed:true,marketing_issuer:false,marketing_ally:true});
async function business(name){const b=(await query("insert into businesses(name,slug,plan_code,subscription_status,settings) values($1,$2,'PRO','ACTIVE',$3) returning *",[name,'alliance-'+key(),{subscription:{lifetime_access:true,monthly_payment_required:false}}])).rows[0];
const u=(await query("insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,$3,$4,'BUSINESS_OWNER') returning *",[b.id,key()+'@example.test',require('bcryptjs').hashSync('Alianzas-QA-2026!',4),name])).rows[0];u.business=b;return u;}
async function fresh(){return (await S.detail(owner,a.id)).alliance;}
async function act(user,action,extra={}){a=await fresh();const r=await S.action(user,a.id,{action,revision:a.revision,...extra});a=await fresh();return r;}
async function balance(user){return Number((await query('select qr_balance from business_qr_credit_accounts where business_id=$1',[user.business_id])).rows[0]?.qr_balance||0);}
function checkout(t,extra={}){return {idempotency_key:key(),beneficiary:{name:'Cliente Alianza',document_id:t.document_id,data_use_confirmed:true,capture_source:'TICKET'},mode:'PURCHASE',purchase:{subtotal:12000,currency:'COP',payment_method:'Efectivo',product_or_service:'Pan de masa madre',line_items:[{name:'Pan de masa madre',quantity:1,unit_price:12000}]},...extra};}
test('Alianzas: real PostgreSQL, canonical tickets and paid sale integration',async t=>{
  await t.test('setup real businesses and existing credit accounts',async()=>{owner=await business('Panadería Origen');ally=await business('Naturista Vida');third=await business('Otro negocio');validator={...owner,role:'VALIDATOR'};
    await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,20,20),($2,7,7)',[owner.business_id,ally.business_id]);
    a=await S.save(owner,{ally_slug:ally.business.slug,rules});assert.equal(a.status,'DRAFT');});
  await t.test('rules validate dates, percentages and owned products',async()=>{
    assert.equal(rulesSchema.safeParse({...rules,commission_type:'PERCENT',commission_value:101}).success,false);
    await assert.rejects(()=>S.save(owner,{ally_slug:ally.business.slug,rules:{...rules,purchase_product_id:key()}}),/producto/);
    await assert.rejects(()=>S.issue(owner,a.id,{quantity:2,request_key:key()}),/Acepta/);
    await assert.rejects(()=>S.detail(third,a.id),/no encontrada/);
    await assert.rejects(()=>S.action(owner,a.id,{action:'ACCEPT',revision:a.revision}),/aliado/);
  });
  await t.test('demonstration partners cannot connect to real businesses',async()=>{
    const demo=await business('Aliado ficticio');
    await query("update businesses set settings=settings||'{\"internal_account\":true,\"alliance_demo\":true}'::jsonb where id=$1",[demo.business_id]);
    await assert.rejects(()=>S.lookup(owner,demo.business.slug),/demostración/);
    await assert.rejects(()=>S.lookup(demo,owner.business.slug),/demostración/);
    await assert.rejects(()=>S.save(owner,{ally_slug:demo.business.slug,rules}),/demostración/);
    assert.equal((await S.context(demo)).demo_mode,true);assert.equal((await S.context(owner)).demo_mode,false);
  });
  await t.test('mutual acceptance then customization',async()=>{await act(owner,'PROPOSE');await act(ally,'ACCEPT');await S.personalize(ally,a.id,branding);assert.equal((await S.publicAgreement(a.public_token)).accepting,false);});
  await t.test('concurrent batch retries debit issuer once and never credit ally',async()=>{
    const request_key=key();const b=await Promise.all([1,2,3].map(()=>S.issue(owner,a.id,{quantity:3,request_key})));assert.equal(new Set(b.map(x=>x.id)).size,1);assert.equal(await balance(owner),17);assert.equal(await balance(ally),7);
    await assert.rejects(()=>S.issue(owner,a.id,{quantity:100,request_key:key()}),/insuficiente/);assert.equal(await balance(owner),17);
    await assert.rejects(()=>S.issue(ally,a.id,{quantity:1,request_key:key()}),/emisor/);
    const q=(await query("select count(*)::int n from business_qr_credit_ledger where business_id=$1 and notes like 'Alianzas%'",[owner.business_id])).rows[0];assert.equal(q.n,1);
  });
  await t.test('read does not consume; public contract never contains agreement finances',async()=>{
    const d=await S.publicAgreement(a.public_token);assert.equal(d.available,3);const raw=JSON.stringify(d);assert.doesNotMatch(raw,/commission|settlement|original_amount|unused_policy/);assert.equal(await balance(owner),17);
  });
  await t.test('parallel signup retries deliver one unique ticket and create scoped CRM contacts',async()=>{
    const data=person();const results=await Promise.all([1,2,3,4].map(()=>S.enroll(a.public_token,data)));assert.equal(new Set(results.map(x=>x.ticket_code)).size,1);ticket={...results[0],document_id:data.document_id};assert.equal(await balance(owner),17);assert.equal(await balance(ally),7);
    const contacts=await query("select business_id,metadata from players where document_id=$1 and business_id=any($2::uuid[])",[data.document_id,[owner.business_id,ally.business_id]]);assert.equal(contacts.rowCount,2);assert.ok(contacts.rows.every(p=>p.metadata.alliance_origin.alliance_id===a.id));
    assert.doesNotMatch(JSON.stringify(results[0]),/commission|settlement|document_key|request_hash/);
    await assert.rejects(()=>S.enroll(a.public_token,{...data,request_key:key()}),/límite/);
    await assert.rejects(()=>S.enroll(a.public_token,{...data,name:'Impersonator'}),/otros datos/);
  });
  await t.test('concurrent depletion allocates exactly the available tickets',async()=>{
    const inputs=[person(),person(),person(),person()];const r=await Promise.allSettled(inputs.map(p=>S.enroll(a.public_token,p)));assert.equal(r.filter(x=>x.status==='fulfilled').length,2);
    const ix=r.findIndex(x=>x.status==='fulfilled');ticket2={...r[ix].value,document_id:inputs[ix].document_id};
    assert.equal((await S.publicAgreement(a.public_token)).available,0);assert.equal(await balance(owner),17);
  });
  await t.test('scan is read-only for commissions; unauthorized and standalone redemptions fail',async()=>{
    const d=await getQrDetails(ticket.ticket_code,owner);assert.equal(d.allowed,true);assert.equal(d.alliance.ally_name,'Naturista Vida');assert.equal((await S.detail(owner,a.id)).commissions.length,0);
    assert.equal((await getQrDetails(ticket.ticket_code,ally)).allowed,false);
    await assert.rejects(()=>redeemQr(ticket.ticket_code,ally,checkout(ticket)),/otro negocio/);
    await assert.rejects(()=>redeemQr(ticket.ticket_code,owner,checkout(ticket,{mode:'STANDALONE'})),/compra/);
    await assert.rejects(()=>redeemQr(ticket.ticket_code,owner,checkout({...ticket,document_id:'WRONG123'})),/personal|identidad/);
    const invalid=checkout(ticket);invalid.purchase.branch_id=key();await assert.rejects(()=>redeemQr(ticket.ticket_code,owner,invalid),/Sucursal/);
  });
  await t.test('paid redemption records exactly one canonical sale and commission under retries',async()=>{
    const payload=checkout(ticket);const r=await Promise.all([redeemQr(ticket.ticket_code,owner,payload),redeemQr(ticket.ticket_code,owner,payload)]);assert.ok(r.some(x=>x.idempotent_replay));
    const d=await S.detail(owner,a.id);assert.equal(d.commissions.length,1);commission=d.commissions[0];assert.equal(Number(commission.amount),1000);
    const sales=await query('select * from business_sales where id=$1',[commission.sale_id]);assert.equal(sales.rowCount,1);assert.equal(sales.rows[0].sale_status,'PAID');assert.equal(sales.rows[0].metadata.source_module,'qori_alliances');
    await assert.rejects(()=>redeemQr(ticket.ticket_code,owner,checkout(ticket)),/redimido/);
    assert.equal((await S.detail(ally,a.id)).totals.pending,1000);
  });
  await t.test('payments are separate, idempotent and issuer-only',async()=>{
    const payment={request_key:key(),commission_id:commission.id,amount:1000,paid_at:new Date().toISOString(),reference:'Transferencia QA'};
    await assert.rejects(()=>S.pay(ally,a.id,payment),/emisor/);
    const r=await Promise.all([S.pay(owner,a.id,payment),S.pay(owner,a.id,payment)]);assert.equal(r[0].id,r[1].id);assert.equal((await S.detail(owner,a.id)).totals.pending,0);
    await assert.rejects(()=>S.pay(owner,a.id,{...payment,request_key:key()}),/supera/);
  });
  await t.test('partial refund and void follow canonical sale, retain overpayment evidence',async()=>{
    await query('update business_sales set sale_amount=6000 where id=$1',[commission.sale_id]);let d=await S.detail(owner,a.id);assert.equal(d.totals.earned,500);assert.equal(d.totals.recoverable,500);
    await query("update business_sales set sale_status='VOIDED' where id=$1",[commission.sale_id]);d=await S.detail(owner,a.id);assert.equal(d.totals.earned,0);assert.equal(d.totals.recoverable,1000);
    const p=d.payments[0];await Promise.all([S.reversePayment(owner,a.id,p.id,'Registro incorrecto QA'),S.reversePayment(owner,a.id,p.id,'Registro incorrecto QA')]);assert.equal((await S.detail(owner,a.id)).totals.paid,0);
  });
  await t.test('accepted revisions preserve issued snapshots and refund only unused stock',async()=>{
    await S.issue(owner,a.id,{quantity:4,request_key:key()});assert.equal(await balance(owner),13);
    a=await fresh();await S.save(owner,{rules:{...rules,benefit_label:'Nuevo beneficio',commission_value:2500},revision:a.revision},a.id);
    assert.equal((await S.publicTicket(ticket2.ticket_url.split('=')[1])).benefit_label,rules.benefit_label);
    await act(ally,'ACCEPT');assert.equal(await balance(owner),17);
    await redeemQr(ticket2.ticket_code,owner,checkout(ticket2));const d=await S.detail(owner,a.id);assert.equal(d.commissions.find(c=>c.id!==commission.id).original_amount,'1000.00');
    await assert.rejects(()=>S.remove(owner,a.id),/historial/);
  });
  await t.test('pause and cancel stop enrollment, preserve delivered tickets and refund once',async()=>{
    await S.issue(owner,a.id,{quantity:2,request_key:key()});await act(ally,'PAUSE');await assert.rejects(()=>S.enroll(a.public_token,person()),/disponible/);await act(owner,'RESUME');await act(ally,'ACCEPT');
    const before=await balance(owner);await act(owner,'CANCEL',{reason:'Fin del piloto'});assert.equal(await balance(owner),before+2);await act(owner,'CANCEL',{reason:'Reintento de cierre'});assert.equal(await balance(owner),before+2);
    const row=(await query('select t.id from qori_alliance_tickets t join qr_codes q on q.id=t.qr_code_id where t.alliance_id=$1 and q.status=\'ACTIVE\'',[a.id])).rows[0];
    await S.cancelTicket(owner,a.id,row.id,'Ticket entregado por error');assert.equal((await S.detail(owner,a.id)).tickets.find(t=>t.id===row.id).status,'CANCELLED');
  });
  await t.test('new private tables are inaccessible to browser DB roles',async()=>{
    const c=await pool.connect();try{await c.query('begin');await c.query('set local role anon');await assert.rejects(()=>c.query('select * from qori_alliance_commissions'),/permission denied/);}finally{await c.query('rollback');c.release();}
    const q=await query("select relname,relrowsecurity from pg_class where relname in ('qori_alliances','qori_alliance_batches','qori_alliance_tickets','qori_alliance_commissions','qori_alliance_payments','qori_alliance_events')");assert.equal(q.rowCount,6);assert.ok(q.rows.every(r=>r.relrowsecurity));
  });
  async function activate(r={}){
    let agreement=await S.save(owner,{ally_slug:ally.business.slug,rules:{...rules,...r}});
    await S.action(owner,agreement.id,{action:'PROPOSE',revision:agreement.revision});agreement=(await S.detail(owner,agreement.id)).alliance;
    await S.action(ally,agreement.id,{action:'ACCEPT',revision:agreement.revision});await S.personalize(ally,agreement.id,branding);
    return (await S.detail(owner,agreement.id)).alliance;
  }
  await t.test('percentage commissions use the agreed net or subtotal and discounts apply canonically',async()=>{
    for(const [commission_base,expected] of [['NET_PAID',900],['SUBTOTAL',1200]]){
      const ag=await activate({commission_type:'PERCENT',commission_value:10,commission_base,benefit_type:'FIXED_AMOUNT_DISCOUNT',benefit_amount:3000,benefit_label:'Descuento de $3.000'});
      await S.issue(owner,ag.id,{quantity:1,request_key:key()});const p=person();const out=await S.enroll(ag.public_token,p);
      await redeemQr(out.ticket_code,owner,checkout({...out,document_id:p.document_id}));const d=await S.detail(owner,ag.id);
      assert.equal(d.totals.earned,expected);assert.equal(Number(d.commissions[0].sale_amount),9000);
    }
  });
  await t.test('consent cannot be skipped and private fields cannot be submitted to the public API',async()=>{
    const ag=await activate();await S.issue(owner,ag.id,{quantity:1,request_key:key()});
    await assert.rejects(()=>S.enroll(ag.public_token,{...person(),data_use_confirmed:false}));
    await assert.rejects(()=>S.enroll(ag.public_token,{...person(),commission_value:0}));
    assert.equal((await S.publicAgreement(ag.public_token)).available,1);
  });
  await t.test('owned product and branch restrictions are enforced even with a forged cart name',async()=>{
    const product=(await query("insert into business_inventory_products(business_id,internal_id,name,unit_price,stock_quantity) values($1,$2,'Pan especial',12000,20) returning *",[owner.business_id,key()])).rows[0];
    const branch=(await query("insert into branches(business_id,name,slug) values($1,'Sede centro',$2) returning *",[owner.business_id,key()])).rows[0];
    const ag=await activate({purchase_product_id:product.id,branch_ids:[branch.id]});await S.issue(owner,ag.id,{quantity:1,request_key:key()});const p=person(),out=await S.enroll(ag.public_token,p);
    const payload=checkout({...out,document_id:p.document_id});payload.purchase.line_items[0].name='Pan especial';
    await assert.rejects(()=>redeemQr(out.ticket_code,owner,payload),/sucursal/);
    payload.purchase.branch_id=branch.id;await assert.rejects(()=>redeemQr(out.ticket_code,owner,payload),/producto requerido/);
    payload.purchase.line_items[0].inventory_product_id=product.id;await redeemQr(out.ticket_code,owner,payload);assert.equal((await S.detail(owner,ag.id)).totals.earned,1000);
  });
  await t.test('included credits return only within their original period',async()=>{
    for(const expire of [false,true]){
      await query("update business_qr_credit_accounts set qr_balance=10,included_balance=4,included_period_key='ALLIANCE_QA_PERIOD_A' where business_id=$1",[owner.business_id]);
      const ag=await activate();await S.issue(owner,ag.id,{quantity:5,request_key:key()});assert.equal(await balance(owner),5);
      if(expire)await query("update business_qr_credit_accounts set included_period_key='ALLIANCE_QA_PERIOD_B' where business_id=$1",[owner.business_id]);
      await S.action(owner,ag.id,{action:'CANCEL',revision:ag.revision,reason:'Cerrar cupo'});
      const account=(await query('select * from business_qr_credit_accounts where business_id=$1',[owner.business_id])).rows[0];
      assert.equal(account.qr_balance,expire?6:10);assert.equal(account.included_balance,expire?0:4);
    }
  });
  await t.test('no-refund policy retires unused units without crediting either account',async()=>{
    const ag=await activate({unused_policy:'NO_REFUND'}),before=await balance(owner),allyBefore=await balance(ally);
    await S.issue(owner,ag.id,{quantity:2,request_key:key()});await S.action(owner,ag.id,{action:'CANCEL',revision:ag.revision,reason:'Cerrar cupo'});
    assert.equal(await balance(owner),before-2);assert.equal(await balance(ally),allyBefore);assert.equal((await S.detail(owner,ag.id)).batches[0].retired,2);
  });
  await t.test('stale changes cannot overwrite agreements and drafts can be removed',async()=>{
    const draft=await S.save(owner,{ally_slug:ally.business.slug,rules});await S.save(owner,{rules,revision:draft.revision},draft.id);
    await assert.rejects(()=>S.save(owner,{rules,revision:draft.revision},draft.id),/cambió/);
    await S.remove(owner,draft.id);await assert.rejects(()=>S.detail(owner,draft.id),/no encontrada/);
  });
  await t.test('individual lot closure is tenant-safe, idempotent and keeps the other lot usable',async()=>{
    await query('update business_qr_credit_accounts set qr_balance=10,included_balance=0 where business_id=$1',[owner.business_id]);
    const ag=await activate(),b1=await S.issue(owner,ag.id,{quantity:2,request_key:key()});await S.issue(owner,ag.id,{quantity:3,request_key:key()});
    await assert.rejects(()=>S.returnBatch(third,ag.id,b1.id,'No corresponde'),/no encontrada/);
    await Promise.all([S.returnBatch(ally,ag.id,b1.id,'Devolver este lote'),S.returnBatch(ally,ag.id,b1.id,'Reintento de devolución')]);
    assert.equal(await balance(owner),7);assert.equal((await S.publicAgreement(ag.public_token)).available,3);
  });
  await t.test('HTTP authorization, UUID validation and private cache headers',async()=>{
    const {app}=require('../backend/src/app');server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
    const jwt=require('jsonwebtoken');const auth=u=>({Authorization:'Bearer '+jwt.sign({sub:u.id},process.env.JWT_SECRET)});
    let r=await fetch(base+'/api/business/alliances/context');assert.equal(r.status,401);
    r=await fetch(base+'/api/business/alliances/'+a.id,{headers:auth(third)});assert.equal(r.status,404);
    r=await fetch(base+'/api/business/alliances/'+a.id,{headers:auth(ally)});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
    r=await fetch(base+'/api/public/alliances/'+a.public_token);assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/commission|settlement/);
    r=await fetch(base+'/api/business/alliances/nope',{headers:auth(owner)});assert.equal(r.status,400);
    r=await fetch(base+'/alianzas/');assert.equal(r.status,200);assert.match(await r.text(),/Tu beneficio/);
  });
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();});

// Operator-only, pinned to Demo Qori. Defaults to a rolled-back preview.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');
const {pool}=require('../backend/src/config/db');
const {planFromBusiness}=require('../backend/src/services/subscriptionService');
const {createAffiliate}=require('../backend/src/services/affiliateService');
const {validateConfig}=require('../backend/src/services/catalogShowcaseService');
const businessId='5d24ac58-f0b8-4e22-8531-7c0de89b863a',source='demo_affiliates_stamps_20261119';
const examples=[['Sofía Demo','DEMO-AF-001',100],['Mateo Demo','DEMO-AF-002',650],['Valentina Demo','DEMO-AF-003',1500]];
async function seed(db){
 await db.query('select pg_advisory_xact_lock(hashtext($1))',[source]);
 const b=(await db.query('select * from businesses where id=$1 for update',[businessId])).rows[0];
 assert.ok(b?.is_seller_demo&&b.slug==='demo-qori-seller'&&b.is_active&&!b.archived_at,'Only the pinned active Demo Qori tenant is allowed');
 const plan=planFromBusiness(b);assert.ok(plan.portal_access_allowed&&plan.features.affiliates&&plan.features.stamp_cards&&plan.features.showcase);
 assert.ok(plan.limits.stamp_programs==null);assert.ok(plan.limits.showcases==null);
 const affiliates=[];
 for(const [name,document,points] of examples){
  let a=(await db.query('select * from affiliates where business_id=$1 and document_id=$2',[businessId,document])).rows[0];
  if(!a){
   a=await createAffiliate(businessId,{id:null,business_id:businessId,role:'BUSINESS_OWNER'},{full_name:name,document_id:document,notes:'Persona ficticia para demostraciones. No corresponde a un cliente real.',card_metadata:{demo:true,source}},{client:db});
   await db.query("insert into affiliate_point_ledger(business_id,affiliate_id,amount,points_awarded,reason,metadata) values($1,$2,0,$3,'Saldo inicial de demostración',$4)",[businessId,a.id,points,{demo:true,source}]);
   a=(await db.query('update affiliates set points_total=points_total+$3 where business_id=$1 and id=$2 returning *',[businessId,a.id,points])).rows[0];
  }
  assert.equal(a.card_metadata.source,source);assert.equal(a.full_name,name);assert.equal(a.status,'ACTIVE');
  affiliates.push({name,document,points:Number(a.points_total),url:'https://gosqori.com/carnet-afiliado/'+encodeURIComponent(a.qr_token)});
 }
 const programs=[];
 for(const [key,count,label] of [['TAZA',5,'Tus primeras 5 visitas'],['LIBRETA',8,'8 visitas, nuevas ideas'],['TERMO',10,'10 visitas para llevar']]){
  const product=(await db.query("select id,name from business_inventory_products where business_id=$1 and internal_id=$2 and status='ACTIVE'",[businessId,'DEMO-POINTS-'+key])).rows[0];assert.ok(product,'Create the demo inventory first');
  const name='Demo Qori · '+label,terms='Programa ficticio para mostrar el funcionamiento de Qori. No entrega mercancía real. Un sello por visita y por día.';
  let p=(await db.query('select * from stamp_programs where business_id=$1 and name=$2',[businessId,name])).rows[0];
  if(!p)p=(await db.query(`insert into stamp_programs(business_id,name,stamps_required,benefit_type,benefit_value,minimum_purchase,one_per_day,allow_manual,card_valid_days,ticket_valid_days,terms,status)
   values($1,$2,$3,'FREE_GIFT',$4,0,true,true,365,30,$5,'ACTIVE') returning *`,[businessId,name,count,{label:product.name,product_scope:{inventory_product_id:product.id,product_name:product.name,mode:'gift_product'}},terms])).rows[0];
  assert.equal(p.terms,terms);assert.equal(p.status,'ACTIVE');assert.equal(p.deleted_at,null);assert.equal(p.benefit_value.product_scope.inventory_product_id,product.id);
  programs.push({id:p.id,name:p.name,stamps:p.stamps_required});
 }
 const metadata={demo:true,source,redemption_mode:'STAMP_PROGRAMS',stamp_program_ids:programs.map(p=>p.id)};
 await validateConfig(db,businessId,{status:'ACTIVE',metadata});
 let catalog=(await db.query("select * from smart_catalogs where slug='demo-qori-sellos'")).rows[0];
 if(!catalog)catalog=(await db.query(`insert into smart_catalogs(business_id,title,slug,description,brand_name,brand_logo_url,cover_image_url,whatsapp_number,default_cta_label,theme_color,status,metadata)
  values($1,'Elige tu próximo premio','demo-qori-sellos','Elige un programa, crea tu tarjeta y descubre cómo se acumulan sellos. Programas ficticios de Demo Qori, sin entrega de mercancía real.','Demo Qori','/img/qori-logo-vf.png','/smart-catalog/demo-points/termo.webp','00000000','Quiero mi tarjeta','#0759d6','ACTIVE',$2) returning *`,[businessId,metadata])).rows[0];
 assert.equal(catalog.business_id,businessId);assert.deepEqual(catalog.metadata,metadata);assert.equal(catalog.status,'ACTIVE');
 return {business:'Demo Qori',affiliates,programs,catalog_url:'https://gosqori.com/c/demo-qori-sellos',qr_url:'https://gosqori.com/smart-catalog/acceso.html?catalogo=demo-qori-sellos'};
}
async function main(){const db=await pool.connect(),apply=process.argv.includes('--apply');try{
 await db.query('begin');await db.query("set local lock_timeout='5s';set local statement_timeout='30s'");
 const before=(await db.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[businessId])).rows;
 const first=await seed(db);assert.deepEqual(await seed(db),first,'Must preserve cards, balances and programs on retry');
 assert.deepEqual((await db.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[businessId])).rows,before,'Demo setup must not spend tickets');
 await db.query(apply?'commit':'rollback');console.log(JSON.stringify({mode:apply?'applied':'dry-run-rolled-back',idempotency_verified:true,...first}));
 }catch(e){await db.query('rollback');throw e;}finally{db.release();}}
main().catch(e=>{console.error(e.code||'ERROR',e.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[connection]'));process.exitCode=1;}).finally(()=>pool.end());

// Explicit operator command; never run automatically during application startup.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pool}=require('../backend/src/config/db');
const {planFromBusiness}=require('../backend/src/services/subscriptionService');
const {parseInventoryPhoto,saveInventoryPhoto}=require('../backend/src/services/inventoryPhotoService');
const {recordInventoryProductCreated}=require('../backend/src/services/lifecycleAuditService');
const businessId='5d24ac58-f0b8-4e22-8531-7c0de89b863a',slug='demo-qori-puntos',source='demo_points_showcase_20261118';
const products=[
 {key:'taza',name:'Taza azul · muestra',points:100,price:18000,description:'Taza de cerámica azul de 350 ml para acompañar tus pausas.'},
 {key:'libreta',name:'Libreta de ideas · muestra',points:200,price:25000,description:'Libreta de tapa dura azul con elástico para guardar tus ideas.'},
 {key:'bolsa',name:'Bolsa reutilizable · muestra',points:350,price:35000,description:'Bolsa de lona natural con asas azules para llevar lo esencial.'},
 {key:'termo',name:'Termo azul · muestra',points:500,price:55000,description:'Termo azul de acero inoxidable de 500 ml para acompañarte cada día.'},
];
const assetRoot=path.resolve(__dirname,'../smart-catalog/demo-points');
async function seed(db){
 await db.query('select pg_advisory_xact_lock(hashtext($1))',[source]);
 const b=(await db.query('select * from businesses where id=$1 for update',[businessId])).rows[0];
 assert.ok(b?.is_seller_demo&&b.slug==='demo-qori-seller'&&b.is_active&&!b.archived_at,'Only the pinned active Demo Qori tenant is allowed');
 const plan=planFromBusiness(b);assert.ok(plan.portal_access_allowed&&plan.features.showcase&&plan.features.affiliates&&plan.features.gift_inventory);
 assert.equal(plan.limits.gift_inventory_products,null);assert.equal(plan.limits.showcases,null);
 const category=(await db.query(`insert into business_product_categories(business_id,internal_id,name) values($1,'DEMO-POINTS','Premios de muestra') on conflict(business_id,lower(internal_id)) do nothing returning *`,[businessId])).rows[0]||(await db.query("select * from business_product_categories where business_id=$1 and internal_id='DEMO-POINTS'",[businessId])).rows[0];
 assert.equal(category.name,'Premios de muestra');
 const meta={demo:true,source,redemption_mode:'AFFILIATE_POINTS'};
 const catalog=(await db.query(`insert into smart_catalogs(business_id,title,slug,description,brand_name,brand_logo_url,cover_image_url,whatsapp_number,default_cta_label,theme_color,status,metadata)
 values($1,'Demo Qori · tus puntos, tus premios',$2,'Explora el canje por puntos con productos ficticios. Esta vitrina es una demostración: no ofrece mercancía real. Usa únicamente tu carné de Demo Qori.','Demo Qori','/img/qori-logo-vf.png','/smart-catalog/demo-points/termo.webp','00000000','Añadir al canje','#0759d6','ACTIVE',$3)
 on conflict(slug) do nothing returning *`,[businessId,slug,meta])).rows[0]||(await db.query('select * from smart_catalogs where slug=$1',[slug])).rows[0];
 assert.equal(catalog.business_id,businessId);assert.equal(catalog.metadata.source,source);assert.equal(catalog.metadata.redemption_mode,'AFFILIATE_POINTS');assert.equal(catalog.status,'ACTIVE');
 const result=[];
 for(const [index,p] of products.entries()){
  const photo=parseInventoryPhoto('data:image/webp;base64,'+fs.readFileSync(path.join(assetRoot,p.key+'.webp')).toString('base64'));
  const description=p.description+' Producto ficticio para practicar en Demo Qori. Imagen ilustrativa generada con IA; sin entrega de mercancía real.';
  const inventory=(await db.query(`insert into business_inventory_products(business_id,internal_id,name,description,category,category_id,brand,unit_price,price_before_tax,tax_classification,redemption_points_cost,stock_quantity,min_stock_quantity,unit_label,status,metadata)
   values($1,$2,$3,$4,$5,$6,'Demo Qori',$7,$7,'EXEMPT',$8,25,3,'unidad','ACTIVE',$9) on conflict(business_id,lower(internal_id)) do nothing returning *`,[businessId,'DEMO-POINTS-'+p.key.toUpperCase(),p.name,description,category.name,category.id,p.price,p.points,{demo:true,source,image_url:'/smart-catalog/demo-points/'+p.key+'.webp'}])).rows[0]||(await db.query('select * from business_inventory_products where business_id=$1 and internal_id=$2',[businessId,'DEMO-POINTS-'+p.key.toUpperCase()])).rows[0];
  assert.equal(inventory.metadata.source,source);assert.equal(inventory.redemption_points_cost,p.points);assert.equal(inventory.name,p.name);
  await saveInventoryPhoto(db,businessId,inventory.id,photo);
  await recordInventoryProductCreated({businessId,product:inventory,actorUserId:null,source:'DEMO_POINTS_SHOWCASE',metadata:{demo:true}},db);
  const product=(await db.query(`insert into smart_catalog_products(business_id,catalog_id,inventory_product_id,name,slug,product_type,description,short_description,category,price,image_url,stock_status,cta_label,display_order,is_featured,metadata)
   values($1,$2,$3,$4,$5,'physical',$6,$7,$8,$9,$10,'AVAILABLE','Añadir al canje',$11,$12,$13) on conflict(catalog_id,slug) do nothing returning *`,[businessId,catalog.id,inventory.id,p.name,p.key,description,p.description+' Muestra sin entrega real.',category.name,p.price,'/smart-catalog/demo-points/'+p.key+'.webp',index,index<2,{demo:true,source}])).rows[0]||(await db.query('select * from smart_catalog_products where catalog_id=$1 and slug=$2',[catalog.id,p.key])).rows[0];
  assert.equal(product.business_id,businessId);assert.equal(product.inventory_product_id,inventory.id);assert.equal(product.metadata.source,source);
  result.push({name:p.name,points:p.points,stock:Number(inventory.stock_quantity),inventory_id:inventory.id,product_id:product.id});
 }
 return {business:'Demo Qori',catalog_id:catalog.id,url:'https://gosqori.com/c/'+slug,products:result};
}
async function main(){
 const apply=process.argv.includes('--apply');
 if(apply)for(const p of products){const r=await fetch('https://gosqori.com/smart-catalog/demo-points/'+p.key+'.webp',{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,'Deploy images before publishing');assert.ok(Buffer.from(await r.arrayBuffer()).equals(fs.readFileSync(path.join(assetRoot,p.key+'.webp'))),'Deployed image differs');}
 const db=await pool.connect();try{await db.query('begin');await db.query("set local lock_timeout='5s'; set local statement_timeout='30s'");
 const before=(await db.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[businessId])).rows[0];
 const first=await seed(db),second=await seed(db);assert.deepEqual(second,first,'Repeated execution must preserve product IDs and stock');
 assert.deepEqual((await db.query('select qr_balance from business_qr_credit_accounts where business_id=$1',[businessId])).rows[0],before,'Seeding must not spend tickets');
 await db.query(apply?'commit':'rollback');console.log(JSON.stringify({mode:apply?'applied':'dry-run-rolled-back',idempotency_verified:true,...first}));
 }catch(e){await db.query('rollback');throw e;}finally{db.release();}
}
main().catch(e=>{console.error(e.code||'ERROR',e.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[connection]'));process.exitCode=1;}).finally(()=>pool.end());

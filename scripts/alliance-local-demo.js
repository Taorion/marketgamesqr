// Local-only, fictional fixtures. No production .env, notifications, payments or external writes.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_alliances_qa_v2';
process.env.DB_SSL='false';process.env.PUBLIC_APP_URL='http://127.0.0.1:3057';process.env.JWT_SECRET='alliance-local-qa-only';
process.env.PORT='3057';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const fs=require('fs');const path=require('path');const {query}=require('../backend/src/config/db');
const S=require('../backend/src/services/allianceService');
async function main(){
  const users=[];
  for(const [name,slug,email] of [['Panadería Origen','alianza-panaderia-qa','panaderia@alianzas.test'],['Naturista Vida','alianza-naturista-qa','naturista@alianzas.test']]){
    const b=(await query(`insert into businesses(name,slug,plan_code,subscription_status,settings) values($1,$2,'PRO','ACTIVE',$3)
      on conflict(slug) do update set name=excluded.name returning *`,[name,slug,{subscription:{lifetime_access:true,monthly_payment_required:false}}])).rows[0];
    const u=(await query(`insert into app_users(business_id,email,password_hash,full_name,role) values($1,$2,$3,$4,'BUSINESS_OWNER')
      on conflict(email) do update set password_hash=excluded.password_hash returning *`,[b.id,email,require('bcryptjs').hashSync('Alianzas-QA-2026!',6),name])).rows[0];
    await query('insert into business_qr_credit_accounts(business_id,qr_balance,qr_purchased_total) values($1,50,50) on conflict(business_id) do nothing',[b.id]);users.push({...u,business:b});
  }
  const [owner,ally]=users;
  let a=(await query('select * from qori_alliances where issuer_id=$1 and ally_id=$2 order by created_at limit 1',[owner.business_id,ally.business_id])).rows[0];
  if(!a){a=await S.save(owner,{ally_slug:ally.business.slug,rules:{name:'El buen pan se comparte',purpose:'Conectar clientes de la naturista con nuestra panadería artesanal.',benefit_type:'FREE_GIFT',benefit_label:'Compra tu pan de masa madre de $12.000 y recibe un pan adicional de $3.000',minimum_purchase:12000,terms:'Una compra pagada por ticket. Presenta tu documento. No acumulable con otras promociones.',destination:'Panadería Origen · Calle 12 # 3-45, Bogotá',starts_at:new Date(Date.now()-864e5).toISOString(),ends_at:new Date(Date.now()+30*864e5).toISOString(),commission_type:'FIXED',commission_value:1000,settlement_terms:'Pago semanal, cada viernes, por transferencia.'}});
    await S.action(owner,a.id,{action:'PROPOSE',revision:a.revision});a=(await S.detail(owner,a.id)).alliance;
    await S.action(ally,a.id,{action:'ACCEPT',revision:a.revision});
    await S.personalize(ally,a.id,{display_name:'Naturista Vida',presentation:'Sabores y comercios de nuestro barrio.',message:'Presenta tu ticket en Panadería Origen y recibe este beneficio por venir de nuestra parte.',invitation:'Completa este formulario y lleva contigo un beneficio especial.',logo_url:'',collect_phone:true,collect_email:false});
    await S.issue(owner,a.id,{quantity:10,request_key:require('crypto').randomUUID()});
  }
  fs.mkdirSync(path.join(__dirname,'../tmp'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'../tmp/alliance-demo.json'),JSON.stringify({alliance_id:a.id,capture_url:`http://127.0.0.1:3057/alianzas/#alianza=${a.public_token}`,owner_email:owner.email,ally_email:ally.email},null,2));
  const {app}=require('../backend/src/app');app.listen(3057,'127.0.0.1',()=>console.log('Local Alianzas demo: http://127.0.0.1:3057/empresa/?view=alliances'));
}
main().catch(e=>{console.error(e);process.exit(1);});

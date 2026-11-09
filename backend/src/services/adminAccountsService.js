const {z}=require('zod');
const {query,withTransaction}=require('../config/db');
const {validate}=require('../utils/validators');
const {badRequest,notFound}=require('../utils/http');
const {requireSuperadmin}=require('./commercialAuthorization');
const subscriptions=require('./subscriptionService');
const {businessBalances}=require('./adminBusinessBalances');
const uuid=z.string().uuid(),reason=z.string().trim().min(10).max(1000);
const customerFields='id,email,full_name,declared_document_key,is_active,admin_revision,created_at,verified_at';
const definitions={
 sellers:{from:`app_users u left join qori_sales_profiles p on p.user_id=u.id left join qori_seller_applications a on a.user_id=u.id`,where:`(u.role='QORI_SELLER' or u.platform_role='QORI_SELLER' or p.user_id is not null) and u.role<>'QORI_SUPERADMIN' and coalesce(u.platform_role,'')<>'QORI_SUPERADMIN'`,fields:`u.id,u.full_name name,u.email,p.phone,u.created_at,case when u.role='QORI_SELLER' then u.is_active else u.is_active and u.platform_role='QORI_SELLER' end is_active,'SELLER' version,a.status application_status,a.ciiu,a.approval_mode,(select coalesce(jsonb_agg(d.kind),'[]'::jsonb) from qori_seller_documents d where d.user_id=u.id) document_kinds`,search:`concat_ws(' ',u.full_name,u.email,p.phone,a.document_key)`,active:`(case when u.role='QORI_SELLER' then u.is_active else u.is_active and u.platform_role='QORI_SELLER' end)`,version:`'SELLER'`,date:'u.created_at',id:'u.id'},
 businesses:{from:`businesses b left join qori_sales_accounts sa on sa.business_id=b.id left join app_users seller on seller.id=sa.seller_id`,where:'true',fields:`b.id,b.name,b.slug,b.plan_code version,b.subscription_status,b.subscription_current_period_ends_at,b.is_active,b.created_at,b.updated_at,sa.seller_id,seller.full_name seller_name`,search:`concat_ws(' ',b.name,b.slug,b.settings->>'nit',b.settings->>'contact_email',b.settings->>'contact_name',(select string_agg(concat_ws(' ',owner.full_name,owner.email),' ') from app_users owner where owner.business_id=b.id))`,active:'b.is_active',version:'b.plan_code',date:'b.created_at',id:'b.id'},
 customers:{from:'customer_accounts c',where:'true',fields:`c.id,c.full_name name,c.email,c.declared_document_key,c.is_active,c.admin_revision,c.created_at,'CUSTOMER_FREE' version,(nullif(trim(c.full_name),'') is not null and c.declared_document_key is not null) registration_complete`,search:`concat_ws(' ',c.full_name,c.email,c.declared_document_key)`,active:'c.is_active',version:`'CUSTOMER_FREE'`,date:'c.created_at',id:'c.id'}
};
function definition(kind){const d=definitions[kind];if(!d)throw notFound('Sección no encontrada.');return d;}
async function audit(db,user,kind,id,detail){await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,$2,$3,$4,$5::jsonb)",[user.id,'ACCOUNT_ADMIN_UPDATED',kind==='customers'?'customer_account':'business',id,JSON.stringify(detail)]);}
async function bootstrap(user){requireSuperadmin(user);const counts={};await Promise.all(Object.entries(definitions).map(async([key,d])=>{counts[key]=(await query(`select count(*)::int total,count(*) filter(where ${d.active})::int active from ${d.from} where ${d.where}`)).rows[0];}));return {counts,versions:{sellers:[{code:'SELLER',name:'Qori Seller'}],businesses:subscriptions.listPlans().map(p=>({code:p.code,name:p.name,monthly_price_cop:p.monthly_price_cop})),customers:[{code:'CUSTOMER_FREE',name:'Qori Customer · Gratis'}]}};}
async function list(user,kind,params={}){
 requireSuperadmin(user);const d=definition(kind),p=validate(z.object({search:z.string().trim().max(160).default(''),state:z.enum(['','ACTIVE','SUSPENDED']).default(''),version:z.string().max(40).default(''),offset:z.coerce.number().int().min(0).max(1000000).default(0)}).strict(),params);
 const args=[p.search,p.state,p.version],where=`${d.where} and ($1='' or ${d.search} ilike '%'||$1||'%') and ($2='' or ${d.active}=($2='ACTIVE')) and ($3='' or ${d.version}=$3)`;
 const [rows,count]=await Promise.all([query(`select ${d.fields} from ${d.from} where ${where} order by ${d.date} desc,${d.id} limit 50 offset $4`,[...args,p.offset]),query(`select count(*)::int total from ${d.from} where ${where}`,args)]);
 if(kind==='sellers')rows.rows.forEach(r=>{r.documentation=require('./qoriSellerService').documentation(r,r.document_kinds.map(kind=>({kind})));delete r.document_kinds;});
 if(kind==='businesses'){const balances=await businessBalances(rows.rows.map(b=>b.id));rows.rows.forEach(b=>{b.balances=balances.get(b.id);});}
 return {rows:rows.rows,total:count.rows[0].total,has_more:p.offset+rows.rowCount<count.rows[0].total};
}
async function detail(user,kind,id){
 requireSuperadmin(user);definition(kind);validate(uuid,id);let record;
 if(kind==='customers')record=(await query(`select ${customerFields},(select count(*)::int from customer_sessions s where s.customer_id=c.id and s.expires_at>now()) sessions from customer_accounts c where id=$1`,[id])).rows[0];
 if(kind==='businesses'){
  const row=(await query('select * from businesses where id=$1',[id])).rows[0];if(row){record={id:row.id,name:row.name,slug:row.slug,is_active:row.is_active,plan_code:row.plan_code,subscription_status:row.subscription_status,subscription_current_period_ends_at:row.subscription_current_period_ends_at,updated_at:row.updated_at,plan:subscriptions.planFromBusiness(row)};
   record.users=(await query('select id,full_name,email,role,is_active from app_users where business_id=$1 order by created_at,id',[id])).rows;
   record.credits=(await query('select qr_balance,included_balance,qr_used_total from business_qr_credit_accounts where business_id=$1',[id])).rows[0]||null;
   record.balances=(await businessBalances([id])).get(id);
  }
 }
 if(kind==='sellers'){
  const d=definitions.sellers;record=(await query(`select ${d.fields} from ${d.from} where ${d.where} and u.id=$1`,[id])).rows[0];
  if(record){record.application=(await query('select status,approval_mode,ciiu,terms_version,review_note,submitted_at,reviewed_at from qori_seller_applications where user_id=$1',[id])).rows[0]||null;record.documents=(await query('select id,kind,filename,byte_size from qori_seller_documents where user_id=$1 order by kind',[id])).rows;
   record.documentation=require('./qoriSellerService').documentation(record.application,record.documents);
   record.commissions=(await query("select coalesce(sum(amount_cop) filter(where status='PENDING'),0) pending_cop,coalesce(sum(amount_cop) filter(where status='PAID'),0) paid_cop from qori_seller_commissions where seller_id=$1",[id])).rows[0];
  }
 }
 if(!record)throw notFound('Cuenta no encontrada.');
 const entity=kind==='customers'?'customer_account':kind==='businesses'?'business':'seller';
 const history=(await query('select a.id,a.action,a.created_at,a.detail,u.full_name actor_name from qori_commercial_audit a left join app_users u on u.id=a.actor_id where a.entity_type=$1 and a.entity_id=$2 order by a.created_at desc,a.id desc limit 30',[entity,id])).rows;
 return {record,history};
}
async function updateCustomer(user,id,payload){
 requireSuperadmin(user);validate(uuid,id);const d=validate(z.object({full_name:z.string().trim().min(2).max(160),is_active:z.boolean(),revoke_sessions:z.boolean().default(false),expected_revision:z.number().int().min(0),reason}).strict(),payload);
 return withTransaction(async db=>{const before=(await db.query(`select ${customerFields} from customer_accounts where id=$1 for update`,[id])).rows[0];if(!before)throw notFound('Cuenta no encontrada.');if(before.admin_revision!==d.expected_revision)throw badRequest('La cuenta cambió. Actualiza la ficha antes de guardar.');
  await db.query('update customer_accounts set full_name=$2,is_active=$3,admin_revision=admin_revision+1 where id=$1',[id,d.full_name,d.is_active]);
  const revoked=(!d.is_active||d.revoke_sessions)?(await db.query('delete from customer_sessions where customer_id=$1',[id])).rowCount:0;
  await audit(db,user,'customers',id,{reason:d.reason,before:{full_name:before.full_name,is_active:before.is_active},after:{full_name:d.full_name,is_active:d.is_active},sessions_revoked:revoked});return {ok:true};
 });
}
async function updateBusiness(user,id,payload){
 requireSuperadmin(user);validate(uuid,id);const codes=subscriptions.listPlans().map(p=>p.code);
 const d=validate(z.object({name:z.string().trim().min(2).max(160),is_active:z.boolean(),plan_code:z.enum(codes),subscription_status:z.enum(['ACTIVE','PENDING_PAYMENT','SUSPENDED','CANCELLED']),subscription_current_period_ends_at:z.string().datetime().nullable(),expected_updated_at:z.string().datetime(),reason}).strict(),payload);
 return withTransaction(async db=>{const before=(await db.query('select * from businesses where id=$1 for update',[id])).rows[0];if(!before)throw notFound('Empresa no encontrada.');if(new Date(before.updated_at).getTime()!==new Date(d.expected_updated_at).getTime())throw badRequest('La empresa cambió. Actualiza la ficha antes de guardar.');
  const sameDate=(x,y)=>(!x&&!y)||new Date(x).getTime()===new Date(y).getTime();const planChanged=before.plan_code!==d.plan_code||before.subscription_status!==d.subscription_status||!sameDate(before.subscription_current_period_ends_at,d.subscription_current_period_ends_at);
  if(planChanged){if(!before.is_active)throw badRequest('Reactiva la empresa antes de modificar su suscripción.');await subscriptions.setBusinessSubscription(id,d,db);}
  await db.query('update businesses set name=$2,is_active=$3,updated_at=now() where id=$1',[id,d.name,d.is_active]);
  const keys=['name','is_active','plan_code','subscription_status','subscription_current_period_ends_at'];await audit(db,user,'businesses',id,{reason:d.reason,before:Object.fromEntries(keys.map(k=>[k,before[k]])),after:Object.fromEntries(keys.map(k=>[k,d[k]])),payment_recorded:false});return {ok:true};
 });
}
module.exports={bootstrap,list,detail,updateCustomer,updateBusiness};

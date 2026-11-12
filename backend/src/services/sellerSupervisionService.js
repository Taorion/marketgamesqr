const { z } = require('zod');
const { query } = require('../config/db');
const { validate } = require('../utils/validators');
const { forbidden } = require('../utils/http');
const { env } = require('../config/env');

function authorize(user) {
  if ((user?.platform_role || user?.role) !== 'QORI_SUPERADMIN') throw forbidden('La supervisión global está reservada al superadmin de Qori.');
}
const filterSchema = z.object({
  view: z.enum(['accounts','orders','commissions','payouts','history']).default('accounts'),
  seller_id: z.union([z.string().uuid(),z.literal(''),z.literal('unassigned')]).default(''),
  business_id: z.union([z.string().uuid(),z.literal('')]).default(''),
  search: z.string().trim().max(160).default(''),
  status: z.string().max(40).default(''),
  offset: z.coerce.number().int().min(0).max(1000000).default(0)
}).strict();
async function bootstrap(user) {
  authorize(user);
  const sellers = await query(`select u.id,u.full_name,u.email,u.is_active,a.status as application_status,
    a.approval_mode,u.password_setup_required from app_users u left join qori_seller_applications a on a.user_id=u.id
    where u.role in ('QORI_SELLER','QORI_SUPERADMIN') or u.platform_role in ('QORI_SELLER','QORI_SUPERADMIN')
    order by u.full_name,u.id`);
  return {sellers:sellers.rows.map(s=>({...s,referral_url:`${env.publicAppUrl}/paquetes/?advisor=${s.id}`}))};
}
async function list(user, params) {
  authorize(user);
  const f = validate(filterSchema, params);
  const values=[f.seller_id,f.business_id,'%'+f.search+'%',f.status,f.offset];
  // Both seller ids are meaningful: current portfolio owner and frozen recipient of an order.
  const scope = (seller,business,search,status) => `($1='' or ($1='unassigned' and ${seller} is null) or ${seller}::text=$1)
    and ($2='' or ${business}::text=$2) and (${search}) and ($4='' or ${status}=$4)`;
  let from, fields, where, sort, totals;
  if (f.view==='accounts') {
    from=`businesses b left join qori_sales_accounts a on a.business_id=b.id left join app_users s on s.id=a.seller_id`;
    fields=`b.id,b.name,b.slug,b.plan_code,b.subscription_status,b.subscription_current_period_ends_at,b.is_active,b.is_seller_demo,
      a.seller_id,s.full_name seller_name,a.created_at assigned_at,
      (select max(o.credited_at) from qr_credit_purchase_orders o where o.business_id=b.id and o.status='APPROVED' and o.credited_at is not null and o.price_cop>0 and o.metadata->'signup'->>'type' in ('portal_monthly_subscription','portal_annual_subscription','portal_monthly_subscription_auto_renewal')) last_payment_at`;
    where=scope('a.seller_id','b.id',"b.name ilike $3 or b.slug ilike $3 or s.full_name ilike $3",'b.subscription_status');sort='b.created_at desc,b.id';
    totals=`count(*)::int total,count(*) filter(where a.seller_id is null)::int unassigned`;
  } else if (f.view==='orders') {
    from=`qr_credit_purchase_orders o join businesses b on b.id=o.business_id left join app_users s on s.id=o.commission_seller_id
      left join qori_sales_accounts a on a.business_id=b.id left join app_users current_s on current_s.id=a.seller_id`;
    fields=`o.id,o.business_id,b.name business_name,o.package_title,o.package_code,o.price_cop,o.status,o.credited_at,o.created_at,
      o.mercado_pago_payment_id,o.commission_seller_id seller_id,s.full_name seller_name,a.seller_id current_seller_id,current_s.full_name current_seller_name,
      o.metadata->>'source' source,
      (select count(*)::int from qori_seller_commissions c where c.order_id=o.id) commission_entries`;
    where=scope('o.commission_seller_id','b.id',"b.name ilike $3 or s.full_name ilike $3 or o.id::text ilike $3 or o.mercado_pago_payment_id ilike $3",'o.status');sort='o.created_at desc,o.id';
    totals=`count(*)::int total,coalesce(sum(o.price_cop) filter(where o.status='APPROVED' and o.credited_at is not null),0) approved_cop`;
  } else if (f.view==='commissions') {
    from=`qori_seller_commissions c join businesses b on b.id=c.business_id join app_users s on s.id=c.seller_id`;
    fields=`c.id,c.business_id,b.name business_name,c.seller_id,s.full_name seller_name,c.order_id,c.kind,c.base_cop,c.rate,c.amount_cop,c.status,c.due_on,c.earned_on,c.commission_month,c.policy_version,c.payout_id,c.reversed_at,c.created_at`;
    where=scope('c.seller_id','b.id',"b.name ilike $3 or s.full_name ilike $3 or c.order_id::text ilike $3",'c.status');sort='c.created_at desc,c.id';
    totals=`count(*)::int total,coalesce(sum(c.amount_cop) filter(where c.status='PENDING'),0) pending_cop,
      coalesce(sum(c.amount_cop) filter(where c.status='SCHEDULED'),0) scheduled_cop,coalesce(sum(c.amount_cop) filter(where c.status='PAID'),0) paid_cop`;
  } else if (f.view==='payouts') {
    from=`qori_seller_payouts p join app_users s on s.id=p.seller_id left join app_users recorder on recorder.id=p.recorded_by`;
    fields=`p.id,p.seller_id,s.full_name seller_name,p.gross_cop,p.withholding_cop,p.net_cop,p.transfer_reference,p.paid_on,p.created_at,recorder.full_name recorded_by_name`;
    where=`($1='' or p.seller_id::text=$1) and ($2='' or exists(select 1 from qori_seller_commissions c where c.payout_id=p.id and c.business_id::text=$2))
      and (s.full_name ilike $3 or p.transfer_reference ilike $3) and ($4='' or $4='PAID')`;
    sort='p.created_at desc,p.id';totals='count(*)::int total,coalesce(sum(p.net_cop),0) net_cop';
  } else {
    from=`qori_commercial_audit h left join app_users actor on actor.id=h.actor_id`;
    fields=`h.id,h.action,h.entity_type,h.entity_id,h.detail,h.created_at,actor.full_name actor_name`;
    where=`($1='' or h.detail->>'seller_id'=$1 or h.detail->>'previous_seller_id'=$1 or h.actor_id::text=$1 or (h.entity_type='seller' and h.entity_id::text=$1))
      and ($2='' or (h.entity_type='business' and h.entity_id::text=$2) or h.detail->>'business_id'=$2)
      and (h.action ilike $3 or actor.full_name ilike $3 or h.detail->>'reason' ilike $3 or h.detail->>'order_id' ilike $3)
      and ($4='' or h.action=$4)`;
    sort='h.created_at desc,h.id';totals='count(*)::int total';
  }
  const [rows,summary] = await Promise.all([
    query(`select ${fields} from ${from} where ${where} order by ${sort} limit 31 offset $5`,values),
    query(`select ${totals} from ${from} where ${where}`,values.slice(0,4))
  ]);
  return {view:f.view,rows:rows.rows.slice(0,30),summary:summary.rows[0],has_more:rows.rows.length>30,offset:f.offset,next_offset:f.offset+30};
}
module.exports={bootstrap,list};

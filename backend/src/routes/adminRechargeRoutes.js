const router = require('express').Router();
const {z} = require('zod');
const {validate} = require('../utils/validators');
const {query} = require('../config/db');
const {notFound} = require('../utils/http');
const {getBusinessSubscription} = require('../services/subscriptionService');
const {GIFTCARD_PACKAGE_OFFERS, subscriberPackageOffers, findPackageOffer} = require('../services/packageCatalog');
const payments = require('../services/mercadoPagoService');
const handle = fn => async (req,res,next) => { try { res.set('Cache-Control','private, no-store'); res.json(await fn(req)); } catch(e) { next(e); } };
router.use((req,_res,next)=>{try{require('../services/adminAccessPolicy').requireAdminAccess(req.user);next();}catch(e){next(e);}});
router.get('/businesses',handle(async req=>{
  const {search} = validate(z.object({search:z.string().trim().max(160).default('')}),req.query);
  const result = await query("select id,name,slug,plan_code from businesses where is_active=true and (name ilike $1 or slug ilike $1) order by name,id limit 50",['%'+search+'%']);
  return {businesses:result.rows};
}));
router.get('/businesses/:id',handle(async req=>{
  const id=validate(z.string().uuid(),req.params.id);
  const {plan,business_name}=await getBusinessSubscription(id);
  const [g,t,orders]=await Promise.all([
    query('select balance from qori_giftcard_credit_accounts where business_id=$1',[id]),
    query('select qr_balance from business_qr_credit_accounts where business_id=$1',[id]),
    payments.listCreditOrders({business_id:id},{limit:40}),
  ]);
  const active=plan.category==='subscription'&&plan.raw_status==='ACTIVE'&&plan.portal_access_allowed;
  const gifts=active&&plan.features.gift_cards&&!Number.isFinite(plan.limits?.gift_cards_total);
  return {business:{id,name:business_name,plan_name:plan.name},giftcard_balance:Number(g.rows[0]?.balance||0),ticket_balance:Number(t.rows[0]?.qr_balance||0),
    giftcard_packages:gifts?GIFTCARD_PACKAGE_OFFERS:[],ticket_packages:active?subscriberPackageOffers():[],
    giftcard_message:gifts?'':'Este plan no permite comprar emisiones adicionales. Revisa su acceso y sus límites antes de recargar.',
    ticket_message:active?'':'El negocio necesita acceso activo para comprar tickets.',orders};
}));
router.post('/businesses/:id/checkout',handle(async req=>{
  const id=validate(z.string().uuid(),req.params.id);
  const body=validate(z.object({package_code:z.string().refine(v=>Boolean(findPackageOffer(v)),'Paquete no disponible'),idempotency_key:z.string().uuid()}).strict(),req.body);
  if(!(await query('select id from businesses where id=$1 and is_active=true',[id])).rowCount)throw notFound('Negocio no disponible.');
  return {order:await payments.createAdminCreditCheckout(req.user,id,body)};
}));
module.exports=router;

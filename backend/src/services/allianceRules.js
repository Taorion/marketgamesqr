const {z}=require('zod');
const {badRequest}=require('../utils/http');
const money=z.coerce.number().finite().min(0).max(999999999);
const uuid=z.string().uuid();
const rulesSchema=z.object({
  name:z.string().trim().min(3).max(120), purpose:z.string().trim().min(3).max(500),
  benefit_type:z.enum(['FREE_GIFT','PERCENT_DISCOUNT','FIXED_AMOUNT_DISCOUNT','CUSTOM']),
  benefit_label:z.string().trim().min(3).max(240), benefit_amount:money.default(0),
  minimum_purchase:money.default(0), purchase_product_id:uuid.nullable().default(null),
  terms:z.string().trim().min(3).max(3000), destination:z.string().trim().min(3).max(500),
  branch_ids:z.array(uuid).max(100).default([]),
  starts_at:z.string().datetime({offset:true}), ends_at:z.string().datetime({offset:true}),
  ticket_valid_days:z.coerce.number().int().min(1).max(365).default(30),
  per_customer_limit:z.coerce.number().int().min(1).max(20).default(1),
  commission_type:z.enum(['FIXED','PERCENT']), commission_value:money,
  commission_base:z.enum(['NET_PAID','SUBTOTAL']).default('NET_PAID'),
  settlement_terms:z.string().trim().min(3).max(1000),
  unused_policy:z.enum(['RETURN_UNUSED','NO_REFUND']).default('RETURN_UNUSED'),
}).strict().superRefine((v,c)=>{
  if(new Date(v.ends_at)<=new Date(v.starts_at))c.addIssue({code:'custom',message:'El vencimiento debe ser posterior al inicio.'});
  if(v.commission_type==='PERCENT'&&v.commission_value>100)c.addIssue({code:'custom',message:'La comisión porcentual no puede superar 100%.'});
  if(v.benefit_type==='PERCENT_DISCOUNT'&&(v.benefit_amount<=0||v.benefit_amount>100))c.addIssue({code:'custom',message:'El descuento debe estar entre 0 y 100%.'});
  if(v.benefit_type==='FIXED_AMOUNT_DISCOUNT'&&v.benefit_amount<=0)c.addIssue({code:'custom',message:'Ingresa el valor del descuento.'});
});
const brandingSchema=z.object({
  display_name:z.string().trim().min(2).max(120), presentation:z.string().trim().max(500),
  message:z.string().trim().min(3).max(500), invitation:z.string().trim().min(3).max(240),
  logo_url:z.string().trim().max(2048).refine(v=>!v||/^https:\/\//i.test(v),'Usa una URL HTTPS para el logo.'),
  collect_phone:z.boolean(), collect_email:z.boolean(),
}).strict();
const enrollmentSchema=z.object({
  request_key:uuid, name:z.string().trim().min(3).max(180),
  document_id:z.string().trim().min(4).max(40).regex(/^[a-zA-Z0-9 .-]+$/),
  phone:z.string().trim().max(40).default(''), email:z.union([z.string().email().max(240),z.literal('')]).default(''),
  data_use_confirmed:z.literal(true), marketing_issuer:z.boolean().default(false),marketing_ally:z.boolean().default(false),
}).strict();
function parse(schema,input){const r=schema.safeParse(input);if(!r.success)throw badRequest(r.error.issues.map(i=>i.message).join(' '));return r.data;}
const documentKey=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
function benefit(r){return {label:r.benefit_label,purchase_required:true,minimum_purchase:r.minimum_purchase,
  ...(r.benefit_type==='PERCENT_DISCOUNT'?{percent:r.benefit_amount}:{}),
  ...(r.benefit_type==='FIXED_AMOUNT_DISCOUNT'?{amount:r.benefit_amount}:{}),
  ...(r.purchase_product_id?{product_scope:{mode:'applies_to_product',inventory_product_id:r.purchase_product_id,product_name:r.purchase_product_name}}:{})};}
// Allowlist only. No agreement, commission, internal identifiers or customer data in public output.
function publicRules(r){return Object.fromEntries(['name','purpose','benefit_type','benefit_label','benefit_amount','minimum_purchase','terms','destination','starts_at','ends_at','ticket_valid_days','purchase_product_name','branch_names'].map(k=>[k,r[k]]));}
function commission(r,checkout){const base=r.commission_base==='SUBTOTAL'?checkout.subtotal:checkout.final_total;return round(r.commission_type==='FIXED'?r.commission_value:base*r.commission_value/100);}
module.exports={rulesSchema,brandingSchema,enrollmentSchema,parse,uuid,documentKey,round,benefit,publicRules,commission};

const {z}=require('zod');
const {badRequest}=require('../utils/http');
const money=z.coerce.number().finite().min(0).max(999999999);
const uuid=z.string().uuid();
const partnerSchema=z.string().trim().min(2).max(120);
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
  request_key:uuid,
  first_name:z.string().trim().min(1).max(80), last_name:z.string().trim().min(1).max(99),
  document_id:z.string().trim().min(4).max(40).regex(/^[a-zA-Z0-9 .-]+$/),
  phone:z.string().trim().min(7).max(30).regex(/^\+?[\d ()-]+$/).refine(v=>v.replace(/\D/g,'').length>=7,'Ingresa un teléfono válido con al menos 7 dígitos.'),
  email:z.string().trim().email().max(240),
  data_use_confirmed:z.literal(true), marketing_issuer:z.boolean().default(false),marketing_ally:z.boolean().default(false),
}).strict();
const fieldLabels={
  name:'el nombre de la alianza',purpose:'el propósito',benefit_type:'el tipo de beneficio',
  benefit_label:'el beneficio que verá el cliente',benefit_amount:'el valor del descuento',
  minimum_purchase:'la compra mínima',purchase_product_id:'el producto requerido',
  terms:'las condiciones del beneficio',destination:'la dirección del negocio',branch_ids:'las sucursales',
  starts_at:'la fecha de inicio',ends_at:'la fecha de fin',ticket_valid_days:'los días para usar cada ticket',
  per_customer_limit:'los tickets por documento',commission_type:'el tipo de comisión',
  commission_value:'el valor de la comisión',commission_base:'la base de la comisión',
  settlement_terms:'las condiciones de liquidación',unused_policy:'la política de tickets no entregados',
  display_name:'el nombre comercial',presentation:'la presentación del negocio',message:'el mensaje del ticket',
  invitation:'la invitación al formulario',logo_url:'el enlace del logo',collect_phone:'la opción de solicitar teléfono',
  collect_email:'la opción de solicitar correo',document_id:'el documento de identidad',phone:'el teléfono',
  email:'el correo electrónico',marketing_issuer:'la autorización de novedades del negocio emisor',
  marketing_ally:'la autorización de novedades del negocio aliado',ally_slug:'el identificador del negocio aliado',
  offset:'la página de resultados',
};
function validationMessage(issue,schema,context){
  const field=issue.path[0]||context;
  const label=field==='first_name'?'tu nombre':field==='last_name'?'tus apellidos':fieldLabels[field];
  if(issue.code==='custom')return issue.message;
  if(field==='data_use_confirmed')return 'Autoriza el uso de tus datos por ambos negocios para recibir el ticket. Las novedades comerciales son opcionales.';
  if(field==='request_key')return 'No pudimos identificar esta solicitud. Actualiza la página y vuelve a intentarlo.';
  if(field==='public_token')return 'Este enlace no es válido. Vuelve a escanear el QR o solicita el enlace al negocio.';
  if(['id','batch','payment','ticket','commission_id'].includes(field))return 'No pudimos identificar el registro seleccionado. Actualiza la alianza y vuelve a abrirlo.';
  if(issue.code==='unrecognized_keys')return 'El formulario contiene datos que ya no se utilizan. Actualiza la página y vuelve a intentarlo.';
  if(!label)return 'Revisa los datos del formulario y completa los campos obligatorios.';
  if(issue.code==='too_small'){
    if(issue.origin==='string')return `Escribe ${label} con al menos ${issue.minimum} caracteres.`;
    return `Revisa ${label}: el valor mínimo es ${issue.minimum}.`;
  }
  if(issue.code==='too_big'){
    if(issue.origin==='string')return `Acorta ${label} a un máximo de ${issue.maximum} caracteres.`;
    if(issue.origin==='array')return `Selecciona como máximo ${issue.maximum} sucursales.`;
    return `Revisa ${label}: el valor máximo es ${issue.maximum}.`;
  }
  if(field==='email')return 'Escribe un correo válido, por ejemplo: nombre@correo.com.';
  if(field==='phone'&&issue.code==='invalid_format')return 'Escribe un teléfono válido usando números y, si lo necesitas, el prefijo del país.';
  if(field==='document_id'&&issue.code==='invalid_format')return 'Escribe el documento usando letras, números, espacios, puntos o guiones.';
  if(['starts_at','ends_at'].includes(field))return `Selecciona ${label} con una fecha y hora válidas.`;
  if(issue.code==='invalid_type'){
    if(issue.expected==='number'||issue.expected==='int')return `Ingresa un número${issue.expected==='int'?' entero':''} válido en ${label}.`;
    return `Completa o revisa ${label}.`;
  }
  if(issue.code==='invalid_value'||issue.format==='uuid')return `Selecciona una opción válida para ${label}.`;
  return `Revisa ${label} y vuelve a intentarlo.`;
}
function parse(schema,input,context){
  const r=schema.safeParse(input);
  if(!r.success)throw badRequest([...new Set(r.error.issues.map(i=>validationMessage(i,schema,context)))].join(' '));
  return r.data;
}
const documentKey=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const round=v=>Math.round((Number(v)+Number.EPSILON)*100)/100;
function benefit(r){return {label:r.benefit_label,purchase_required:true,minimum_purchase:r.minimum_purchase,
  ...(r.benefit_type==='PERCENT_DISCOUNT'?{percent:r.benefit_amount}:{}),
  ...(r.benefit_type==='FIXED_AMOUNT_DISCOUNT'?{amount:r.benefit_amount}:{}),
  ...(r.purchase_product_id?{product_scope:{mode:'applies_to_product',inventory_product_id:r.purchase_product_id,product_name:r.purchase_product_name}}:{})};}
// Allowlist only. No agreement, commission, internal identifiers or customer data in public output.
function publicRules(r){return Object.fromEntries(['name','purpose','benefit_type','benefit_label','benefit_amount','minimum_purchase','terms','destination','starts_at','ends_at','ticket_valid_days','purchase_product_name','branch_names'].map(k=>[k,r[k]]));}
function commission(r,checkout){const base=r.commission_base==='SUBTOTAL'?checkout.subtotal:checkout.final_total;return round(r.commission_type==='FIXED'?r.commission_value:base*r.commission_value/100);}
module.exports={rulesSchema,brandingSchema,enrollmentSchema,partnerSchema,parse,uuid,documentKey,round,benefit,publicRules,commission};

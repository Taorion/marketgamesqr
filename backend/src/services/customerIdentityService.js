const {badRequest}=require('../utils/http');
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const mismatch=()=>badRequest('La cédula de esta cuenta es un dato maestro y no puede cambiarse. Si hay un error, solicita revisión a Qori.');
async function lockDocument(customerId,data,db,{expected}={}){
 const a=(await db.query('select id,declared_document_key,document_review_required,benefit_recovery_completed_at from customer_accounts where id=$1 for update',[customerId])).rows[0];
 if(!a)throw badRequest('Cuenta no disponible.');
 if(a.document_review_required)throw badRequest('Tu documento requiere revisión de Qori antes de conectar más beneficios.');
 const value=normalize(data.document_id||a.declared_document_key);
 if(value.length<3||value.length>80)throw badRequest('Escribe una cédula válida.');
 if(expected&&normalize(expected)!==value)throw badRequest('La cédula no coincide con la verificada por el negocio.');
 if(a.declared_document_key&&value!==a.declared_document_key)throw mismatch();
 if(!a.declared_document_key){
  if(!data.document_confirmation||normalize(data.document_confirmation)!==value)throw badRequest('Escribe la misma cédula una segunda vez para confirmarla. Después no podrás cambiarla.');
  await db.query('update customer_accounts set declared_document_key=$2,document_locked_at=now() where id=$1',[customerId,value]);
 }
 return {...a,declared_document_key:value};
}
async function assertCompatible(customerId,document,db){
 const a=(await db.query('select declared_document_key,document_review_required from customer_accounts where id=$1',[customerId])).rows[0];
 if(a?.document_review_required||a?.declared_document_key&&a.declared_document_key!==normalize(document))throw mismatch();
}
module.exports={normalize,lockDocument,assertCompatible};

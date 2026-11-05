// These helpers take only fixed SQL identifiers from server code, never input.
function recovered(kind,alias,customer='$1',business='business_id'){
 return `exists(select 1 from customer_recovered_benefits cb where cb.customer_id=${customer} and cb.business_id=${alias}.${business} and cb.kind='${kind}' and cb.resource_id=${alias}.id)`;
}
function owned(kind,alias,customer='$1'){
 const document=kind==='STAMP'?`${alias}.document_key`:`regexp_replace(lower(${alias}.document_id),'[^a-z0-9]','','g')`;
 return `(exists(select 1 from customer_relationships r where r.business_id=${alias}.business_id and r.document_key=${document} and r.state='ACCEPTED' and r.customer_id=${customer}
 and (r.include_history or ${alias}.created_at>=r.accepted_at or exists(select 1 from customer_invitations i where i.customer_id=${customer} and i.kind='${kind}' and i.state='ACCEPTED' and i.result_id=${alias}.id))) or ${recovered(kind,alias,customer)} or exists(select 1 from customer_invitations direct where direct.customer_id=${customer} and direct.business_id=${alias}.business_id and direct.kind='${kind}' and direct.state='ACCEPTED' and direct.result_id=${alias}.id and direct.payload ? 'existing_benefit'))`;
}
module.exports={owned,recovered};

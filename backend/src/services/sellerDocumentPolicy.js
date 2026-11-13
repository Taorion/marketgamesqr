const documents=Object.freeze([
 {kind:'IDENTITY',label:'Cédula'},
 {kind:'RUT',label:'RUT actualizado'},
 {kind:'BANK',label:'Certificado bancario'},
 {kind:'POLICE',label:'Antecedentes de Policía'},
 {kind:'PROCURADURIA',label:'Antecedentes de Procuraduría'},
 {kind:'PHOTO',label:'Foto del rostro'},
 {kind:'CONTRACT',label:'Contrato firmado y autenticado'}
]);
module.exports={documents,kinds:documents.map(d=>d.kind)};

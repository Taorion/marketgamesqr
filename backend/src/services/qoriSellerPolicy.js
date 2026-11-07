// No tax code is imposed until the SaaS commission-sales activity is classified.
const VERSION='2026-11-07-saas-classification-pending';
const CIIU=Object.freeze({
 code:null,name:'Clasificación pendiente de validación por Qori',status:'PENDING_VALIDATION',
 scope:'Comercialización de suscripciones SaaS de Qori por comisión; Qori contrata, factura y cobra al negocio.',
 rut_requirement:'Qori está validando el CIIU correspondiente a esta actividad. No se exige 7310 ni debes cambiar tu RUT, firmar o autenticar el contrato por ahora. La apertura de nuevas postulaciones y su aprobación están temporalmente pendientes de esta definición.',
 source_url:'https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_14298_2026.htm',
 reviewed_on:'2026-11-07'
});
function classificationReady(){return CIIU.status==='VALIDATED'&&/^\d{4}$/.test(CIIU.code||'');}
module.exports={VERSION,CIIU,classificationReady};

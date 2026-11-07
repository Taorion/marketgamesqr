// Code selected explicitly by Qori; this is not a taxpayer-specific DIAN ruling.
const VERSION='2026-11-07-ciiu4610';
const CIIU=Object.freeze({
 code:'4610',name:'Comercio al por mayor a cambio de una retribución o por contrata',status:'DEFINED_BY_QORI',
 scope:'Comercialización de suscripciones SaaS de Qori por comisión; Qori contrata, factura y cobra al negocio.',
 rut_requirement:'El RUT debe incluir 4610 como actividad principal, secundaria u otra actividad, según la actividad real y los ingresos. Qori verifica el documento antes de aprobar.',
 source_url:'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0227_2025.htm',
 decision_basis:'Código definido expresamente por Qori para su programa Seller.',
 defined_on:'2026-11-07'
});
function classificationReady(){return CIIU.status==='DEFINED_BY_QORI'&&/^\d{4}$/.test(CIIU.code||'');}
module.exports={VERSION,CIIU,classificationReady};

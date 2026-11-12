const programs=Object.freeze({
 PENSE_EN_TI:{code:'PENSE_EN_TI',name:'Pensé en ti',view:'courtesies',tickets:20,kind:'TICKET',summary:'20 tickets iniciales para regalar productos. Máximo 5 productos y validador. Las recargas se compran.'},
 SELLOS_GRATIS:{code:'SELLOS_GRATIS',name:'Una razón para volver',view:'stamp-cards',tickets:0,kind:'STAMP',summary:'Un programa de sellos, máximo 5 productos y validador. Los QR de premios consumen tickets comprados.'},
 ACTIVACIONES_GRATIS:{code:'ACTIVACIONES_GRATIS',name:'Crea activaciones',view:'strategic-qr',tickets:0,kind:'ACTIVITY',summary:'Hasta 2 activaciones activas a la vez, máximo 5 productos y validador. Los QR de premios consumen tickets comprados.'}
});
const isFreeProgram=code=>Object.hasOwn(programs,code);
const publicationKind=code=>code==='PENSE_EN_TI'?'PRODUCT':programs[code]?.kind;
// Free programs use a default-deny boundary as well as feature checks. This
// covers older endpoints that predate subscription guards and aliases.
function allowedRequest(code,method,path,body={}){
 if(!isFreeProgram(code))return true;
 const read=method==='GET',write=method==='POST',profile=path==='/api/business/profile';
 if(read&&['/api/auth/me','/api/business/access','/api/business/profile','/api/business/storage/summary','/api/business/tickets/balance','/api/business/tickets/transactions','/api/qr/credits/me','/api/pense-en-ti/balances','/api/business/users','/api/payments/qr-credits/offers','/api/payments/qr-credits/orders'].includes(path))return true;
 if(profile&&method==='PATCH')return true;
 if(write&&['/api/auth/password/change','/api/payments/qr-credits/checkout','/api/payments/tickets/checkout','/api/payments/subscriptions/checkout','/api/payments/subscriptions/auto-renewal','/api/business/customer/lookup'].includes(path))return true;
 if(/^\/api\/business\/inventory\/(categories|subcategories|catalog|products)(\/|$)/.test(path)&&!path.endsWith('/insights'))return true;
 if(read&&/^\/api\/qr\/validate\/[^/]+$/.test(path)||write&&/^\/api\/qr\/redeem\/[^/]+$/.test(path))return true;
 if(/^\/api\/business\/reward-passes\/validator\//.test(path))return true;
 if(read&&/^\/api\/businesses\/[^/]+\/validator-history$/.test(path))return true;
 if(read&&path==='/api/business/validator/customers/search')return true;
 if(code==='SELLOS_GRATIS'&&/^\/api\/business\/stamp-cards(\/|$)/.test(path))return true;
 if(code==='ACTIVACIONES_GRATIS'&&/^\/api\/business\/interactive-activations(\/|$)/.test(path))return true;
 if(code==='PENSE_EN_TI'&&/^\/api\/business\/customer\/(courtesies|product-gifts)(\/|$)/.test(path))return true;
 if(path==='/api/business/customer/directory'&&['GET','PUT'].includes(method))return true;
 if(/^\/api\/business\/customer\/publications(\/|$)/.test(path))return !write||body.kind===publicationKind(code);
 if(path==='/api/business/customer/program-requests'&&read)return true;
 if(code==='SELLOS_GRATIS'&&write&&/^\/api\/business\/customer\/program-requests\/[^/]+\/decision$/.test(path))return true;
 if(read&&/^\/api\/business\/customer\/(invitations|benefit-deliveries)\/[^/]+$/.test(path))return true;
 // Deliver only the benefit kind belonging to this program. No affiliations,
 // points programs or Gift Card issuance through Customer's shared endpoints.
 if(write&&['/api/business/customer/invitations','/api/business/customer/benefit-deliveries'].includes(path))return body.kind===programs[code].kind;
 return false;
}
function enforceRequest(req){
 const code=req.user?.free_program_code;if(!isFreeProgram(code))return;
 if([req.user.role,req.user.platform_role].some(role=>['ADMIN','ADMIN_MARKET_GAMES','ADMIN_Qori','QORI_SUPERADMIN'].includes(role)))return;
 let path;try{path=decodeURIComponent(String(req.originalUrl||req.url||'').split('?')[0]).replace(/\/+/g,'/').replace(/\/$/,'');}catch{path='';}
 if(req.user.role==='QORI_SELLER'&&(path.startsWith('/api/seller/')||path.startsWith('/api/admin/commercial/')))return;
 if(!allowedRequest(code,req.method,path,req.body))throw require('../utils/http').forbidden('Este módulo no está incluido en tu programa gratuito. Consulta los planes para habilitarlo.',{code:'FREE_PROGRAM_MODULE_NOT_INCLUDED',plan_code:code});
}
module.exports={programs,isFreeProgram,publicationKind,allowedRequest,enforceRequest};

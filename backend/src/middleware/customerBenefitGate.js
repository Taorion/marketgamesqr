const {customerRequired}=require('../services/customerAuthService');
// Public benefit links never require a Customer account. Only activations use
// optional account context to preserve existing, explicitly linked participation.
function needsApi(path){return /^\/api\/public\/activations\/[^/]+\/(participants|complete)$/.test(path);}
function needsPage(){return false;}
function publicBenefitPath(value){
 if(typeof value!=='string'||!value.startsWith('/')||/[\\\r\n]/.test(value))return null;
 try{const u=new URL(value,'https://gosqori.com');return u.origin==='https://gosqori.com'&&/^\/(claim|rp|sellos|carnet-afiliado|activacion|trivia)(\/|$)/.test(u.pathname)?u.pathname+u.search+u.hash:null;}catch{return null;}
}
function gate(req,res,next){
 if(!needsApi(req.originalUrl.split('?')[0]))return next();
 customerRequired(req,res,error=>{
  if(error){delete req.customer;res.removeHeader('X-Qori-Customer');
   if(error.status===401||['REGISTRATION_INCOMPLETE','FINANCE_SETUP_REQUIRED'].includes(error.details?.code))return next();
   return next(error);
  }
  if(req.body){delete req.body.given_names;delete req.body.first_surname;delete req.body.second_surname;
   Object.assign(req.body,{name:req.customer.full_name,email:req.customer.email,document:req.customer.declared_document_key});
  }
  next();
 });
}
module.exports={gate,needsApi,needsPage,publicBenefitPath};

const {customerRequired}=require('../services/customerAuthService');
const {query}=require('../config/db');
const {forbidden}=require('../utils/http');
const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function needsApi(path){return /^\/api\/public\/(?:reward-passes\/|(?:qr\/)?claim\/|affiliates\/|stamp-cards\/|activations\/|trivias\/.*\/attempts|.*\/qr$)/.test(path);}
function needsPage(path){return /^\/(?:claim|rp|sellos|carnet-afiliado|activacion|trivia)(?:\/|$)/.test(path)&&(!/\.[a-z0-9]+$/i.test(path)||path.endsWith('.html'));}
async function resourceIdentity(path){
 let match,row;
 if((match=/\/reward-passes\/([^/]+)/.exec(path)))row=(await query('select beneficiary_email email,beneficiary_document document from reward_passes where lower(public_code)=lower($1)',[decodeURIComponent(match[1])])).rows[0];
 else if((match=/\/(?:qr\/)?claim\/([^/]+)/.exec(path)))row=(await query("select p.email,p.document_id document from qr_codes q left join players p on p.id=q.player_id where q.token=$1 and q.status<>'UNCLAIMED'",[decodeURIComponent(match[1])])).rows[0];
 else if((match=/\/stamp-cards\/([a-f0-9]{64})(?:\/|$)/.exec(path)))row=(await query('select email,document_key document from stamp_members where public_token=$1',[match[1]])).rows[0];
 else if((match=/\/affiliates\/([^/]+)\/card/.exec(path)))row=(await query('select email,document_id document from affiliates where qr_token=$1',[decodeURIComponent(match[1])])).rows[0];
 return row;
}
function gate(req,res,next){
 const path=req.originalUrl.split('?')[0],page=needsPage(path);
 if(!page&&!needsApi(path))return next();
 customerRequired(req,res,async error=>{
  if(error){if(page)return res.redirect(303,'/customer/?continue='+encodeURIComponent(req.originalUrl)+'#invitations');return next(error);}
  try{
   if(!page){
    const owner=await resourceIdentity(path),account=req.customer;
    if(owner){
     const email=String(owner.email||'').trim().toLowerCase(),document=normalize(owner.document);
     if((email&&email!==account.email.toLowerCase())||(document&&document!==account.declared_document_key))throw forbidden('Este beneficio está destinado a otra persona. Entra con la cuenta destinataria o solicita al negocio revisar los datos.');
    }
    if(req.method==='POST'&&req.body){
     if(/\/activations\//.test(path)){delete req.body.given_names;delete req.body.first_surname;delete req.body.second_surname;}
     if(/\/reward-passes\/[^/]+\/claim$/.test(path))Object.assign(req.body,{beneficiary_name:account.full_name,beneficiary_email:account.email,beneficiary_document:account.declared_document_key});
     else if(/\/qr\/claim\/|\/stamp-cards\/programs\/[^/]+\/enroll$|\/activations\/[^/]+\/(participants|complete)$|\/trivias\/.*\/attempts$|(?:lead-qr|\/qr)$/.test(path))Object.assign(req.body,{name:account.full_name,email:account.email,customer_name:account.full_name,customer_email:account.email,document_id:account.declared_document_key,document:account.declared_document_key});
    }
   }
   next();
  }catch(e){next(e);}
 });
}
module.exports={gate,needsApi,needsPage,resourceIdentity};

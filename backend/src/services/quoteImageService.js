const dns=require('node:dns/promises');
const https=require('node:https');
const {badRequest}=require('../utils/http');
// Only public IPv4 endpoints; pin the validated address for the HTTPS request.
// No redirects, cookies, credentials, file paths or internal network requests.
function publicAddress(address){
  const octets=address.split('.').map(Number);
  if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  const [a,b]=octets;
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||
    (a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0));
}
async function storedLogo(settings,baseUrl){
  if(settings.logo_data_url){
    if(!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(settings.logo_data_url))throw badRequest('Carga el logo como imagen JPG, PNG o WebP en Cuenta.');
    return settings.logo_data_url;
  }
  if(!settings.logo_url)return null;
  let url;
  try{url=new URL(settings.logo_url,baseUrl);}catch{throw badRequest('La dirección del logo no es válida. Vuelve a cargarlo en Cuenta.');}
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw badRequest('Carga el logo en Cuenta o utiliza una imagen HTTPS pública.');
  let timer;
  try{
    const addresses=await Promise.race([dns.lookup(url.hostname,{all:true,family:4}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),5000);})]);
    clearTimeout(timer);
    if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('private address');
    const chosen=addresses[0];
    return await new Promise((resolve,reject)=>{
      const req=https.get(url,{lookup:(_host,options,cb)=>options?.all?cb(null,[chosen]):cb(null,chosen.address,4)},res=>{
        if(res.statusCode!==200||!/^image\/(png|jpeg|webp|gif)(;|$)/i.test(res.headers['content-type']||'')){res.resume();reject(new Error('invalid image'));return;}
        const chunks=[];let size=0;
        res.on('data',chunk=>{size+=chunk.length;if(size>2000000){req.destroy(new Error('image too large'));return;}chunks.push(chunk);});
        res.on('error',reject);res.on('end',()=>resolve(Buffer.concat(chunks)));
      });
      const deadline=setTimeout(()=>req.destroy(new Error('timeout')),6000);
      req.on('error',reject);req.on('close',()=>clearTimeout(deadline));
    });
  }catch{clearTimeout(timer);throw badRequest('No pudimos incorporar el logo guardado. Vuelve a cargarlo en Cuenta para generar la cotización.');}
}
module.exports={storedLogo,publicAddress};

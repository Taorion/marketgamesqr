const crypto=require('node:crypto');
const shared=require('../invoice/config');
function enabled(){try{const u=new URL(process.env.DATABASE_URL);return process.env.QORI_PLAY_SANDBOX_ENABLED==='true'&&['development','test'].includes(process.env.NODE_ENV)&&['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname==='/qori_play_qa';}catch{return false;}}
const token=()=>crypto.randomBytes(32).toString('base64url');
const validToken=t=>typeof t==='string'&&/^[A-Za-z0-9_-]{43}$/.test(t);
const origin=()=>{const u=new URL(process.env.QORI_PLAY_PUBLIC_ORIGIN||'http://127.0.0.1:3198');if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))throw shared.fault(503,'HTTPS_REQUIRED');return u.origin;};
const consent={version:'play-sandbox-1',text:'Juego de prueba para mayores de 18 años. Guardamos una sesión pseudónima, controles y resultado para operar el juego y medir participación. No accedemos a tu teléfono ni usamos estos eventos para publicidad personalizada. El reclamo de un beneficio sintético es opcional y requiere sesión Qori y autorización independiente.'};
module.exports={...shared,enabled,token,validToken,origin,consent};

const { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
function enabled() {
  // No flag can enable production in this increment.
  return process.env.QORI_INVOICE_SANDBOX_ENABLED === 'true' && ['test','development'].includes(process.env.NODE_ENV || 'development');
}
function key(name) {
  const value = process.env[name] || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw Object.assign(new Error('Invoice sandbox is not configured.'), { status:503, code:'CONFIGURATION_REQUIRED' });
  return Buffer.from(value,'hex');
}
function encryptionKey(version=Number(process.env.QORI_INVOICE_ENCRYPTION_KEY_VERSION||1)) {
  if(!Number.isInteger(version)||version<1)throw fault(503,'CONFIGURATION_REQUIRED');
  if(!process.env.QORI_INVOICE_ENCRYPTION_KEYS){if(version!==1)throw fault(503,'CONFIGURATION_REQUIRED');return key('QORI_INVOICE_ENCRYPTION_KEY');}
  let keys;try{keys=JSON.parse(process.env.QORI_INVOICE_ENCRYPTION_KEYS);}catch{throw fault(503,'CONFIGURATION_REQUIRED');}
  if(!/^[a-f0-9]{64}$/i.test(keys[version]||''))throw fault(503,'CONFIGURATION_REQUIRED');return Buffer.from(keys[version],'hex');
}
function configured() { encryptionKey(); key('QORI_INVOICE_IDENTITY_KEY'); }
const hash = value => createHash('sha256').update(value).digest('hex');
function identity(type, document, country='CO') {
  if (!/^[A-Z]{2}$/.test(country)||!['13','31','22','41'].includes(type) || !/^[A-Z0-9]{3,30}$/.test(document)) throw Object.assign(new Error('Unsupported buyer identifier.'),{status:422,code:'INVALID_IDENTITY'});
  return createHmac('sha256',key('QORI_INVOICE_IDENTITY_KEY')).update('v1|'+country+'|'+type+'|'+document).digest('hex');
}
function identityCandidates(type,document,country='CO') {
 const current=identity(type,document,country),previous=process.env.QORI_INVOICE_IDENTITY_PREVIOUS_KEYS;
 if(!previous)return [current];let keys;try{keys=JSON.parse(previous);}catch{throw fault(503,'CONFIGURATION_REQUIRED');}
 if(!Array.isArray(keys)||keys.length>2||keys.some(k=>!/^[a-f0-9]{64}$/i.test(k)))throw fault(503,'CONFIGURATION_REQUIRED');
 return [...new Set([current,...keys.map(k=>createHmac('sha256',Buffer.from(k,'hex')).update('v1|'+country+'|'+type+'|'+document).digest('hex'))])];
}
function seal(value, context) {
  const version=Number(process.env.QORI_INVOICE_ENCRYPTION_KEY_VERSION||1);
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',encryptionKey(version),iv);
  cipher.setAAD(Buffer.from(context));
  const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return JSON.stringify({v:version,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),body:body.toString('base64')});
}
function unseal(value, context) {
  const box=JSON.parse(value);
  const cipher=createDecipheriv('aes-256-gcm',encryptionKey(box.v),Buffer.from(box.iv,'base64'));
  cipher.setAAD(Buffer.from(context));cipher.setAuthTag(Buffer.from(box.tag,'base64'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(box.body,'base64')),cipher.final()]).toString('utf8'));
}
function fault(status,code) { return Object.assign(new Error(code),{status,code}); }
module.exports={enabled,configured,hash,identity,identityCandidates,seal,unseal,fault};


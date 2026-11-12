// Deployment-only content import. Uses the real maintenance operator identity;
// never mints a user token, changes a role, or calls a privileged route as another user.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {query,withTransaction,pool}=require('../backend/src/config/db');
const {fileData}=require('../backend/src/services/sellerResourceService');
async function importCollection({manifestPath,operatorEmail,apply=false,expectedDatabase}){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(manifest.status!=='VERIFIED'||!Array.isArray(manifest.resources)||manifest.resources.length!==48)throw Error('A verified 48-file manifest is required.');
 const dir=path.dirname(path.resolve(manifestPath)),seen=new Set(),prepared=[];
 for(const r of manifest.resources){
  if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(r.resource_key)||seen.has(r.resource_key))throw Error('Invalid or duplicate resource key');seen.add(r.resource_key);
  if(!['SELLER','PROSPECT','CANDIDATE'].includes(r.audience)||!['START','DISCOVER','PRESENT','CLOSE','ACTIVATE','FOLLOW_UP'].includes(r.stage))throw Error('Invalid audience or stage');
  if(!r.title||r.title.length>140||r.description.length>800||r.usage.length>2000||!r.version_label)throw Error('Invalid resource metadata');
  const file=path.resolve(dir,r.file);if(!file.startsWith(dir+path.sep))throw Error('File leaves collection directory');
  const bytes=fs.readFileSync(file);if(createHash('sha256').update(bytes).digest('hex')!==r.sha256)throw Error('File changed after review: '+r.file);
  const checked=await fileData(path.basename(file),bytes.toString('base64'));prepared.push({...r,...checked});
 }
 const database=(await query('select current_database() n')).rows[0].n;if(expectedDatabase&&database!==expectedDatabase)throw Error('Wrong database');
 const operator=(await query('select id,role::text,platform_role from app_users where lower(email)=lower($1) and is_active',[operatorEmail])).rows[0];
 if(!operator||!['ADMIN_MARKET_GAMES','QORI_SUPERADMIN'].includes(operator.platform_role||operator.role))throw Error('An active platform maintenance operator is required');
 const existing=(await query('select resource_key,sha256,revision,state from qori_seller_resources where resource_key=any($1::text[])',[[...seen]])).rows;
 for(const r of existing){const incoming=prepared.find(p=>p.resource_key===r.resource_key);if(r.sha256!==incoming.sha256)throw Error('Resource was edited or imported differently: '+r.resource_key);}
 if(!apply)return {mode:'preview',files:prepared.length,new_resources:prepared.length-existing.length,already_imported:existing.length};
 return withTransaction(async db=>{
  await db.query("select pg_advisory_xact_lock(hashtext('qori-reviewed-library-import'))");let inserted=0;
  for(const r of prepared){
   const prior=(await db.query('select id,sha256 from qori_seller_resources where resource_key=$1 for update',[r.resource_key])).rows[0];
   if(prior){if(prior.sha256!==r.sha256)throw Error('Concurrent resource change: '+r.resource_key);continue;}
   const saved=(await db.query("insert into qori_seller_resources(resource_key,title,description,usage,audience,stage,kind,state,version_label,filename,mime,content,byte_size,sha256,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'FILE','PUBLISHED',$7,$8,$9,$10,$11,$12,$13,$13) returning id",[r.resource_key,r.title,r.description,r.usage,r.audience,r.stage,r.version_label,r.filename,r.mime,r.content,r.byte_size,r.sha256,operator.id])).rows[0];
   await db.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'SELLER_LIBRARY_IMPORTED','seller_resource',$2,$3::jsonb)",[operator.id,saved.id,JSON.stringify({source:'reviewed_deployment_import',manifest_version:manifest.version,sha256:r.sha256,audience:r.audience,version_label:r.version_label,operator_role:operator.platform_role||operator.role})]);inserted++;
  }
  return {mode:'applied',files:prepared.length,inserted,unchanged:prepared.length-inserted};
 });
}
module.exports={importCollection};
if(require.main===module){
 const manifestPath=process.argv[2],apply=process.argv.includes('--apply');
 if(!manifestPath){console.error('Usage: node scripts/import-seller-collection.js <reviewed-manifest.json> [--apply]');process.exitCode=1;pool.end();}
 else importCollection({manifestPath,operatorEmail:process.env.SELLER_COLLECTION_OPERATOR_EMAIL||process.env.SEED_ADMIN_EMAIL,apply,expectedDatabase:process.env.SELLER_COLLECTION_DATABASE}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
}

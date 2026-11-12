const {Pool}=require('pg');
const {env}=require('../config/env');

// A separate, single-connection pool keeps probes bounded during a database outage.
// Only readiness is public: no credentials, schema names or database errors.
function createReadiness(db,configured=true,cacheMs=5000) {
  let saved,expires=0,pending;
  async function check() {
    if(saved&&Date.now()<expires)return saved;
    if(pending)return pending;
    pending=(async()=>{
      let ok=false;
      try{if(configured){const r=await db.query(`select
        to_regclass('public.businesses') is not null
        and to_regclass('public.app_users') is not null
        and to_regclass('public.qori_sales_accounts') is not null
        and to_regclass('public.qori_sales_prospects') is not null
        and to_regclass('public.qr_credit_purchase_orders') is not null
        and to_regclass('public.qori_seller_commissions') is not null
        and to_regclass('public.qori_seller_payouts') is not null
        and to_regclass('public.customer_accounts') is not null as ready`);ok=r.rows[0]?.ready===true;}}
      catch{ok=false;}
      saved={ok,database:ok?'ready':'unavailable'};expires=Date.now()+cacheMs;return saved;
    })();
    try{return await pending;}finally{pending=null;}
  }
  return {check};
}
const pool=new Pool({connectionString:env.databaseUrl,ssl:env.dbSsl?{rejectUnauthorized:false}:false,
  max:1,connectionTimeoutMillis:2000,statement_timeout:2000,query_timeout:2500,idleTimeoutMillis:10000,allowExitOnIdle:true});
pool.on('error',()=>{});
module.exports={...createReadiness(pool,env.databaseConfigured),createReadiness};

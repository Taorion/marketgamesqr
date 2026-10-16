// Explicit operator bootstrap. Credentials are supplied through environment variables, never committed.
const bcrypt=require("bcryptjs");
const {z}=require("zod");
const {pool,withTransaction}=require("../backend/src/config/db");
async function main(){
  const input=z.object({name:z.string().min(2).max(160),email:z.string().email(),password:z.string().min(10).max(120)}).parse({name:process.env.QORI_SUPERADMIN_NAME,email:process.env.QORI_SUPERADMIN_EMAIL,password:process.env.QORI_SUPERADMIN_PASSWORD});
  const hash=await bcrypt.hash(input.password,12);
  const user=await withTransaction(async client=>{
    await client.query("select pg_advisory_xact_lock(hashtext(lower($1)))",[input.email]);
    const existing=await client.query("select id,role,business_id from app_users where lower(email)=lower($1) for update",[input.email]);
    if(existing.rowCount && process.env.QORI_SUPERADMIN_UPGRADE_EXISTING!=="true") throw new Error("El correo ya existe. Para añadir el permiso de superadmin conservando su negocio, confirma QORI_SUPERADMIN_UPGRADE_EXISTING=true.");
    const result=existing.rowCount
      ? await client.query("update app_users set platform_role='QORI_SUPERADMIN',password_hash=$2,password_version=coalesce(password_version,0)+1,full_name=$3,is_active=true,updated_at=now() where id=$1 returning id,email,full_name,role,platform_role,business_id,is_active",[existing.rows[0].id,hash,input.name])
      : await client.query("insert into app_users(email,password_hash,full_name,role,is_active) values(lower($1),$2,$3,'QORI_SUPERADMIN',true) returning id,email,full_name,role,is_active",[input.email,hash,input.name]);
    const created=result.rows[0];
    await client.query("insert into qori_commercial_audit(actor_id,action,entity_type,entity_id,detail) values($1,'SUPERADMIN_CREATED','user',$1,$2::jsonb)",[created.id,JSON.stringify({source:"explicit_operator_bootstrap"})]);
    return created;
  });
  console.log(JSON.stringify({created:true,user}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());

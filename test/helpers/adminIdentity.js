// Only isolated QA databases may contain these fixture identities.
async function admin(query,email='cbotero@gosqori.com'){
 const database=(await query('select current_database() n')).rows[0].n;
 if(database!=='qori_customer_qa')throw Error('Admin fixtures require the isolated QA database');
 const user=(await query("insert into app_users(email,password_hash,full_name,role,is_active) values($1,'qa','Admin autorizado QA','QORI_SUPERADMIN',true) on conflict(email) do update set role='QORI_SUPERADMIN',platform_role=null,is_active=true,password_setup_required=false returning *",[email])).rows[0];
 return (await query('update app_users set password_version=0 where id=$1 returning *',[user.id])).rows[0];
}
module.exports={admin};

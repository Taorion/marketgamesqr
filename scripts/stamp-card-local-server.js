// Local-only UI fixture runner. No production credentials or data.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55439/stamp_cards_qa';
process.env.DB_SSL='false';process.env.PORT='3049';process.env.PUBLIC_APP_URL='http://127.0.0.1:3049';
process.env.JWT_SECRET='stamp-card-local-ui-only';process.env.AGENDA_PUSH_WORKER_ENABLED='false';
const bcrypt=require('bcryptjs');
const {query}=require('../backend/src/config/db');
const {app}=require('../backend/src/app');
async function main(){
  const business=(await query("select * from businesses where name='Sellos QA' order by case when id=(select business_id from app_users where email='sellos-qa@example.test') then 0 else 1 end,created_at desc limit 1")).rows[0];
  const hash=await bcrypt.hash('Sellos-QA-Local-2026!',10);
  await query(`update app_users set email='sellos-qa@example.test',password_hash=$2 where id=(select id from app_users where business_id=$1 limit 1)`,[business.id,hash]);
  await query("update stamp_programs set status='ACTIVE' where business_id=$1",[business.id]);
  await query("update businesses set settings=settings||'{\"logo_url\":\"/img/qori-logo.png\"}'::jsonb where id=$1",[business.id]);
  app.listen(3049,'127.0.0.1',()=>console.log('QA at http://127.0.0.1:3049/empresa/?view=stamp-cards · sellos-qa@example.test / Sellos-QA-Local-2026!'));
}
main().catch(e=>{console.error(e.message);process.exit(1);});

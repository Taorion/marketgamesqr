// Explicit isolated QA setup; no production connection is accepted.
process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55441/qori_customer_qa';
process.env.DB_SSL='false';process.env.NODE_ENV='test';process.env.PUBLIC_APP_URL='http://127.0.0.1:3051';
const {query,pool}=require('../backend/src/config/db'),crypto=require('crypto');
(async()=>{
 const b=(await query("select * from businesses where slug='qori-customer-local-qa'")).rows[0];
 if(!b)throw Error('Run the existing Customer local setup first.');
 const user=(await query("select * from app_users where business_id=$1 and role='BUSINESS_OWNER' limit 1",[b.id])).rows[0];
 // Fictitious recipient for local manual QA. Never sends email or touches production.
 await query("insert into customer_accounts(email,full_name) values('destinatario-customer@example.test','Camilo Demo') on conflict(email) do nothing");
 await query("insert into customer_directory(business_id,published,category,city,address,description) values($1,true,'Café y experiencias','Bogotá','Sede de prueba local','Un café, una conversación y muchas razones para volver. Descubre nuestros beneficios digitales de demostración.') on conflict(business_id) do update set published=true,city=excluded.city,description=excluded.description",[b.id]);
 const slug='customer-cafe-experience-local';
 let activity=(await query('select * from interactive_activations where public_slug=$1',[slug])).rows[0];
 if(!activity)activity=(await query("insert into interactive_activations(company_id,user_id,title,description,category,activation_type,status,public_slug,terms,capture_config,reward_config) values($1,$2,'Tu opinión vale un café','Cuéntanos qué momento del día disfrutas más. Tu siguiente café empieza aquí.','survey','FLEX_SURVEY','active',$3,'Demostración local sin valor comercial. Un beneficio por cuenta.',$4::jsonb,$5::jsonb) returning *",[b.id,user.id,slug,JSON.stringify({collect_participant_data:false}),JSON.stringify({mode:'fixed',reward_type:'FREE_GIFT',reward_value:{label:'Café de cortesía · demo'},reward_label:'Café de cortesía · demo',expiration_days:30})])).rows[0];
 if(!(await query('select 1 from interactive_activation_questions where activation_id=$1',[activity.id])).rowCount)await query("insert into interactive_activation_questions(activation_id,question_text,question_type,options,order_index) values($1,'¿Cuándo disfrutas más tu café?','single_choice',$2::jsonb,0)",[activity.id,JSON.stringify(['Al empezar el día','Después de almorzar','En una buena conversación'])]);
 const explore=require('../backend/src/services/customerExploreService');
 const program=(await query("select id from stamp_programs where business_id=$1 and status='ACTIVE' and deleted_at is null order by created_at limit 1",[b.id])).rows[0];
 let coffee=(await query("select * from business_inventory_products where business_id=$1 and internal_id='CUSTOMER-GIFT-COFFEE'",[b.id])).rows[0];
 if(!coffee)coffee=(await query("insert into business_inventory_products(business_id,internal_id,name,unit_price,cost_price,stock_quantity,currency,status) values($1,'CUSTOMER-GIFT-COFFEE','Café americano',8000,2000,100,'COP','ACTIVE') returning *",[b.id])).rows[0];
 const offers=[
  {kind:'PRODUCT',resource_id:coffee.id,title:'Un café de tu parte',description:'Regala un café americano a otra cuenta Qori Customer, con un mensaje tuyo. Demostración local, sin cobros reales.',product_price:'8000',product_valid_days:30,product_terms:'Un café americano. Una unidad y un solo canje en la sede de prueba. No requiere otra compra. Demostración sin valor comercial.',payment_instructions:'Demo local: no transfieras dinero. El negocio de prueba confirma el pago ficticio en Publicar en Qori → Regalos comprados.'},
  {kind:'ACTIVITY',resource_id:activity.id,title:'Tu opinión vale un café',description:'Cuéntanos cuál es tu momento favorito del día y descubre un café de cortesía. Activación de demostración local.'},
  {kind:'STAMP',resource_id:program.id,title:'Cada visita sabe mejor',description:'Reúne tus sellos y convierte tus visitas en tu próximo café. Tu tarjeta siempre contigo.'},
  {kind:'AFFILIATION',title:'Ser de la casa tiene sus puntos',description:'Haz parte de nuestro programa y descubre los premios de volver.'},
  {kind:'GIFT',title:'Regala una buena conversación',description:'Comparte un momento especial con una giftcard de nuestro café.'}
 ];
 for(const offer of offers)await explore.publish(user,{...offer,cover_url:'',category:'Café y experiencias',status:'PUBLISHED'});
 // Keep automated fixtures out of the human demo; retain all QA records.
 await query("update customer_directory d set published=false from businesses b where b.id=d.business_id and b.name in ('Negocio Discovery','Café regalos QA')");
 console.log(JSON.stringify({business:b.slug,activity:activity.id,activity_slug:slug,published:offers.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());

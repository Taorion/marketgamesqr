const crypto = require('crypto');
const QRCode = require('qrcode');
const { query, withTransaction } = require('../config/db');
const { env } = require('../config/env');
const { badRequest, notFound, forbidden } = require('../utils/http');
const { consumeQrCredits } = require('./qrCreditService');
const { planFromBusiness } = require('./subscriptionService');
const { resolveBeneficiary } = require('./validatorBeneficiaryService');

const normalizeDocument = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const publicUrl = token => new URL(`/sellos/#${token}`, env.publicAppUrl).toString();
function publicRules(rules) {
  const {reward_cost,ticket_cost,allow_manual,...visible}=rules;
  return visible;
}
function snapshot(program) {
  const keys = ['name','stamps_required','benefit_type','benefit_value','minimum_purchase','one_per_day',
    'allow_manual','card_valid_days','ticket_valid_days','reward_cost','ticket_cost','terms','purchase_product'];
  return Object.fromEntries(keys.map(key => [key, program[key]]));
}
async function createCycle(client, member, program, cycleNumber) {
  return (await client.query(`insert into stamp_cycles (business_id,member_id,cycle_number,rules,expires_at)
    values ($1,$2,$3,$4::jsonb,now()+make_interval(days=>$5)) returning *`,
  [member.business_id,member.id,cycleNumber,JSON.stringify(snapshot(program)),program.card_valid_days])).rows[0];
}
async function context(businessId) {
  const [business,programs,balance,inventory] = await Promise.all([
    query(`select name,settings->>'logo_data_url' as logo_data_url,settings->>'logo_url' as logo_url from businesses where id=$1`,[businessId]),
    query(`select p.*, (select count(*)::int from stamp_members m where m.program_id=p.id) as members
      from stamp_programs p where business_id=$1 order by created_at desc`,[businessId]),
    query('select qr_balance from business_qr_credit_accounts where business_id=$1',[businessId]),
    query(`select id,name,sku,internal_id from business_inventory_products
      where business_id=$1 and status='ACTIVE' order by name,id`,[businessId])
  ]);
  return { business:business.rows[0],programs:programs.rows.filter(p=>!p.deleted_at),
    deleted_programs:programs.rows.filter(p=>p.deleted_at).map(p=>({id:p.id,name:p.name,deleted_at:p.deleted_at})),
    ticket_balance:Number(balance.rows[0]?.qr_balance || 0),inventory_products:inventory.rows };
}
async function saveProgram(businessId,userId,data,id) {
  // Resolve names on the server; clients cannot attach another tenant's inventory.
  data={...data,benefit_value:{...data.benefit_value},purchase_product:data.purchase_product||null};
  const productIds=[data.purchase_product?.inventory_product_id,data.benefit_value.product_scope?.inventory_product_id].filter(Boolean);
  if (productIds.length) {
    const products=await query(`select id,name from business_inventory_products
      where business_id=$1 and id=any($2::uuid[]) and status='ACTIVE'`,[businessId,productIds]);
    const resolve=id=>{
      const product=products.rows.find(p=>p.id===id);
      if (!product) throw badRequest('Selecciona un producto activo del inventario de tu negocio.');
      return {inventory_product_id:product.id,product_name:product.name};
    };
    if (data.purchase_product) data.purchase_product=resolve(data.purchase_product.inventory_product_id);
    if (data.benefit_value.product_scope) {
      if (data.benefit_type!=='FREE_GIFT') throw badRequest('El producto de premio requiere un producto o servicio gratis.');
      data.benefit_value.product_scope={...resolve(data.benefit_value.product_scope.inventory_product_id),mode:'gift_product'};
    }
  }
  const keys=Object.keys(data),values=Object.values(data).map(v=>v && typeof v==='object'?JSON.stringify(v):v);
  if (id) {
    const result=await query(`update stamp_programs set ${keys.map((k,i)=>`${k}=$${i+3}`).join(',')},updated_at=now()
      where id=$1 and business_id=$2 and deleted_at is null returning *`,[id,businessId,...values]);
    if (!result.rowCount) throw notFound('Programa no encontrado.');
    return result.rows[0];
  }
  return (await query(`insert into stamp_programs (business_id,created_by,${keys.join(',')})
    values ($1,$2,${keys.map((_,i)=>`$${i+3}`).join(',')}) returning *`,[businessId,userId,...values])).rows[0];
}
async function deleteProgram(businessId,userId,id) {
  const result=await query(`update stamp_programs
    set status='ARCHIVED',deleted_at=coalesce(deleted_at,now()),
      deleted_by=case when deleted_at is null then $3 else deleted_by end,
      updated_at=case when deleted_at is null then now() else updated_at end
    where id=$1 and business_id=$2 returning id,deleted_at`,[id,businessId,userId]);
  if (!result.rowCount) throw notFound('Programa no encontrado.');
  return {ok:true,...result.rows[0]};
}
async function enroll(businessId,userId,data) {
  return withTransaction(async client=>{
    const program=(await client.query('select * from stamp_programs where id=$1 and business_id=$2 for share',[data.program_id,businessId])).rows[0];
    if (!program || program.status!=='ACTIVE') throw badRequest('El programa debe estar activo.');
    const document=normalizeDocument(data.document_id);
    if (document.length<3 || document.length>80) throw badRequest('Documento no válido.');
    await client.query('select pg_advisory_xact_lock(hashtext($1))',[`stamp-enroll:${program.id}:${document}`]);
    const existing=(await client.query('select * from stamp_members where program_id=$1 and document_key=$2',[program.id,document])).rows[0];
    if (existing) return { member:existing,url:publicUrl(existing.public_token),existing:true };
    const member=(await client.query(`insert into stamp_members (business_id,program_id,name,document_key,phone,email,public_token,created_by)
      values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [businessId,program.id,data.name,document,data.phone||null,data.email||null,crypto.randomBytes(32).toString('hex'),userId])).rows[0];
    await createCycle(client,member,program,1);
    return { member,url:publicUrl(member.public_token),existing:false };
  });
}
async function members(businessId,{search='',offset=0,program_id}={}) {
  const result=await query(`select m.*,p.name as program_name,p.status as program_status,p.deleted_at as program_deleted_at,p.allow_manual,c.id as cycle_id,c.cycle_number,c.stamps,c.rules,
      c.expires_at,c.claimed_at,c.review_required,q.status as ticket_status
    from stamp_members m join stamp_programs p on p.id=m.program_id
    join lateral (select * from stamp_cycles where member_id=m.id order by cycle_number desc limit 1) c on true
    left join qr_codes q on q.id=c.qr_code_id
    where m.business_id=$1 and ($2='' or m.name ilike '%'||$2||'%' or m.document_key ilike '%'||$2||'%')
      and ($4::uuid is null or m.program_id=$4)
    order by m.created_at desc,m.id limit 26 offset $3`,[businessId,search,offset,program_id||null]);
  return { members:result.rows.slice(0,25).map(m=>({...m,url:publicUrl(m.public_token)})),has_more:result.rows.length>25 };
}
async function manualStamp(businessId,userId,memberId,{reference,note}) {
  return withTransaction(async client=>{
    const m=(await client.query('select * from stamp_members where id=$1 and business_id=$2 for update',[memberId,businessId])).rows[0];
    if (!m) throw notFound('Tarjeta no encontrada.');
    const existing=(await client.query('select id from stamp_events where member_id=$1 and source_key=$2',[m.id,`manual:${reference}`])).rows[0];
    if (existing) return {duplicate:true};
    const p=(await client.query('select status,allow_manual from stamp_programs where id=$1 and business_id=$2 for no key update',[m.program_id,businessId])).rows[0];
    const c=(await client.query('select * from stamp_cycles where member_id=$1 order by cycle_number desc limit 1 for update',[m.id])).rows[0];
    if (p.status!=='ACTIVE') throw badRequest('El programa debe estar activo para registrar visitas.');
    if (!p.allow_manual) throw badRequest('Habilita los sellos manuales en la configuración del programa para registrar esta visita.');
    if (c.claimed_at || c.stamps>=c.rules.stamps_required || new Date(c.expires_at)<=new Date()) throw badRequest('Esta tarjeta está completa o vencida. El cliente puede iniciar una nueva desde su enlace.');
    // Operational permission follows the program; earned benefits retain their original rules.
    const result=await client.query(`insert into stamp_events (business_id,member_id,cycle_id,source,source_key,note,actor_id,daily_guard_date)
      values ($1,$2,$3,'MANUAL',$4,$5,$6,case when $7 then (now() at time zone 'America/Bogota')::date end)
      on conflict do nothing returning id`,[businessId,m.id,c.id,`manual:${reference}`,note,userId,c.rules.one_per_day]);
    if (!result.rowCount) throw badRequest('El cliente ya recibió su sello de hoy.');
    return {duplicate:false};
  });
}
async function voidStamp(businessId,userId,id,reason) {
  return withTransaction(async client=>{
    const event=(await client.query('select * from stamp_events where id=$1 and business_id=$2',[id,businessId])).rows[0];
    if (!event) throw notFound('Sello no encontrado.');
    await client.query('select id from stamp_members where id=$1 for update',[event.member_id]);
    await client.query(`update stamp_events set voided_at=now(),void_reason=$3 where id=$1 and business_id=$2 and voided_at is null`,[id,businessId,`${reason} · Responsable ${userId}`]);
    return {ok:true};
  });
}
async function memberByToken(client,token,lock=false) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw notFound('Enlace de tarjeta no válido.');
  const member=(await client.query(`select m.* from stamp_members m join businesses b on b.id=m.business_id
    where m.public_token=$1 and b.is_active=true ${lock?'for update of m':''}`,[token])).rows[0];
  if (!member) throw notFound('Tarjeta no encontrada.');
  return member;
}
async function publicCard(token) {
  const member=await memberByToken({query},token);
  const [program,business,cycles,events]=await Promise.all([
    query('select * from stamp_programs where id=$1',[member.program_id]),
    query(`select name,settings->>'logo_data_url' as logo_data_url,settings->>'logo_url' as logo_url from businesses where id=$1`,[member.business_id]),
    query(`select c.*,q.token as ticket_token,q.status as ticket_status,q.expires_at as ticket_expires_at
      from stamp_cycles c left join qr_codes q on q.id=c.qr_code_id where c.member_id=$1 order by cycle_number desc limit 10`,[member.id]),
    query(`select e.created_at,e.source,e.voided_at,c.cycle_number from stamp_events e join stamp_cycles c on c.id=e.cycle_id
      where e.member_id=$1 order by e.created_at desc limit 50`,[member.id])
  ]);
  return { name:member.name.split(' ')[0],business:business.rows[0],program:{status:program.rows[0].status,deleted:Boolean(program.rows[0].deleted_at),
    name:program.rows[0].name,next_rules:publicRules(snapshot(program.rows[0]))},
    cycles:await Promise.all(cycles.rows.map(async c=>({id:c.id,cycle_number:c.cycle_number,rules:publicRules(c.rules),stamps:c.stamps,
      expires_at:c.expires_at,claimed_at:c.claimed_at,review_required:c.review_required,ticket_status:c.ticket_status,
      ticket_expires_at:c.ticket_expires_at,...(c.ticket_token?await ticketOutput(c.ticket_token):{})}))),events:events.rows };
}
async function ticketOutput(token) {
  const url=new URL('/empresa/',env.publicAppUrl);url.searchParams.set('view','validator');url.searchParams.set('token',token);
  return {qr_image:await QRCode.toDataURL(url.toString()),ticket_code:token};
}
async function claim(token,cycleId) {
  const result=await withTransaction(async client=>{
    const m=await memberByToken(client,token,true);
    const c=(await client.query('select * from stamp_cycles where id=$1 and member_id=$2 for update',[cycleId,m.id])).rows[0];
    if (!c) throw notFound('Tarjeta no encontrada.');
    if (c.qr_code_id) {
      const q=(await client.query('select token from qr_codes where id=$1',[c.qr_code_id])).rows[0];
      return {token:q.token,already_claimed:true};
    }
    if (new Date(c.expires_at)<=new Date()) throw badRequest('La tarjeta está vencida.');
    if (c.stamps<Number(c.rules.stamps_required)) throw badRequest('Aún faltan sellos para generar el beneficio.');
    const business=(await client.query('select * from businesses where id=$1 and is_active=true',[m.business_id])).rows[0];
    const plan=planFromBusiness(business || {});
    if (!business || !plan.portal_access_allowed || !plan.features?.portal_access) throw forbidden('El negocio debe activar su acceso al portal para generar beneficios.');
    const {player}=await resolveBeneficiary(client,{businessId:m.business_id,documentRequired:true,
      input:{name:m.name,document_id:m.document_key,phone:m.phone,email:m.email,data_use_confirmed:true,capture_source:'TICKET'},
      operationKey:`stamp-card:${c.id}`});
    const qrToken=crypto.randomBytes(32).toString('hex');
    const qr=(await client.query(`insert into qr_codes (business_id,player_id,token,status,origin_type,benefit_type,benefit_value,
      expires_at,claim_required,claimed_at,claimed_by_player_id,metadata)
      values ($1,$2,$3,'ACTIVE','LOYALTY',$4,$5::jsonb,now()+make_interval(days=>$6),false,now(),$2,$7::jsonb) returning id`,
    [m.business_id,player.id,qrToken,c.rules.benefit_type,JSON.stringify(c.rules.benefit_value),c.rules.ticket_valid_days,
      JSON.stringify({source:'STAMP_CARD',stamp_cycle_id:c.id,stamp_member_id:m.id,stamp_program_id:m.program_id,terms:c.rules.terms})])).rows[0];
    await consumeQrCredits(client,m.business_id,1,qr.id,null,`Tarjeta de sellos · ${c.rules.name} · ciclo ${c.cycle_number}`);
    await client.query('update stamp_cycles set qr_code_id=$2,claimed_at=now() where id=$1',[c.id,qr.id]);
    return {token:qrToken,already_claimed:false};
  });
  return {...await ticketOutput(result.token),already_claimed:result.already_claimed};
}
async function renew(token) {
  return withTransaction(async client=>{
    const m=await memberByToken(client,token,true);
    const p=(await client.query('select * from stamp_programs where id=$1 for share',[m.program_id])).rows[0];
    if (p.status!=='ACTIVE') throw badRequest('El negocio ha pausado las nuevas tarjetas.');
    const c=(await client.query('select * from stamp_cycles where member_id=$1 order by cycle_number desc limit 1',[m.id])).rows[0];
    if (!c.claimed_at && new Date(c.expires_at)>new Date()) return {cycle:c};
    return {cycle:await createCycle(client,m,p,c.cycle_number+1)};
  });
}
async function history(businessId,{offset=0,program_id,from,to,search=''}={}) {
  const result=await query(`select e.*,m.name,m.document_key,p.name as program_name,c.cycle_number,c.rules->>'stamps_required' as goal,
      c.stamps,c.claimed_at,c.review_required,q.status as ticket_status
    from stamp_events e join stamp_members m on m.id=e.member_id join stamp_programs p on p.id=m.program_id
    join stamp_cycles c on c.id=e.cycle_id left join qr_codes q on q.id=c.qr_code_id
    where e.business_id=$1 and ($2::uuid is null or m.program_id=$2)
      and e.created_at >= ($3::date::timestamp at time zone 'America/Bogota') and e.created_at < (($4::date+1)::timestamp at time zone 'America/Bogota')
      and ($6='' or m.name ilike '%'||$6||'%' or m.document_key ilike '%'||$6||'%')
    order by e.created_at desc,e.id limit 51 offset $5`,[businessId,program_id||null,from,to,offset,search]);
  return {events:result.rows.slice(0,50),has_more:result.rows.length>50};
}
async function dashboard(businessId,{program_id,from,to}) {
  const params=[businessId,program_id||null,from,to];
  const filter=`m.business_id=$1 and ($2::uuid is null or m.program_id=$2)`;
  const [events,cycles,trend,customers]=await Promise.all([
    query(`with eligible as (select e.*,m.document_key,
        row_number() over(partition by coalesce(e.sale_id::text,e.id::text) order by e.created_at,e.id) as sale_copy
      from stamp_events e join stamp_members m on m.id=e.member_id where ${filter} and e.voided_at is null),
      ordered as (select *,row_number() over(partition by document_key order by occurred_at,id) as visit
        from eligible where sale_copy=1)
      select count(*)::int as stamps,count(distinct document_key)::int as active_customers,
        count(*) filter(where visit>1)::int as return_visits,
        count(distinct document_key) filter(where visit>1)::int as returning_customers,
        coalesce(sum(sale_amount),0) as linked_sales,
        coalesce(sum(sale_amount) filter(where visit>1),0) as return_sales,
        count(*) filter(where source='MANUAL')::int as manual_visits
      from ordered where created_at >= ($3::date::timestamp at time zone 'America/Bogota') and created_at < (($4::date+1)::timestamp at time zone 'America/Bogota')`,params),
    query(`select count(*) filter(where c.completed_at >= ($3::date::timestamp at time zone 'America/Bogota') and c.completed_at < (($4::date+1)::timestamp at time zone 'America/Bogota'))::int as completed,
      count(*) filter(where c.claimed_at >= ($3::date::timestamp at time zone 'America/Bogota') and c.claimed_at < (($4::date+1)::timestamp at time zone 'America/Bogota'))::int as issued,
      count(*) filter(where q.redeemed_at >= ($3::date::timestamp at time zone 'America/Bogota') and q.redeemed_at < (($4::date+1)::timestamp at time zone 'America/Bogota'))::int as redeemed,
      count(*) filter(where c.claimed_at is null and c.stamps >= (c.rules->>'stamps_required')::int and c.expires_at>now())::int as pending,
      count(*) filter(where c.review_required)::int as needs_review,
      coalesce(sum((c.rules->>'ticket_cost')::numeric) filter(where c.claimed_at >= ($3::date::timestamp at time zone 'America/Bogota') and c.claimed_at < (($4::date+1)::timestamp at time zone 'America/Bogota')),0)
       +coalesce(sum((c.rules->>'reward_cost')::numeric) filter(where q.redeemed_at >= ($3::date::timestamp at time zone 'America/Bogota') and q.redeemed_at < (($4::date+1)::timestamp at time zone 'America/Bogota')),0) as estimated_cost
      from stamp_cycles c join stamp_members m on m.id=c.member_id left join qr_codes q on q.id=c.qr_code_id where ${filter}`,params),
    query(`with eligible as (select e.*,row_number() over(partition by coalesce(e.sale_id::text,e.id::text) order by e.created_at,e.id) as sale_copy
      from stamp_events e join stamp_members m on m.id=e.member_id
      where ${filter} and e.voided_at is null and e.created_at >= ($3::date::timestamp at time zone 'America/Bogota') and e.created_at < (($4::date+1)::timestamp at time zone 'America/Bogota')
      ) select (created_at at time zone 'America/Bogota')::date as day,count(*)::int as stamps,
      coalesce(sum(sale_amount) filter(where sale_copy=1),0) as sales from eligible group by 1 order by 1`,params),
    query(`select count(distinct document_key)::int as total_customers from stamp_members m where ${filter}`,params.slice(0,2))
  ]);
  const metrics={...events.rows[0],...cycles.rows[0],...customers.rows[0]};
  metrics.return_rate=metrics.active_customers?Math.round(metrics.returning_customers/metrics.active_customers*100):0;
  metrics.estimated_return_pct=Number(metrics.estimated_cost)>0?Math.round((Number(metrics.linked_sales)-Number(metrics.estimated_cost))/Number(metrics.estimated_cost)*100):null;
  return {metrics,trend:trend.rows};
}
module.exports={normalizeDocument,snapshot,publicRules,context,saveProgram,deleteProgram,enroll,members,manualStamp,voidStamp,publicCard,claim,renew,history,dashboard};

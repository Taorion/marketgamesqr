const crypto = require('node:crypto');
const { withTransaction } = require('../config/db');
const { badRequest, forbidden, notFound } = require('../utils/http');
const core = require('../../../activacion/policias-core');
const TYPE = 'QORI_CHASE';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => Array.from({length:6},()=>alphabet[crypto.randomInt(alphabet.length)]).join('');
const signature = a => crypto.createHash('sha256').update(JSON.stringify([core.VERSION,core.normalize(a.game_config),a.reward_mode,a.reward_config])).digest('hex');
function assertOpen(a){if(a.status!=='active'||a.starts_at&&new Date(a.starts_at)>new Date()||a.ends_at&&new Date(a.ends_at)<=new Date())throw badRequest('Esta activación no está disponible.');}
// Only authenticated ownership can recover a token when this browser has no saved session.
// Commercial completion remains immutable; entering the game never claims another reward.
async function customerSession(client,activationId,customerId){
  const row=(await client.query(`select p.id,p.status participant_status,p.game_session_token,a.status,a.starts_at,a.ends_at
    from customer_activation_participations cp
    join interactive_activation_participants p on p.id=cp.participant_id and p.activation_id=cp.activation_id
    join interactive_activations a on a.id=cp.activation_id
    where cp.customer_id=$1 and cp.activation_id=$2 and a.activation_type=$3`,[customerId,activationId,TYPE])).rows[0];
  if(!row)return null;
  assertOpen(row);
  if(row.participant_status==='disqualified'||!row.game_session_token)throw forbidden('Esta participación no puede volver al juego.');
  return {participant:{id:row.id,status:row.participant_status},game_session_token:row.game_session_token};
}
function snapshot(row,id,now=Date.now()){
  const s=row.state;
  return {...s,id:row.id,code:row.code,host_id:row.host_id,server_now:now,
    players:s.players.map(({input,seq,seen,...p})=>({...p,input_sequence:seq??-1,connected:now-seen<core.CONFIG.disconnected_ms})),own_id:id};
}
async function save(client,row){
  await client.query('update qori_chase_rooms set state=$2,status=$3,expires_at=to_timestamp($4/1000.0) where id=$1',[row.id,row.state,row.state.status,row.state.expires]);
  if(row.state.status==='finished') {
    await client.query('insert into qori_chase_rounds(id,room_id,state) values($1,$2,$3) on conflict(id) do nothing',[row.state.round_id,row.id,row.state]);
    if(row.state.round===1)await client.query(`insert into qori_chase_results(participant_id,room_id,round_id)
      select (p->>'id')::uuid,$1,$2 from jsonb_array_elements($3::jsonb) p on conflict(participant_id) do nothing`,[row.id,row.state.round_id,JSON.stringify(row.state.players)]);
  }
}
async function advanceRoom(client,row,now){core.advance(row.state,now);await save(client,row);}
async function leaveRoom(client,row,participantId,now){
  const s=row.state,own=s.players.find(p=>p.id===participantId);
  if(own&&['running','countdown'].includes(s.status)){
    own.abandoned=true;own.seen=now-core.CONFIG.abandon_ms;own.input={x:0,y:0,until:0};
    if(own.team==='thief')core.capture(s,own,null,now,'abandon');
    core.contacts(s,now);
  }
  // Freeze the result before changing membership, including a last-thief departure.
  await save(client,row);
  await client.query('delete from qori_chase_members where participant_id=$1 and room_id=$2',[participantId,row.id]);
  const members=(await client.query('select participant_id from qori_chase_members where room_id=$1',[row.id])).rows;
  if(s.status==='waiting'){s.players=s.players.filter(p=>p.id!==participantId);core.balance(s.players);}
  if(!members.length)s.status='closed';
  else if(row.host_id===participantId){row.host_id=members[0].participant_id;await client.query('update qori_chase_rooms set host_id=$2 where id=$1',[row.id,row.host_id]);}
  await save(client,row);
}
async function act(slug,body,{customerId,transaction=withTransaction}={}){
  return transaction(async client=>{
    await client.query("set local statement_timeout='8s'");
    const a=(await client.query('select * from interactive_activations where public_slug=$1',[slug])).rows[0];
    if(a?.activation_type!==TYPE)throw notFound('Activación no encontrada.');
    const p=(await client.query('select * from interactive_activation_participants where id=$1 and activation_id=$2',[body.participant_id,a.id])).rows[0];
    if(!p?.game_session_token||p.game_session_token!==body.game_session_token)throw forbidden('Sesión de juego inválida.');
    if(customerId&&!(await client.query('select 1 from customer_activation_participations where customer_id=$1 and participant_id=$2',[customerId,p.id])).rowCount)throw forbidden('La partida no pertenece a tu cuenta.');
    // Serialize membership changes even when two tabs create/leave simultaneously.
    if(['create','join','leave','resume'].includes(body.action))await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[p.id]);
    let prior=(await client.query('select room_id from qori_chase_members where participant_id=$1',[p.id])).rows[0];
    if(body.action==='leave'&&body.room_id&&prior?.room_id!==body.room_id)return {room:null,can_play:true};
    let row;
    const now=Date.now();
    if(prior&&['resume','create','join'].includes(body.action)){
      const previous=(await client.query('select * from qori_chase_rooms where id=$1 and activation_id=$2 for update',[prior.room_id,a.id])).rows[0];
      if(previous){
        core.advance(previous.state,now);
        if(previous.state.status!=='finished'&&previous.signature!==signature(a))previous.state.status='closed';
        if(previous.state.status==='closed'){await leaveRoom(client,previous,p.id,now);prior=null;}
      }
    }
    const entry=body.action==='resume'?{has_result:!!(await client.query('select 1 from qori_chase_results where participant_id=$1',[p.id])).rowCount}:{};
    if(['resume','leave'].includes(body.action)&&!prior)return {room:null,can_play:true,...entry};
    // A completed participant may keep playing, with the original result/reward locked.
    if(['create','join'].includes(body.action)&&p.status!=='started'&&
      (!['completed','rewarded'].includes(p.status)||!(await client.query('select 1 from qori_chase_results where participant_id=$1',[p.id])).rowCount))throw badRequest('Esta participación no puede iniciar otra sala.');
    if(body.action==='create'&&!prior){
      assertOpen(a);
      if((await client.query('select 1 from qori_chase_members where participant_id=$1',[p.id])).rowCount)throw badRequest('Ya tienes una sala. Vuelve a conectar.');
      const state=core.lobby(now);state.config=core.normalize(a.game_config);
      for(let attempt=0;attempt<5&&!row;attempt++)row=(await client.query('insert into qori_chase_rooms(activation_id,code,host_id,signature,state) values($1,$2,$3,$4,$5) on conflict(activation_id,code) do nothing returning *',[a.id,code(),p.id,signature(a),state])).rows[0];
      if(!row)throw badRequest('No se pudo crear la sala. Intenta de nuevo.');
    }else{
      row=prior?(await client.query('select * from qori_chase_rooms where id=$1 and activation_id=$2 for update',[prior.room_id,a.id])).rows[0]
        :(await client.query('select * from qori_chase_rooms where code=$1 and activation_id=$2 for update',[body.code||'',a.id])).rows[0];
      if(!row)throw notFound('No encontramos esa sala en esta activación.');
      if(body.action==='join'&&row.code!==body.code)throw badRequest('Sal de tu sala actual antes de unirte a otra.');
    }
    const s=row.state;
    if(s.round>0&&['ready','start','restart'].includes(body.action)&&body.round_id!==s.round_id)throw badRequest('La ronda cambió. Actualiza la sala e intenta de nuevo.');
    core.advance(s,now);
    if(s.status!=='finished'&&row.signature!==signature(a))s.status='closed';
    let own=s.players.find(q=>q.id===p.id);
    if(!own){
      if(!['create','join'].includes(body.action))throw forbidden('No perteneces a esta sala.');
      assertOpen(a);
      if(s.status!=='waiting')throw badRequest('La sala ya comenzó o está cerrada.');
      if(s.players.length>=8)throw badRequest('La sala ya tiene 8 jugadores.');
      const alias=String(body.alias||'').trim();if(!alias||alias.length>16)throw badRequest('Escribe un apodo de 1 a 16 caracteres.');
      const inserted=await client.query('insert into qori_chase_members(room_id,participant_id) values($1,$2) on conflict(participant_id) do nothing returning participant_id',[row.id,p.id]);
      if(!inserted.rowCount)throw badRequest('Ya perteneces a otra sala.');
      own={id:p.id,name:alias,color:core.COLORS.find(c=>!s.players.some(q=>q.color===c)),ready:false,seen:now,captured:false};s.players.push(own);core.balance(s.players);
    }
    // Advance before heartbeat: reconnecting cannot erase an abandonment already due.
    own.seen=now;
    if(s.status==='waiting'&&!s.players.some(q=>q.id===row.host_id&&now-q.seen<core.CONFIG.disconnected_ms))row.host_id=own.id;
    await client.query('update qori_chase_rooms set host_id=$2 where id=$1',[row.id,row.host_id]);
    if(body.action==='leave'){
      await leaveRoom(client,row,p.id,now);return {room:null,can_play:true};
    }
    if(body.action==='ready'){
      if(s.status!=='waiting')throw badRequest('La sala no está esperando jugadores.');own.ready=body.ready===true;
    }
    if(body.action==='start'){
      assertOpen(a);
      if(row.host_id!==p.id||s.status!=='waiting')throw forbidden('Solo el anfitrión puede iniciar la sala en espera.');
      if(s.players.length<2||s.players.length>8||s.players.some(q=>now-q.seen>=core.CONFIG.disconnected_ms))throw badRequest('Se necesitan entre 2 y 8 jugadores conectados.');
      core.balance(s.players);core.start(s,now,crypto.randomUUID(),a.game_config);
    }
    if(body.action==='restart'){
      assertOpen(a);
      if(row.signature!==signature(a))throw badRequest('La configuración cambió. Vuelve a las salas para crear una nueva.');
      if(s.status==='waiting')return {room:snapshot(row,p.id,now)};
      if(!['finished','closed'].includes(s.status)||!s.finished||body.round_id!==s.round_id)throw badRequest('Espera a que termine esta ronda.');
      const host=s.players.find(q=>q.id===row.host_id);
      if(row.host_id!==p.id&&host&&now-host.seen<core.CONFIG.disconnected_ms)throw forbidden('El anfitrión prepara la revancha.');
      await save(client,row); // archive exact finished round before resetting
      row.host_id=p.id;
      const members=(await client.query('select participant_id from qori_chase_members where room_id=$1',[row.id])).rows.map(m=>m.participant_id);
      s.players=s.players.filter(q=>members.includes(q.id)&&now-q.seen<core.CONFIG.disconnected_ms);
      await client.query('delete from qori_chase_members where room_id=$1 and not(participant_id=any($2::uuid[]))',[row.id,s.players.map(q=>q.id)]);
      Object.assign(s,{status:'waiting',winner:null,reason:null,events:[],expires:now+core.CONFIG.lobby_ms});
      for(const q of s.players)Object.assign(q,{ready:false,captured:false,abandoned:false,input:null});
      core.balance(s.players);
      await client.query('update qori_chase_rooms set host_id=$2 where id=$1',[row.id,p.id]);
    }
    if(body.action==='input')core.input(s,own,body,now);
    await save(client,row);
    return {room:snapshot(row,p.id,now),...entry};
  });
}
// A signed WebSocket ticket binds both the participant and activation. No client poses.
async function streamAction(claims,body){
  return withTransaction(async client=>{
    const row=(await client.query(`select r.* from qori_chase_rooms r join qori_chase_members m on m.room_id=r.id
      where r.id=$1 and r.activation_id=$2 and m.participant_id=$3 for update of r`,[claims.room,claims.activation,claims.sub])).rows[0];
    if(!row)throw forbidden('Sesión de sala terminada.');
    const now=Date.now();core.advance(row.state,now);
    const p=row.state.players.find(q=>q.id===claims.sub);if(!p)throw forbidden('Jugador ausente.');
    p.seen=now;if(body.type==='input')core.input(row.state,p,body,now);
    await save(client,row);return snapshot(row,claims.sub,now);
  });
}
async function tick(roomId){return withTransaction(async client=>{
  const row=(await client.query('select * from qori_chase_rooms where id=$1 for update skip locked',[roomId])).rows[0];
  if(!row)return null;await advanceRoom(client,row,Date.now());return snapshot(row,null);
});}
async function sweep(){return withTransaction(async client=>{
  const rows=(await client.query("select * from qori_chase_rooms where (status in ('waiting','finished') and expires_at<=now()) or (status in ('countdown','running') and (state->>'updated')::numeric < extract(epoch from now())*1000-1000) order by expires_at limit 128 for update skip locked")).rows;
  for(const row of rows)await advanceRoom(client,row,Date.now());
});}
async function claim(slug,body,{complete,transaction=withTransaction,customerId}={}){
  return transaction(async client=>{
    const row=(await client.query(`select r.*,a.reward_mode,a.reward_config,a.game_config from qori_chase_rooms r join interactive_activations a on a.id=r.activation_id
      join qori_chase_results m on m.room_id=r.id where a.public_slug=$1 and m.participant_id=$2`,[slug,body.participant_id])).rows[0];
    if(!row)throw forbidden('Sala inválida.');
    const p=(await client.query('select * from interactive_activation_participants where id=$1',[body.participant_id])).rows[0];
    if(!p?.game_session_token||p.game_session_token!==body.game_session_token)throw forbidden('Sesión inválida.');
    if(customerId&&!(await client.query('select 1 from customer_activation_participations where customer_id=$1 and participant_id=$2',[customerId,p.id])).rowCount)throw forbidden('La partida no pertenece a tu cuenta.');
    const member=(await client.query('select * from qori_chase_results where participant_id=$1 for update',[p.id])).rows[0];
    if(member.result)return member.result;
    if(row.signature!==signature(row))throw badRequest('La configuración del beneficio cambió. Consulta al organizador.');
    const round=(await client.query("select state from qori_chase_rounds where room_id=$1 and state->>'round'='1'",[row.id])).rows[0]?.state;
    const own=round?.players.find(q=>q.id===p.id);if(!own)throw badRequest('Termina la primera ronda para registrar tu resultado.');
    const outcome={roomId:row.id,roundId:round.round_id,won:round.winner===own.team,team:own.team,captured:own.captured,reason:round.reason};
    const result=await (complete||require('./interactiveActivationService').completeInteractiveParticipant)(slug,{participant_id:p.id,game_session_token:p.game_session_token,score:outcome.won?1:0,duration_ms:round.finished-round.starts},{client,allowIdentityRecovery:false,chaseResult:outcome});
    delete result.credit_account;
    await client.query('update qori_chase_results set result=$2 where participant_id=$1',[p.id,result]);
    await client.query('update customer_activation_participations set result=$2 where participant_id=$1',[p.id,result]);return result;
  });
}
// Completion/rewards are retried independently after the immutable game outcome commits.
// A lack of reward inventory can never keep a chase running or change its winner.
async function settle(){
  const {query}=require('../config/db');
  const pending=(await query(`select m.participant_id,p.game_session_token,a.public_slug from qori_chase_results m
    join interactive_activation_participants p on p.id=m.participant_id join qori_chase_rooms r on r.id=m.room_id
    join interactive_activations a on a.id=r.activation_id where m.result is null and m.next_attempt_at<=now() and m.attempts<120
    order by m.next_attempt_at limit 16`)).rows;
  for(const p of pending){
    await query("update qori_chase_results set next_attempt_at=now()+interval '30 seconds',attempts=attempts+1 where participant_id=$1 and result is null",[p.participant_id]);
    try{await claim(p.public_slug,p);}catch(_){/* The participant can retry from the result screen after the organizer fixes availability. */}
  }
}
module.exports={TYPE,signature,act,tick,sweep,settle,streamAction,snapshot,claim,customerSession};

const crypto = require('node:crypto');
const { withTransaction } = require('../config/db');
const { badRequest, forbidden, notFound } = require('../utils/http');
const core = require('../../../activacion/cumbre-core');
const policy = require('./summitGamePolicy');
const rules = require('./summitRaceRules');

function assertOpen(a) {
  if (!a || a.activation_type !== policy.TYPE) throw notFound('Cumbre no encontrada.');
  if (a.status !== 'active' || a.starts_at && new Date(a.starts_at) > new Date() || a.ends_at && new Date(a.ends_at) <= new Date()) throw badRequest('Esta activación no está disponible.');
}
function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
}

// The room row serializes contenders. The winner and canonical reward commit together.
async function act(slug, body, { customerId, transaction = withTransaction, complete } = {}) {
  return transaction(async client => {
    await client.query("set local statement_timeout = '10s'");
    const a = (await client.query('select * from interactive_activations where public_slug=$1', [slug])).rows[0];
    if (!a || a.activation_type !== policy.TYPE) throw notFound('Cumbre no encontrada.');
    const p = (await client.query('select * from interactive_activation_participants where id=$1 and activation_id=$2', [body.participant_id, a.id])).rows[0];
    if (!p?.game_session_token || p.game_session_token !== body.game_session_token) throw forbidden('Sesión de juego inválida.');
    if (customerId) {
      const own = await client.query('select 1 from customer_activation_participations where customer_id=$1 and participant_id=$2', [customerId, p.id]);
      if (!own.rowCount) throw forbidden('Esta partida no pertenece a tu cuenta.');
    }
    const prior = (await client.query('select room_id from qori_summit_members where participant_id=$1', [p.id])).rows[0];
    if (body.action === 'resume' && !prior) return { room: null };
    let room;
    if (body.action === 'create' && !prior) {
      assertOpen(a);
      if (p.completed_at || p.game_session_completed_at || p.status !== 'started') throw badRequest('Esta participación ya terminó.');
      // A participant cannot create two rooms concurrently.
      const locked = (await client.query('select * from interactive_activation_participants where id=$1 for update', [p.id])).rows[0];
      if (locked.completed_at || locked.game_session_completed_at || locked.status !== 'started') throw badRequest('Esta participación ya terminó.');
      const again = (await client.query('select room_id from qori_summit_members where participant_id=$1', [p.id])).rows[0];
      if (again) throw badRequest('Ya tienes una sala. Pulsa volver a conectar.');
      for (let attempt = 0; attempt < 5 && !room; attempt++) {
        room = (await client.query(`insert into qori_summit_rooms(activation_id,code,host_id,seed,signature,config,prize)
          values($1,$2,$3,$4,$5,$6::jsonb,$7) on conflict(activation_id,code) do nothing returning *`,
        [a.id, makeCode(), p.id, crypto.randomUUID(), policy.signature(a), JSON.stringify(core.normalize(a.game_config)), String(a.reward_config?.reward_label || 'Premio de la cima')])).rows[0];
      }
      if (!room) throw badRequest('No se pudo crear la sala. Intenta de nuevo.');
    } else {
      room = prior
        ? (await client.query('select * from qori_summit_rooms where id=$1 and activation_id=$2 for update', [prior.room_id, a.id])).rows[0]
        : (await client.query('select * from qori_summit_rooms where code=$1 and activation_id=$2 for update', [body.code || '', a.id])).rows[0];
      if (!room) throw notFound('No encontramos esa sala en esta activación.');
      if (body.action === 'join' && body.code !== room.code) throw badRequest('Ya estás en otra sala. Sal de ella antes de unirte.');
    }
    let members = (await client.query('select * from qori_summit_members where room_id=$1 order by participant_id', [room.id])).rows;
    let own = members.find(m => m.participant_id === p.id);
    const now = Date.now();
    const deadline = room.starts_at ? new Date(room.starts_at).getTime() + room.config.duration_seconds * 1000 + 2000 : new Date(room.expires_at).getTime();
    if (['waiting', 'racing'].includes(room.status) && (now > deadline || room.signature !== policy.signature(a))) {
      room.status = 'expired';
      await client.query("update qori_summit_rooms set status='expired' where id=$1", [room.id]);
    }
    if (!own) {
      if (!['create', 'join'].includes(body.action)) throw forbidden('No perteneces a esta sala.');
      assertOpen(a);
      if (room.status !== 'waiting') throw badRequest('La carrera ya comenzó o la sala venció.');
      if (p.metadata?.summit_signature !== room.signature) throw badRequest('El premio cambió. Inicia una nueva participación.');
      if (members.length >= 8) throw badRequest('La sala ya tiene 8 jugadores.');
      const locked = (await client.query('select * from interactive_activation_participants where id=$1 for update', [p.id])).rows[0];
      if (locked.completed_at || locked.game_session_completed_at || locked.status !== 'started') throw badRequest('Esta participación ya terminó.');
      const alias = String(body.alias || '').trim();
      if (!alias || alias.length > 24) throw badRequest('Escribe un apodo de máximo 24 caracteres.');
      own = (await client.query(`insert into qori_summit_members(room_id,participant_id,alias,state)
        values($1,$2,$3,$4::jsonb) on conflict(participant_id) do nothing returning *`,
      [room.id, p.id, alias, JSON.stringify(core.create(room.config, room.seed))])).rows[0];
      if (!own) throw badRequest('Ya perteneces a otra sala.');
      members.push(own);
    }
    if (body.action === 'leave') {
      if (room.status !== 'waiting') throw badRequest('La carrera ya comenzó. Puedes volver a conectar con esta sesión.');
      await client.query('delete from qori_summit_members where participant_id=$1', [p.id]);
      members = members.filter(m => m.participant_id !== p.id);
      if (members.length) {
        if (room.host_id === p.id) await client.query('update qori_summit_rooms set host_id=$2 where id=$1', [room.id, members[0].participant_id]);
      } else await client.query('delete from qori_summit_rooms where id=$1', [room.id]);
      return { room: null };
    }
    if (body.action === 'ready') {
      if (room.status !== 'waiting') throw badRequest('La carrera ya comenzó.');
      own.ready = body.ready === true;
      await client.query('update qori_summit_members set ready=$2 where participant_id=$1', [p.id, own.ready]);
    }
    if (body.action === 'start') {
      assertOpen(a);
      if (room.status !== 'waiting' || room.host_id !== p.id) throw forbidden('Solo quien organiza puede iniciar la sala en espera.');
      const connected = members.filter(m => m.participant_id === p.id || now - new Date(m.updated_at).getTime() < 8000);
      if (connected.length < 2) throw badRequest('Se necesitan al menos 2 jugadores conectados para iniciar.');
      room.status = 'racing'; room.starts_at = new Date(now + 3000).toISOString();
      await client.query("update qori_summit_rooms set status='racing',starts_at=$2 where id=$1", [room.id, room.starts_at]);
    }
    if (body.action === 'input' && room.status === 'racing') {
      assertOpen(a);
      const won = rules.advance(room, own, body, now);
      await client.query('update qori_summit_members set state=$2::jsonb,trace=$3::jsonb where participant_id=$1', [p.id, JSON.stringify(own.state), JSON.stringify(own.trace)]);
      if (won) {
        // A trusted internal argument authorizes the shared seed. HTTP bodies cannot supply it.
        const finish = complete || require('./interactiveActivationService').completeInteractiveParticipant;
        const result = await finish(slug, { participant_id: p.id, game_session_token: p.game_session_token, summit_trace: own.trace },
          { client, allowIdentityRecovery: false, summitRace: { roomId: room.id, seed: room.seed, startsAt: room.starts_at } });
        delete result.credit_account;
        own.result = result;
        room.status = 'finished'; room.winner_id = p.id;
        await client.query("update qori_summit_rooms set status='finished',winner_id=$2 where id=$1", [room.id, p.id]);
        await client.query('update qori_summit_members set result=$2::jsonb where participant_id=$1', [p.id, JSON.stringify(result)]);
        await client.query('update customer_activation_participations set result=$2::jsonb where participant_id=$1', [p.id, JSON.stringify(result)]);
      } else if (members.every(m => m.state.done)) {
        room.status = 'finished';
        await client.query("update qori_summit_rooms set status='finished' where id=$1", [room.id]);
      }
    }
    if (['finished', 'expired'].includes(room.status)) {
      await client.query(`update interactive_activation_participants p set status='completed',completed_at=coalesce(p.completed_at,now()),
        game_session_completed_at=coalesce(p.game_session_completed_at,now()),score=(m.state->>'highest')::integer,
        metadata=p.metadata || jsonb_build_object('summit_mode','multiplayer','summit_room_id',$1::text,
          'summit_result',jsonb_build_object('won',false,'floor',(m.state->>'highest')::integer,'reason',$2::text))
        from qori_summit_members m where m.room_id=$1 and p.id=m.participant_id and p.status='started'`, [room.id, room.status === 'expired' ? 'expired' : 'race_lost']);
    }
    own.updated_at = new Date(now).toISOString();
    await client.query('update qori_summit_members set updated_at=now() where participant_id=$1', [p.id]);
    return { room: rules.snapshot(room, members, p.id, now) };
  });
}
module.exports = { act };

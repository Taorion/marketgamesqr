// This channel carries cosmetic poses only. Race completion, credits and prizes
// remain exclusively in summitRaceService's authenticated, replayed transaction.
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { env } = require('../config/env');
const PATH = '/api/public/summit-live';
const key = crypto.createHmac('sha256', env.jwtSecret).update('qori-summit-visual-v1').digest();
const audience = 'qori-summit-visual';
const confirmedRelays = new Set();
function notify(seed, impacts = []) {
  for (const relay of confirmedRelays) relay(seed, impacts);
}

function ticket(room) {
  if (room?.status !== 'racing' || !room.own) return null;
  const startsAt = new Date(room.starts_at).getTime();
  const exp = Math.ceil((startsAt + room.config.duration_seconds * 1000 + 15000) / 1000);
  return { path: PATH, token: jwt.sign({ sub: room.own.id, room: room.seed,
    startsAt, duration: room.config.duration_seconds, floors: room.config.floors, exp }, key,
  { algorithm: 'HS256', audience }), expires_at: new Date(exp * 1000).toISOString() };
}

function attach(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  const rooms = new Map();
  const relay = (seed, impacts) => {
    const peers = rooms.get(seed);
    if (!peers) return;
    for (const impact of impacts) for (const peer of peers.values()) if (peer.readyState === WebSocket.OPEN && peer.bufferedAmount < 16384) {
      peer.send(JSON.stringify({ type: 'impact', impact }));
    }
  };
  confirmedRelays.add(relay);
  function upgrade(req, socket, head) {
    if (req.url?.split('?')[0] !== PATH) return; // Another module owns this upgrade.
    let sameOrigin = false;
    try { sameOrigin = new URL(req.headers.origin).host === req.headers.host; } catch (_) {}
    if (req.url !== PATH || !sameOrigin || wss.clients.size >= 1024) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  }
  server.on('upgrade', upgrade);
  wss.on('connection', ws => {
    let claims, members, expiryTimer, lastTick = -1, count = 0, windowStart = Date.now();
    const authTimeout = setTimeout(() => ws.close(1008, 'Authentication required'), 5000);
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    ws.on('error', () => {});
    ws.on('message', (raw, binary) => {
      try {
        const now = Date.now();
        if (now - windowStart >= 1000) { count = 0; windowStart = now; }
        if (++count > 40 || binary) return ws.close(1008, 'Invalid stream');
        const data = JSON.parse(raw.toString());
        if (!claims) {
          if (data.type !== 'auth' || typeof data.token !== 'string') throw new Error('auth');
          claims = jwt.verify(data.token, key, { algorithms: ['HS256'], audience });
          if (!claims.sub || !claims.room || !Number.isFinite(claims.startsAt) || !Number.isFinite(claims.duration) || !Number.isFinite(claims.floors)) throw new Error('claims');
          members = rooms.get(claims.room) || new Map();
          if (!members.has(claims.sub) && members.size >= 8) throw new Error('full');
          members.get(claims.sub)?.close(1000, 'Reconnected');
          members.set(claims.sub, ws); rooms.set(claims.room, members);
          clearTimeout(authTimeout);
          expiryTimer = setTimeout(() => ws.close(1008, 'Race expired'), Math.max(0, claims.exp * 1000 - now));
          ws.send(JSON.stringify({ type: 'ready' })); return;
        }
        if (now >= claims.exp * 1000) return ws.close(1008, 'Race expired');
        if (data.type !== 'pose') return; // No result, winner or prize commands exist here.
        const p = data.pose;
        if (!p || !Number.isInteger(p.tick) || p.tick < 0 || p.tick > claims.duration * 60 ||
            p.tick > Math.max(0, Math.floor((now - claims.startsAt) * .06) + 6) ||
            !Number.isFinite(p.x) || p.x < 12 || p.x > 348 ||
            !Number.isFinite(p.y) || p.y < -100 || p.y > claims.floors * 88 + 600 ||
            ![1,-1].includes(p.face) || !Number.isInteger(p.lives) || p.lives < 0 || p.lives > 5) return;
        if (p.tick <= lastTick) return;
        lastTick = p.tick;
        const message = JSON.stringify({ type: 'pose', id: claims.sub, pose: {
          tick: p.tick, x: p.x, y: p.y, face: p.face, lives: p.lives,
          walking: p.walking === true, hammer: p.hammer === true,
          stunned: p.stunned === true,
        } });
        for (const peer of members.values()) if (peer !== ws && peer.readyState === WebSocket.OPEN && peer.bufferedAmount < 16384) peer.send(message);
      } catch (_) { ws.close(1008, 'Invalid session'); }
    });
    ws.on('close', () => {
      clearTimeout(authTimeout);
      clearTimeout(expiryTimer);
      if (members?.get(claims?.sub) === ws) members.delete(claims.sub);
      if (members?.size === 0 && rooms.get(claims.room) === members) rooms.delete(claims.room);
    });
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 15000);
  heartbeat.unref();
  return function stop() {
    confirmedRelays.delete(relay);
    clearInterval(heartbeat); server.off('upgrade', upgrade);
    for (const ws of wss.clients) ws.terminate();
    rooms.clear(); wss.close();
  };
}
module.exports = { ticket, attach, notify, PATH };

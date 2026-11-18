(function (root) {
  'use strict';
  function mount(host, options) {
    let game, timer, destroyed = false, busy = false, checked = false, room, ack = 0, offset = 0, delivered = false;
    host.innerHTML = `<section class="cumbre-lobby"><h3>¿Cómo quieres subir?</h3>
      <p>Juega a tu ritmo o compite con tu familia por el premio de la cima.</p>
      <div class="cumbre-mode-buttons"><button type="button" data-action="solo">Individual</button><button type="button" data-action="family">Multijugador · 2 a 8</button></div>
      <div class="cumbre-family" hidden><label>Tu apodo<input class="cumbre-alias" maxlength="24" autocomplete="off" placeholder="Ej. Dani"></label>
        <button type="button" data-action="create">Crear sala familiar</button>
        <label>Código de la sala<input class="cumbre-code-input" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="ABC234"></label>
        <button type="button" data-action="join">Unirme a la sala</button>
        <p>Todos escanean el mismo QR. Una persona crea la sala y comparte este código con su familia.</p></div>
      <div class="cumbre-room" hidden><p>SALA <strong class="cumbre-room-code"></strong></p><p class="cumbre-room-prize"></p>
        <ol class="cumbre-players"></ol><p class="cumbre-race-help">Todos deben estar listos. El primero en llegar gana el único premio.</p>
        <div class="cumbre-room-actions"><button type="button" data-action="ready">Estoy listo</button><button type="button" data-action="start">Iniciar carrera</button><button type="button" data-action="leave">Salir de la sala</button></div>
      </div><p class="cumbre-network" role="status" aria-live="polite"></p><button type="button" data-action="resume" hidden>Volver a conectar</button>
      </section><div class="cumbre-play-host"></div>`;
    const panel = host.querySelector('.cumbre-lobby'), playHost = host.querySelector('.cumbre-play-host');
    const message = host.querySelector('.cumbre-network'), roomPanel = host.querySelector('.cumbre-room');
    const buttons = name => host.querySelector(`[data-action="${name}"]`);
    const say = value => { message.textContent = value; };
    function schedule() { clearTimeout(timer); if (!destroyed && room && !['finished','expired'].includes(room.status)) timer = setTimeout(poll, room.status === 'racing' ? 500 : 1000); }
    function render(next) {
      if (destroyed) return;
      room = next;
      roomPanel.hidden = !room;
      host.querySelector('.cumbre-mode-buttons').hidden = Boolean(room);
      if (!room) { game?.destroy(); game = null; return; }
      host.querySelector('.cumbre-family').hidden = true;
      host.querySelector('.cumbre-room-code').textContent = room.code;
      host.querySelector('.cumbre-room-prize').textContent = `Premio: ${room.prize}`;
      const list = host.querySelector('.cumbre-players'); list.replaceChildren();
      room.members.forEach(m => {
        const li = document.createElement('li');
        li.textContent = `${m.alias}${m.id === room.own.id ? ' (tú)' : ''} · ${room.status === 'waiting' ? m.ready ? 'Listo' : 'Preparándose' : `Piso ${m.floor}/${room.config.floors}`}${m.connected ? '' : ' · Sin conexión'}`;
        list.append(li);
      });
      const own = room.members.find(m => m.id === room.own.id);
      buttons('ready').textContent = own.ready ? 'Ya no estoy listo' : 'Estoy listo';
      buttons('start').hidden = room.host_id !== room.own.id;
      buttons('start').disabled = room.members.length < 2 || room.members.some(m => !m.ready || !m.connected);
      host.querySelector('.cumbre-room-actions').hidden = room.status !== 'waiting';
      if (room.status === 'racing' && !game) {
        ack = room.own.state.tick;
        game = root.QoriSummit.mount(playHost, { config: room.config, seed: room.seed, prize: room.prize,
          initialState: room.own.state, race: { startsAt: new Date(room.starts_at).getTime(), now: () => Date.now() + offset },
          onFinish: () => { clearTimeout(timer); poll(); } });
      }
      game?.opponents(room.members.filter(m => m.id !== room.own.id));
      ack = room.own.state.tick;
      if (room.status === 'finished' || room.status === 'expired') {
        clearTimeout(timer);
        const winner = room.members.find(m => m.id === room.winner_id);
        const copy = winner ? (winner.id === room.own.id ? `¡Ganaste! ${room.prize}` : `${winner.alias} llegó primero y ganó ${room.prize}.`) : room.status === 'expired' ? 'La sala venció o la activación cambió. No se entregó un premio.' : 'Terminó la carrera. Nadie alcanzó el cofre.';
        say(copy); game?.finish(copy);
        host.querySelector('.cumbre-race-help').textContent = copy;
        if (room.own.result && !delivered) { delivered = true; Promise.resolve(options.onResult?.(room.own.result)).catch(e => { delivered = false; say(e.message); buttons('resume').hidden = false; }); }
      } else say(room.status === 'waiting' ? 'Esperando a la familia…' : 'Carrera en curso. El reloj sigue aunque se interrumpa la conexión.');
      schedule();
    }
    async function send(action, extra = {}) {
      if (destroyed || busy) return;
      busy = true;
      host.querySelectorAll('[data-action]').forEach(b => { if (b.dataset.action !== 'start') b.disabled = true; });
      const sent = Date.now();
      try {
        const result = await options.request({ action, ...extra });
        if (destroyed) return;
        checked = true;
        if (result.room) offset = new Date(result.room.server_now).getTime() - (sent + Date.now()) / 2;
        buttons('resume').hidden = true;
        render(result.room);
      } catch (error) {
        if (destroyed) return;
        say(`${error.message} Puedes volver a conectar sin cambiar de jugador.`);
        buttons('resume').hidden = false; schedule();
      } finally {
        busy = false;
        host.querySelectorAll('[data-action]').forEach(b => { if (b.dataset.action !== 'start') b.disabled = !checked && b.dataset.action !== 'resume'; });
      }
    }
    function poll() {
      const packet = room?.status === 'racing' && game?.packet(ack);
      if (packet?.runs.length) send('input', packet); else send('state');
    }
    function click(event) {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action || busy) return;
      if (action === 'solo') {
        clearTimeout(timer); panel.hidden = true;
        game = root.QoriSummit.mount(playHost, options.solo); return;
      }
      if (action === 'family') { host.querySelector('.cumbre-family').hidden = false; return; }
      if (action === 'create' || action === 'join') {
        const alias = host.querySelector('.cumbre-alias').value.trim(), code = host.querySelector('.cumbre-code-input').value.trim().toUpperCase();
        if (!alias) return say('Escribe tu apodo para que tu familia te reconozca.');
        if (action === 'join' && !/^[A-Z2-9]{6}$/.test(code)) return say('Escribe el código de seis caracteres de tu sala.');
        return send(action, { alias, ...(action === 'join' ? { code } : {}) });
      }
      if (action === 'ready') return send(action, { ready: !room.members.find(m => m.id === room.own.id).ready });
      if (action === 'resume') { game?.destroy(); game = null; }
      send(action);
    }
    host.addEventListener('click', click);
    send('resume');
    return { destroy() { destroyed = true; clearTimeout(timer); game?.destroy(); host.removeEventListener('click', click); } };
  }
  root.QoriSummitModes = { mount };
})(globalThis);

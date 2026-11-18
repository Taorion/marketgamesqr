(function (root) {
  "use strict";
  const core = root.QoriSummitCore;
  function mount(host, options = {}) {
    host.innerHTML = `<section class="cumbre-game" aria-label="Cumbre Qori">
      <div class="cumbre-prize"><span>EL PREMIO EN LA CIMA</span><strong class="cumbre-prize-label"></strong><small>Alcanza el cofre para desbloquearlo.</small></div>
      <div class="cumbre-hud"><span data-hud="floor">PISO 0</span><span data-hud="time"></span><span data-hud="lives"></span></div>
      <div class="cumbre-screen"><canvas width="360" height="480" tabindex="0" aria-label="Montaña de plataformas. Flechas para moverte, espacio para saltar y X para golpear."></canvas>
        <div class="cumbre-cover"><span class="cumbre-eyebrow">UNA CIMA. TU RECOMPENSA.</span><h2>CUMBRE<br><em>QORI</em></h2><p>Salta entre pisos, rompe el hielo<br>y alcanza el cofre dorado.</p><button type="button" class="cumbre-start">Empezar ascenso →</button><small>← → mover · Espacio saltar · X martillo</small></div>
      </div>
      <div class="cumbre-controls" aria-label="Controles del juego"><div><button type="button" data-bit="1" aria-label="Mover a la izquierda">◀</button><button type="button" data-bit="2" aria-label="Mover a la derecha">▶</button></div><div><button type="button" data-bit="8" aria-label="Usar martillo">✦<small>GOLPE</small></button><button type="button" data-bit="4" aria-label="Saltar">↑<small>SALTO</small></button></div></div>
      <div class="cumbre-foot"><span class="cumbre-charge">PODER <b>○ ○ ○</b></span><button type="button" class="cumbre-sound" aria-label="Activar sonido" aria-pressed="false">Sonido: apagado</button></div>
      <p class="cumbre-hint">Tres aciertos cargan un supersalto. Úsalo con salto + golpe.</p><p class="cumbre-status" role="status" aria-live="polite"></p>
    </section>`;
    const label = String(options.prize || "Premio de la cima");
    host.querySelector(".cumbre-prize-label").textContent = label;
    const canvas = host.querySelector("canvas"), ctx = canvas.getContext("2d"), cover = host.querySelector(".cumbre-cover");
    const status = host.querySelector(".cumbre-status"), removers = [], pressed = new Map();
    const s = options.initialState ? structuredClone(options.initialState) : core.create(options.config, options.seed), trace = [];
    const baseTick = s.tick, inputs = [];
    let opponents = [];
    const remoteTracks = new Map();
    let lastPoseTick = -3;
    let running = false, destroyed = false, raf = 0, last = 0, accumulator = 0, sound = false, audio;
    ctx.imageSmoothingEnabled = false;
    function on(target, name, callback, settings) { target.addEventListener(name, callback, settings); removers.push(() => target.removeEventListener(name, callback, settings)); }
    function tone(note, length = 0.08) {
      if (!sound) return;
      try {
        audio ||= new (root.AudioContext || root.webkitAudioContext)();
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.type = "square"; osc.frequency.value = note; gain.gain.setValueAtTime(0.025, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + length);
        osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + length);
      } catch (_) { sound = false; }
    }
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    function text(value, x, y, size, color = "#eefaff", align = "left") {
      ctx.font = `bold ${size}px monospace`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
    }
    // Only the drawing uses these poses. They never enter the simulation or replay.
    function remotePosition(other, now) {
      const track = remoteTracks.get(other.id);
      if (!track) return other;
      let target = other;
      const samples = track.samples, latest = samples.at(-1);
      if (latest && now - latest.at < 750) {
        const renderAt = now - 90;
        let a = samples[0], b = a;
        for (const sample of samples) {
          b = sample;
          if (sample.at >= renderAt) break;
          a = sample;
        }
        const blend = b.at > a.at ? Math.max(0, Math.min(1, (renderAt - a.at) / (b.at - a.at))) : 0;
        target = { ...b, x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend };
      } else if (latest && (other.tick ?? 0) < latest.tick) target = latest;
      const dt = Math.max(0, now - track.drawAt);
      const blend = 1 - Math.exp(-dt / (latest && now - latest.at < 750 ? 25 : 100));
      track.x += (target.x - track.x) * blend;
      track.y += (target.y - track.y) * blend;
      track.drawAt = now;
      return { ...target, x: track.x, y: track.y };
    }
    function draw() {
      const cam = Math.round(s.camera), t = s.tick, p = s.player;
      const sky = ctx.createLinearGradient(0, 0, 0, 480); sky.addColorStop(0, "#07152d"); sky.addColorStop(1, "#264c66"); ctx.fillStyle = sky; ctx.fillRect(0, 0, 360, 480);
      for (let i = 0; i < 39; i++) rect((i * 83 + 23) % 360, (i * 47 + Math.round(cam * .12)) % 400, i % 4 ? 1 : 2, 2, i % 3 ? "#b4d9e9" : "#e9c87d");
      rect(278, 37, 29, 29, "#f7e4a6"); rect(271, 32, 25, 24, "#0c1c34");
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 5; i++) {
        const x = i * 110 - 50 + layer * 42, y = 220 + layer * 95 + (cam * .08 % 40);
        ctx.fillStyle = layer ? "#23435a" : "#182f47"; ctx.beginPath(); ctx.moveTo(x - 80, 480); ctx.lineTo(x + 35, y); ctx.lineTo(x + 150, 480); ctx.fill();
        ctx.fillStyle = layer ? "#486a7b" : "#355066"; ctx.beginPath(); ctx.moveTo(x + 12, y + 53); ctx.lineTo(x + 35, y); ctx.lineTo(x + 59, y + 53); ctx.lineTo(x + 34, y + 39); ctx.fill();
      }
      for (const floor of s.platforms) {
        const y = floor.y - cam, x = core.platformX(floor, t);
        if (y < -30 || y > 510 || t < floor.brokenUntil) continue;
        const cracked = floor.fragile && floor.touched >= 0;
        rect(x + 4, y + 7, floor.w - 8, 13, "#19384e");
        rect(x, y, floor.w, 7, cracked ? "#f5b57d" : "#b8e8e8");
        rect(x, y + 7, floor.w, 5, floor.moving ? "#668cc2" : "#528f9e");
        for (let n = 8; n < floor.w - 7; n += 22) { rect(x + n, y + 12, 2, 7, "#326174"); if (floor.fragile) rect(x + n + 6, y + 1, 2, 4, "#497e8c"); }
        if (floor.i) text(String(floor.i).padStart(2, "0"), x + 5, y + 28, 9, "#8caebf");
      }
      for (const block of s.blocks) if (block.alive) {
        const y = s.platforms[block.floor].y - cam;
        rect(block.x - 12, y - 25, 24, 25, "#84ced9"); rect(block.x - 9, y - 22, 17, 3, "#e8ffff"); rect(block.x, y - 19, 3, 13, "#4d99b2");
      }
      for (const e of s.enemies) if (e.alive) {
        const y = s.platforms[e.floor].y - cam, bob = Math.floor(t / 9) % 2;
        rect(e.x - 11, y - 19, 22, 14, "#d97883"); rect(e.x - 8, y - 23, 16, 6, "#ed9d9e");
        rect(e.x - 8, y - 17, 5, 5, "#fff3da"); rect(e.x + 3, y - 17, 5, 5, "#fff3da");
        rect(e.x - 6 + e.dir, y - 15, 2, 3, "#2a253d"); rect(e.x + 5 + e.dir, y - 15, 2, 3, "#2a253d");
        rect(e.x - 10, y - 5, 6, 5 - bob, "#58354f"); rect(e.x + 4, y - 5, 6, 4 + bob, "#58354f");
      }
      const summitY = s.platforms[s.cfg.floors].y - cam;
      rect(158, summitY - 30, 44, 29, "#9b6229"); rect(158, summitY - 30, 44, 7, "#ffd77c"); rect(158, summitY - 23, 4, 23, "#e2aa4c"); rect(198, summitY - 23, 4, 23, "#e2aa4c"); rect(177, summitY - 19, 7, 9, "#fff1b5");
      rect(242, summitY - 68, 3, 68, "#ceebea"); rect(245, summitY - 66, 28, 18, "#e7be62"); text("Q", 258, summitY - 52, 13, "#1c3346", "center");
      if (summitY > -20 && summitY < 470) {
        text("TU PREMIO", 180, summitY - 59, 11, "#ffdc86", "center");
        text(label.length > 30 ? label.slice(0, 28) + "…" : label, 180, summitY - 43, 10, "#fff5d8", "center");
      }
      if (!(t < s.hitUntil && Math.floor(t / 6) % 2)) {
        const x = Math.round(p.x), y = Math.round(p.y - cam), walk = p.ground >= 0 && s.previous & 3 ? Math.floor(t / 6) % 2 * 3 : 0;
        rect(x - 9, y - 24, 18, 17, "#e6a64f"); rect(x - p.face * 10 - 4, y - 22, 8, 14, "#825b4b");
        rect(x - 8, y - 37, 16, 15, "#f8c99a"); rect(x - 11, y - 40, 22, 9, "#45c6c1"); rect(x - 13, y - 33, 26, 4, "#8aeece");
        rect(x - 6 + p.face * 3, y - 29, 10, 5, "#213953"); rect(x - 4 + p.face * 3, y - 29, 3, 2, "#b5ffff");
        rect(x - 8, y - 7, 6, 7 - walk, "#1b273f"); rect(x + 2, y - 7, 6, 4 + walk, "#1b273f");
        const hammerX = x + p.face * (t < s.hammerUntil ? 25 : 13);
        rect(hammerX - 2, y - 28, 4, 17, "#ac7854"); rect(hammerX - 8, y - 31, 16, 7, "#d3e6ed");
        if (t < s.hammerUntil) text("✦", hammerX + p.face * 13, y - 22, 15, "#fff0a4", "center");
      }
      opponents.forEach((other, i) => {
        const pose = remotePosition(other, performance.now());
        const x = pose.x, y = pose.y - cam, face = pose.face || 1, color = ['#d49ef5','#ed91a2','#9ee394','#86bdfa'][i % 4];
        if (y < -30 || y > 510) return;
        const walk = pose.walking ? Math.floor((pose.tick || t) / 6) % 2 * 3 : 0;
        ctx.globalAlpha = .85;
        rect(x - 9, y - 24, 18, 17, color); rect(x - face * 10 - 4, y - 22, 8, 14, '#695173');
        rect(x - 8, y - 37, 16, 15, '#f8c99a'); rect(x - 11, y - 40, 22, 9, color);
        rect(x - 13, y - 33, 26, 4, '#eefaff'); rect(x - 6 + face * 3, y - 29, 10, 5, '#213953');
        rect(x - 8, y - 7, 6, 7 - walk, '#1b273f'); rect(x + 2, y - 7, 6, 4 + walk, '#1b273f');
        const hammerX = x + face * (pose.hammer ? 25 : 13);
        rect(hammerX - 2, y - 28, 4, 17, '#ac7854'); rect(hammerX - 8, y - 31, 16, 7, '#d3e6ed');
        ctx.globalAlpha = 1; text(String(other.alias).slice(0, 12), x, y - 46, 9, color, 'center');
      });
      for (let i = 0; i < 20; i++) rect((i * 67 + t * .32) % 360, (i * 41 + t * .56) % 480, 2, 2, "#b9d9e4");
      for (let y = 0; y < 480; y += 4) rect(0, y, 360, 1, "rgba(0,0,0,.06)");
      host.querySelector('[data-hud="floor"]').textContent = `PISO ${s.highest}/${s.cfg.floors}`;
      host.querySelector('[data-hud="time"]').textContent = `${Math.ceil(s.cfg.duration_seconds - s.tick / 60)} s`;
      host.querySelector('[data-hud="lives"]').textContent = "♥ ".repeat(s.lives).trim() || "0 ♥";
      host.querySelector(".cumbre-charge b").textContent = "● ".repeat(s.charge) + "○ ".repeat(3 - s.charge);
    }
    function end() {
      running = false; pressed.clear();
      tone(s.won ? 880 : 165, .3);
      cover.hidden = false; cover.innerHTML = "";
      const title = document.createElement("h2"), copy = document.createElement("p");
      title.textContent = s.won ? "¡CIMA ALCANZADA!" : s.reason === "timeout" ? "TIEMPO AGOTADO" : "FIN DEL ASCENSO";
      copy.textContent = options.race ? (s.won ? 'Confirmando quién llegó primero…' : 'Tu ascenso terminó. Espera el resultado de la familia.') : s.won ? label : `Llegaste al piso ${s.highest}. El premio se desbloquea al alcanzar el cofre.`;
      cover.append(title, copy);
      status.textContent = s.won ? "Cima alcanzada. Comprobando el premio…" : "Partida terminada sin premio.";
      options.onFinish?.({ won: s.won, floor: s.highest, trace, duration_ms: Math.round(s.tick * 1000 / 60), reason: s.reason });
    }
    function frame(now) {
      if (destroyed || !running) return;
      let catchup = false;
      if (options.race) {
        const elapsed = options.race.now() - options.race.startsAt;
        if (elapsed < 0) {
          cover.hidden = false; cover.textContent = `¡Prepárate! ${Math.ceil(-elapsed / 1000)}`;
          raf = requestAnimationFrame(frame); return;
        }
        cover.hidden = true;
        const pending = Math.max(0, Math.floor(elapsed * 60 / 1000) - s.tick);
        catchup = pending > 15 || document.hidden;
        accumulator = Math.min(pending, 600) * (1000 / 60) + .001;
      } else {
        if (document.hidden) { last = now; raf = requestAnimationFrame(frame); return; }
        accumulator += Math.min(100, now - last);
      }
      last = now;
      while (accumulator >= 1000 / 60 && !s.done) {
        let mask = 0; for (const bit of pressed.values()) mask |= bit;
        if (catchup) mask = 0;
        const previousY = s.player.vy, breaks = s.breaks, lives = s.lives;
        core.step(s, mask);
        inputs.push(mask);
        const tail = trace[trace.length - 1]; if (tail && tail[0] === mask) tail[1]++; else trace.push([mask, 1]);
        if (previousY >= 0 && s.player.vy < 0) tone(440);
        if (s.breaks > breaks) tone(660);
        if (s.lives < lives) {
          tone(110, .18);
          if (!s.done) status.textContent = 'Perdiste una vida. Vuelves a la última plataforma estable.';
        }
        accumulator -= 1000 / 60;
      }
      draw();
      if (options.race && (s.tick - lastPoseTick >= 3 || s.done)) {
        lastPoseTick = s.tick;
        options.onPose?.({ tick: s.tick, x: s.player.x, y: s.player.y, face: s.player.face, lives: s.lives,
          walking: s.player.ground >= 0 && Boolean(s.previous & 3), hammer: s.tick < s.hammerUntil });
      }
      if (s.done) end(); else raf = requestAnimationFrame(frame);
    }
    on(host.querySelector(".cumbre-start"), "click", () => {
      cover.hidden = true; running = true; last = performance.now(); canvas.focus({ preventScroll: true });
      status.textContent = "Ascenso iniciado. Llega al cofre de la cima."; raf = requestAnimationFrame(frame);
    });
    const keyBits = { ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, Space: 4, ArrowUp: 4, KeyW: 4, KeyX: 8, KeyJ: 8 };
    on(window, "keydown", e => { if (!running || !keyBits[e.code] || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; e.preventDefault(); pressed.set(e.code, keyBits[e.code]); });
    on(window, "keyup", e => pressed.delete(e.code));
    on(window, "blur", () => pressed.clear()); on(document, "visibilitychange", () => { pressed.clear(); last = performance.now(); });
    host.querySelectorAll("[data-bit]").forEach(button => {
      on(button, "pointerdown", e => { e.preventDefault(); if (!running) return; button.setPointerCapture(e.pointerId); pressed.set(e.pointerId, Number(button.dataset.bit)); button.classList.add("pressed"); });
      const release = e => { pressed.delete(e.pointerId); button.classList.remove("pressed"); };
      on(button, "pointerup", release); on(button, "pointercancel", release); on(button, "lostpointercapture", release);
    });
    on(host.querySelector(".cumbre-sound"), "click", e => { sound = !sound; e.currentTarget.textContent = `Sonido: ${sound ? "activado" : "apagado"}`; e.currentTarget.setAttribute("aria-pressed", String(sound)); e.currentTarget.setAttribute("aria-label", sound ? "Desactivar sonido" : "Activar sonido"); tone(660); });
    draw();
    if (options.race) {
      running = true; last = performance.now(); raf = requestAnimationFrame(frame);
      host.querySelector('.cumbre-prize small').textContent = 'Un solo premio: gana quien llegue primero.';
    }
    return {
      packet(from) {
        if (from < baseTick || from > s.tick) return null;
        const runs = [];
        for (const mask of inputs.slice(from - baseTick, from - baseTick + 600)) {
          const tail = runs.at(-1); if (tail?.[0] === mask) tail[1]++; else runs.push([mask, 1]);
        }
        return { from, runs };
      },
      opponents(list) {
        opponents = list;
        for (const other of list) if (!remoteTracks.has(other.id)) remoteTracks.set(other.id, { samples: [], x: other.x, y: other.y, drawAt: performance.now() });
        for (const id of remoteTracks.keys()) if (!list.some(other => other.id === id)) remoteTracks.delete(id);
        if (!running) draw();
      },
      remotePose(id, pose) {
        const track = remoteTracks.get(id);
        if (!track || !Number.isFinite(pose?.x) || !Number.isFinite(pose?.y) || !Number.isInteger(pose?.tick)) return;
        const previous = track.samples.at(-1);
        if (previous && pose.tick <= previous.tick) return;
        if (previous && (pose.lives !== previous.lives || Math.hypot(pose.x - previous.x, pose.y - previous.y) > 160)) {
          track.samples.length = 0; track.x = pose.x; track.y = pose.y;
        }
        track.samples.push({ ...pose, at: performance.now() });
        if (track.samples.length > 16) track.samples.shift();
        if (!running) draw();
      },
      finish(message) { running = false; pressed.clear(); cancelAnimationFrame(raf); cover.hidden = false; cover.textContent = message; status.textContent = message; },
      destroy() { destroyed = true; cancelAnimationFrame(raf); pressed.clear(); removers.forEach(fn => fn()); audio?.close(); }
    };
  }
  root.QoriSummit = { mount };
})(globalThis);

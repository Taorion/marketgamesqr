(function (root) {
  'use strict';
  // Original 16-bar chiptune: pulse lead, triangle bass, arpeggios and tiny drums.
  // Generated locally; no audio downloads or third-party soundtrack are needed.
  const STEP = 60 / 144 / 2;
  const melody = [
    [72,76,79,0,81,79,76,74], [71,74,79,74,83,81,79,0],
    [72,76,81,83,84,83,81,76], [77,81,84,81,79,77,76,0],
    [76,79,84,0,83,79,76,74], [74,79,83,81,79,74,71,0],
    [72,77,81,79,77,76,74,72], [71,74,79,0,74,71,67,0],
    [81,0,84,83,81,76,79,81], [79,0,83,81,79,76,74,76],
    [77,81,84,86,84,81,79,77], [79,83,86,84,83,79,77,74],
    [76,79,84,79,81,79,76,72], [77,81,84,81,79,77,76,74],
    [74,79,83,86,84,83,79,74], [76,79,84,0,79,76,72,0],
  ];
  const chords = [[48,4],[43,4],[45,3],[41,4],[48,4],[43,4],[41,4],[43,4],
    [45,3],[40,3],[41,4],[43,4],[48,4],[41,4],[43,4],[48,4]];
  const frequency = note => 440 * 2 ** ((note - 69) / 12);
  function create({ onChange = () => {} } = {}) {
    const Context = root.AudioContext || root.webkitAudioContext;
    let enabled = true, playing = false, visible = !root.document?.hidden, destroyed = false;
    let context, musicBus, noise, timer, nextTime = 0, step = 0, resuming, lastReport;
    const musicVoices = new Set(), effects = new Set();
    try { enabled = root.localStorage.getItem('qori-summit-sound') !== 'off'; } catch (_) {}
    const report = () => {
      const state = { available: Boolean(Context), enabled, unlocked: context?.state === 'running' };
      const key = JSON.stringify(state);
      if (key !== lastReport) { lastReport = key; onChange(state); }
    };
    function stopVoices(voices) {
      for (const voice of voices) { try { voice.source.stop(); } catch (_) {} voice.source.disconnect(); voice.gain.disconnect(); }
      voices.clear();
    }
    function stopMusic() { root.clearInterval(timer); timer = null; stopVoices(musicVoices); }
    function voice(source, at, duration, volume, bus, collection) {
      const gain = context.createGain(), item = { source, gain };
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.linearRampToValueAtTime(volume, at + .005);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(gain); gain.connect(bus); collection.add(item);
      source.onended = () => { collection.delete(item); source.disconnect(); gain.disconnect(); };
      source.start(at); source.stop(at + duration + .01);
    }
    function note(midi, type, at, duration, volume) {
      const source = context.createOscillator(); source.type = type;
      source.frequency.setValueAtTime(frequency(midi), at);
      voice(source, at, duration, volume, musicBus, musicVoices);
    }
    function drum(at, snare) {
      const source = context.createBufferSource(); source.buffer = noise;
      voice(source, at, snare ? .09 : .025, snare ? .085 : .025, musicBus, musicVoices);
    }
    function scheduleBeat(index, at) {
      const bar = Math.floor(index / 8) % melody.length, beat = index % 8, [bass, third] = chords[bar];
      const lead = melody[bar][beat];
      if (lead) note(lead, 'square', at, STEP * .78, .18);
      if (beat % 2 === 0) {
        note(bass + (beat === 4 ? 7 : 0), 'triangle', at, STEP * 1.55, .22);
        const kick = context.createOscillator(); kick.type = 'triangle';
        kick.frequency.setValueAtTime(130, at); kick.frequency.exponentialRampToValueAtTime(45, at + .09);
        voice(kick, at, .11, .18, musicBus, musicVoices);
      }
      const arp = [0, third, 7, third];
      note(bass + 24 + arp[beat % 4], 'triangle', at + STEP / 2, STEP * .38, .055);
      drum(at, beat === 2 || beat === 6);
    }
    function pump() {
      if (destroyed || !enabled || !playing || !visible || context?.state !== 'running') { sync(); return; }
      // A suspended tab or busy frame must not replay a burst of overdue notes.
      if (nextTime < context.currentTime - .1) nextTime = context.currentTime + .025;
      while (nextTime < context.currentTime + .12) {
        scheduleBeat(step, nextTime); step = (step + 1) % 128; nextTime += STEP;
      }
    }
    function sync() {
      if (!destroyed && enabled && playing && visible && context?.state === 'running') {
        if (timer == null) { nextTime = context.currentTime + .035; pump(); timer = root.setInterval(pump, 50); }
      } else {
        stopMusic();
        if (!enabled || !visible || destroyed) stopVoices(effects);
      }
      report();
    }
    function unlock() {
      if (destroyed || !enabled || !Context) return Promise.resolve(false);
      try {
        if (!context) {
          context = new Context(); musicBus = context.createGain(); musicBus.gain.value = .2;
          const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 4200;
          musicBus.connect(filter); filter.connect(context.destination);
          noise = context.createBuffer(1, Math.ceil(context.sampleRate * .12), context.sampleRate);
          const samples = noise.getChannelData(0); let seed = 17;
          for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
          context.onstatechange = sync;
        }
        if (context.state === 'running') { sync(); return Promise.resolve(true); }
        if (!resuming) resuming = Promise.resolve(context.resume()).then(() => { sync(); return context.state === 'running'; }, () => { report(); return false; }).finally(() => { resuming = null; });
        return resuming;
      } catch (_) { report(); return Promise.resolve(false); }
    }
    report();
    return {
      unlock,
      setEnabled(value) {
        enabled = Boolean(value);
        try { root.localStorage.setItem('qori-summit-sound', enabled ? 'on' : 'off'); } catch (_) {}
        sync(); if (enabled) return unlock(); return Promise.resolve(false);
      },
      toggle() { return this.setEnabled(!enabled || context?.state !== 'running'); },
      setPlaying(value) { playing = Boolean(value); sync(); },
      setVisible(value) { visible = Boolean(value); sync(); },
      effect(hz, duration = .08) {
        if (destroyed || !enabled || !visible || context?.state !== 'running') return;
        const source = context.createOscillator(); source.type = 'square'; source.frequency.setValueAtTime(hz, context.currentTime);
        voice(source, context.currentTime, duration, .04, context.destination, effects);
      },
      destroy() {
        destroyed = true; stopMusic(); stopVoices(effects);
        if (context) { context.onstatechange = null; Promise.resolve(context.close()).catch(() => {}); }
      },
    };
  }
  root.QoriSummitAudio = { create };
})(globalThis);

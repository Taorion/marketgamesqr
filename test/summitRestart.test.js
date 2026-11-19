const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('activacion/activation.js', 'utf8');
const sessionSource = source.slice(source.indexOf('async function restartSummitSession()'), source.indexOf('function renderExperience()'));
const mountSource = source.slice(source.indexOf('function renderMinigame()'), source.indexOf('  const config = currentActivation.game_config || {};', source.indexOf('function renderMinigame()'))) + '}';
const cleanupSource = source.slice(source.indexOf('function cleanupGameState()'), source.indexOf('function finishGame('));
const resultSource = source.slice(source.indexOf('async function renderResult('), source.indexOf('function rewardQrFilename()'));

function setup(collects = false) {
  const dom = new JSDOM('<form id="form" class="hidden"><input value="Ana"><button type="submit">Continuar</button></form><section id="stage"><div id="body"></div></section><div id="ticket">Premio anterior</div>', { url: 'https://example.invalid/activacion/family', runScripts: 'outside-only' });
  const w = dom.window, mounts = [], calls = [], key = 'qori-summit:/activacion/family';
  w.HTMLElement.prototype.scrollIntoView = function () {};
  Object.assign(w, {
    participantForm: w.document.getElementById('form'), experienceStage: w.document.getElementById('stage'),
    experienceBody: w.document.getElementById('body'), ticketResult: w.document.getElementById('ticket'),
    experienceTitle: {}, experienceCopy: {}, gameState: null,
    participant: { id: 'old-player' }, gameSessionToken: 'old-token',
    currentActivation: { activation_type: 'QORI_SUMMIT', public_slug: 'family', game_config: {}, reward_config: {} },
    activationCollectsParticipantData: () => collects, participantPayload: () => ({ name: 'Ana' }),
    setProgress() {}, setStatus(message) { w.statusMessage = message; },
    api: async (url, options) => {
      const body = JSON.parse(options.body); calls.push({ url, body, signal: options.signal });
      if (url.endsWith('/participants')) return { participant: { id: 'new-player' }, game_session_token: 'new-token' };
      return { room: { status: 'finished', own: { result: null } } };
    },
    QoriSummitModes: { mount(host, options) { const mounted = { options, destroyed: false, destroy() { this.destroyed = true; } }; mounts.push(mounted); return mounted; } },
  });
  w.sessionStorage.setItem(key, JSON.stringify({ participant_id: 'old-player', game_session_token: 'old-token' }));
  w.eval(sessionSource + mountSource + cleanupSource);
  w.renderMinigame();
  return { w, calls, mounts, key, close: () => w.close() };
}

test('restart without registration creates a fresh participant, stores its token and destroys the previous controller', async () => {
  const e = setup();
  try {
    await e.mounts[0].options.onRestart();
    assert.equal(e.calls.length, 1); assert.ok(e.calls[0].url.endsWith('/participants'));
    assert.equal(e.mounts[0].destroyed, true); assert.equal(e.mounts.length, 2);
    assert.deepEqual(JSON.parse(e.w.sessionStorage.getItem(e.key)), { participant_id: 'new-player', game_session_token: 'new-token' });
    await e.mounts[1].options.request({ action: 'create' });
    assert.equal(e.calls.at(-1).body.participant_id, 'new-player');
    assert.equal(e.calls.at(-1).body.game_session_token, 'new-token');
  } finally { e.close(); }
});

test('restart with registration returns to editable data and does not bypass participation rules', async () => {
  const e = setup(true);
  try {
    await e.mounts[0].options.onRestart();
    assert.equal(e.calls.length, 0); assert.equal(e.mounts[0].destroyed, true);
    assert.equal(e.w.sessionStorage.getItem(e.key), null); assert.equal(e.w.participant, null);
    assert.equal(e.w.participantForm.classList.contains('hidden'), false);
    assert.equal(e.w.experienceStage.classList.contains('hidden'), true);
    assert.equal(e.w.document.activeElement.tagName, 'INPUT');
    assert.equal(e.w.ticketResult.textContent, 'Premio anterior');
    e.w.api = async () => { throw new Error('Esta persona ya alcanzó el límite de intentos.'); };
    await e.w.startGameSession();
    assert.match(e.w.statusMessage, /límite de intentos/); assert.equal(e.mounts.length, 1);
    assert.equal(e.w.participantForm.querySelector('button').disabled, false);
  } finally { e.close(); }
});

test('failure creating the next session keeps the completed room available for another restart', async () => {
  const e = setup();
  try {
    e.w.api = async () => { throw new Error('Sin conexión'); };
    await e.mounts[0].options.onRestart();
    assert.equal(e.mounts[0].destroyed, false); assert.equal(e.mounts.length, 1);
    assert.equal(e.w.participant.id, 'old-player'); assert.match(e.w.statusMessage, /Sin conexión/);
    assert.equal(e.w.ticketResult.classList.contains('hidden'), false);
  } finally { e.close(); }
});

test('a delayed reward render from the previous room cannot overwrite the next session', async () => {
  const e = setup(); let release;
  try {
    e.w.benefitFulfillmentFromResult = () => ({ mode: 'PHYSICAL_QR' });
    e.w.ticketImageDataUrlForBrowser = () => new Promise(resolve => { release = resolve; });
    e.w.eval(resultSource);
    const result = e.mounts[0].options.onResult({ rewarded: true });
    await e.mounts[0].options.onRestart();
    e.w.ticketResult.textContent = 'Nueva partida';
    release('data:image/png;base64,example'); await result;
    assert.equal(e.w.ticketResult.textContent, 'Nueva partida');
    assert.equal(e.w.ticketResult.classList.contains('hidden'), true);
  } finally { e.close(); }
});

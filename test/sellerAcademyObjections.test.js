const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { nodes, starts } = require('../seller/academy-objections');
const script = fs.readFileSync('seller/academy-objections.js', 'utf8');
function setup() {
  const w = new JSDOM('<main class="seller-resources"></main>', { url: 'https://gosqori.com/seller/', runScripts: 'outside-only' }).window;
  w.eval(script);
  const host = w.document.querySelector('main');
  w.QoriAcademyObjections.mount(host);
  const click = selector => { assert.ok(host.querySelector(selector), selector); host.querySelector(selector).click(); };
  click('[data-toggle]');
  return { w, host, click };
}
test('every branch resolves, every node is reachable, and each objection can reach an outcome', () => {
  const reachable = new Set();
  function visit(id) { if (reachable.has(id)) return; assert.ok(nodes[id], id); reachable.add(id); nodes[id].choices.forEach(c => visit(c.next)); }
  starts.forEach(visit);
  assert.equal(reachable.size, Object.keys(nodes).length);
  for (const [id, node] of Object.entries(nodes)) {
    assert.match(node.question, /¿.+\?/);
    if (!node.choices.length) { assert.ok(node.action); continue; }
    assert.ok(node.choices.length >= 2);
    const seen = new Set(), queue = [id]; let hasEnd = false;
    while (queue.length) { const next = queue.shift(); if (seen.has(next)) continue; seen.add(next); if (nodes[next].action) hasEnd = true; nodes[next].choices.forEach(c => queue.push(c.next)); }
    assert.ok(hasEnd, `${id} has no reachable outcome`);
  }
});
test('all initial objections open a question and matching response buttons', () => {
  const s = setup();
  try {
    for (const id of starts) {
      s.click(`[data-start="${id}"]`);
      assert.equal(s.host.querySelector('blockquote').textContent, nodes[id].question);
      assert.equal(s.host.querySelectorAll('[data-choice]').length, nodes[id].choices.length);
      assert.equal(s.w.document.activeElement, s.host.querySelector('[data-focus]'));
      s.click('[data-reset]');
    }
  } finally { s.w.close(); }
});
test('history can rewind and replace branches without retaining the discarded route', () => {
  const s = setup();
  try {
    s.click('[data-start="price"]'); s.click('[data-choice="0"]'); s.click('[data-choice="0"]');
    assert.equal(s.host.querySelectorAll('[data-step]').length, 2);
    s.click('[data-step="0"]'); s.click('[data-choice="2"]');
    assert.equal(s.host.querySelector('[data-focus]').textContent, nodes.compare.title);
    assert.equal(s.host.querySelectorAll('[data-step]').length, 1);
    assert.doesNotMatch(s.host.querySelector('.qo-history').textContent, /No tengo presupuesto/);
    s.click('[data-back]'); assert.equal(s.host.querySelector('[data-focus]').textContent, nodes.price.title);
    s.click('[data-back]'); assert.equal(s.host.querySelectorAll('[data-start]').length, starts.length);
  } finally { s.w.close(); }
});
test('respectful closure, restart and collapse preserve expected navigation', () => {
  const s = setup();
  try {
    s.click('[data-start="interest"]'); s.click('[data-choice="2"]');
    assert.equal(s.host.querySelectorAll('[data-choice]').length, 0);
    assert.match(s.host.textContent, /Cerrar con respeto/);
    s.click('[data-toggle]'); assert.equal(s.host.querySelector('#qo-workspace').hidden, true);
    s.click('[data-toggle]'); assert.equal(s.host.querySelector('[data-focus]').textContent, nodes.respect_no.title);
    s.click('[data-reset-end]'); assert.equal(s.host.querySelectorAll('[data-start]').length, 10);
  } finally { s.w.close(); }
});
test('all graph transitions can be followed in the DOM, including shared paths and loops', () => {
  const routes = new Map(starts.map(id => [id, [id]])); const queue = [...starts];
  while (queue.length) { const id = queue.shift(); for (const c of nodes[id].choices) if (!routes.has(c.next)) { routes.set(c.next, [...routes.get(id), c.next]); queue.push(c.next); } }
  const s = setup();
  try {
    for (const [id, route] of routes) for (let index = 0; index < nodes[id].choices.length; index++) {
      s.click('[data-reset]'); s.click(`[data-start="${route[0]}"]`);
      for (let i = 1; i < route.length; i++) s.click(`[data-choice="${nodes[route[i - 1]].choices.findIndex(c => c.next === route[i])}"]`);
      s.click(`[data-choice="${index}"]`);
      assert.equal(s.host.querySelector('[data-focus]').textContent, nodes[nodes[id].choices[index].next].title);
    }
  } finally { s.w.close(); }
});
test('Academy mounts activity only after successful enabled catalog and Seller loads scripts in order', async () => {
  const s = setup();
  try {
    s.w.eval(fs.readFileSync('seller/academy.js', 'utf8'));
    for (const enabled of [false, true]) {
      await s.w.QoriAcademy.render(s.host, { isCurrent: () => true, request: async () => ({ enabled, resources: [] }) });
      assert.equal(!!s.host.querySelector('.qo-activity'), enabled);
    }
    await s.w.QoriAcademy.render(s.host, { isCurrent: () => true, request: async () => { throw Error('Acceso denegado'); } });
    assert.equal(s.host.querySelector('.qo-activity'), null);
    const html = fs.readFileSync('seller/index.html', 'utf8');
    assert.ok(html.indexOf('/seller/academy-objections.js') < html.indexOf('/seller/academy.js'));
    assert.ok(html.includes('/seller/academy-objections.css'));
  } finally { s.w.close(); }
});
